import { Inject, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { eq, and } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { DATABASE } from '../../../config/database.module';
import { DB_POOL } from '../../../config/database.module';
import { adminUsers } from '../../../database/schema';
import { companies } from '../../../database/schema';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  companyId: string;
}

interface SocialProfile {
  provider: 'google' | 'facebook' | 'apple';
  providerId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE) private readonly db: any,
    @Inject(DB_POOL) private readonly pool: any,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const [user] = await this.db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1);

    if (!user || !user.active) {
      return null;
    }

    if (!user.password_hash) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return null;
    }

    await this.db
      .update(adminUsers)
      .set({ last_login_at: new Date(), updated_at: new Date() })
      .where(eq(adminUsers.id, user.id));

    const { password_hash, ...result } = user;
    return result;
  }

  async validateSocialUser(profile: SocialProfile) {
    const [existingByProvider] = await this.db
      .select()
      .from(adminUsers)
      .where(
        and(
          eq(adminUsers.auth_provider, profile.provider),
          eq(adminUsers.auth_provider_id, profile.providerId),
        ),
      )
      .limit(1);

    if (existingByProvider) {
      if (!existingByProvider.active) return null;
      await this.db
        .update(adminUsers)
        .set({
          last_login_at: new Date(),
          updated_at: new Date(),
          avatar_url: profile.avatarUrl ?? existingByProvider.avatar_url,
        })
        .where(eq(adminUsers.id, existingByProvider.id));

      const { password_hash, ...result } = existingByProvider;
      return result;
    }

    const [existingByEmail] = await this.db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, profile.email))
      .limit(1);

    if (existingByEmail) {
      if (!existingByEmail.active) return null;
      await this.db
        .update(adminUsers)
        .set({
          auth_provider: profile.provider,
          auth_provider_id: profile.providerId,
          avatar_url: profile.avatarUrl ?? existingByEmail.avatar_url,
          last_login_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(adminUsers.id, existingByEmail.id));

      const { password_hash, ...result } = existingByEmail;
      return result;
    }

    const [defaultCompany] = await this.db
      .select()
      .from(companies)
      .where(eq(companies.slug, 'chatbox-demo'))
      .limit(1);

    if (!defaultCompany) return null;

    const [newUser] = await this.db
      .insert(adminUsers)
      .values({
        company_id: defaultCompany.id,
        email: profile.email,
        name: profile.name,
        auth_provider: profile.provider,
        auth_provider_id: profile.providerId,
        avatar_url: profile.avatarUrl,
        role: 'admin',
        active: true,
      })
      .returning();

    // Also create the RBAC role entry
    await this.pool.query(
      `INSERT INTO user_company_roles (user_id, company_id, role, active) VALUES ($1, $2, $3, true) ON CONFLICT DO NOTHING`,
      [newUser.id, defaultCompany.id, 'admin'],
    );

    const { password_hash, ...result } = newUser;
    return result;
  }

  async login(user: any) {
    // Get the user's role for their primary company from user_company_roles
    const effectiveRole = await this.getEffectiveRole(user.id, user.company_id);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: effectiveRole ?? user.role,
      companyId: user.company_id,
    };

    // Get all companies this user has access to
    const userCompanies = await this.getUserCompanies(user.id);

    return {
      accessToken: this.jwtService.sign({ ...payload }),
      refreshToken: this.jwtService.sign({ ...payload }, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh-changeme'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d') as any,
      }),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: effectiveRole ?? user.role,
        companyId: user.company_id,
        avatarUrl: user.avatar_url,
        companies: userCompanies,
      },
    };
  }

  /** Switch company context - returns new tokens scoped to a different company */
  async switchCompany(userId: string, targetCompanyId: string) {
    // Verify user has access to the target company
    const effectiveRole = await this.getEffectiveRole(userId, targetCompanyId);
    if (!effectiveRole) {
      throw new ForbiddenException('No access to this company');
    }

    // Get user info
    const [user] = await this.db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, userId))
      .limit(1);

    if (!user || !user.active) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: effectiveRole,
      companyId: targetCompanyId,
    };

    return {
      accessToken: this.jwtService.sign({ ...payload }),
      refreshToken: this.jwtService.sign({ ...payload }, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh-changeme'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d') as any,
      }),
      companyId: targetCompanyId,
      role: effectiveRole,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh-changeme'),
      });

      const [user] = await this.db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.id, payload.sub))
        .limit(1);

      if (!user || !user.active) {
        throw new UnauthorizedException('User no longer active');
      }

      // Get the effective role from RBAC table
      const companyId = payload.companyId || user.company_id;
      const effectiveRole = await this.getEffectiveRole(user.id, companyId);

      const newPayload: JwtPayload = {
        sub: payload.sub,
        email: payload.email,
        name: user.name,
        role: effectiveRole ?? user.role,
        companyId,
      };

      return {
        accessToken: this.jwtService.sign({ ...newPayload }),
        refreshToken: this.jwtService.sign({ ...newPayload }, {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh-changeme'),
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d') as any,
        }),
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /** Get the user's effective role for a specific company */
  private async getEffectiveRole(userId: string, companyId: string): Promise<string | null> {
    const { rows } = await this.pool.query(
      `SELECT role FROM user_company_roles WHERE user_id = $1 AND company_id = $2 AND active = true LIMIT 1`,
      [userId, companyId],
    );
    return rows.length > 0 ? rows[0].role : null;
  }

  /** Get all companies a user has access to */
  private async getUserCompanies(userId: string) {
    const { rows } = await this.pool.query(
      `SELECT c.id, c.name, c.slug, ucr.role
       FROM user_company_roles ucr
       JOIN companies c ON c.id = ucr.company_id
       WHERE ucr.user_id = $1 AND ucr.active = true AND c.active = true
       ORDER BY c.name`,
      [userId],
    );
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      role: r.role,
    }));
  }
}
