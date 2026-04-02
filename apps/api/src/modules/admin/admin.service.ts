import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { DATABASE } from '../../config/database.module';
import { adminUsers } from '../../database/schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class AdminService {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  async findAllUsers() {
    const users = await this.db
      .select({
        id: adminUsers.id,
        companyId: adminUsers.company_id,
        email: adminUsers.email,
        name: adminUsers.name,
        role: adminUsers.role,
        avatarUrl: adminUsers.avatar_url,
        active: adminUsers.active,
        lastLoginAt: adminUsers.last_login_at,
        createdAt: adminUsers.created_at,
      })
      .from(adminUsers);
    return users;
  }

  async findOneUser(id: string) {
    const [user] = await this.db
      .select({
        id: adminUsers.id,
        companyId: adminUsers.company_id,
        email: adminUsers.email,
        name: adminUsers.name,
        role: adminUsers.role,
        avatarUrl: adminUsers.avatar_url,
        active: adminUsers.active,
        lastLoginAt: adminUsers.last_login_at,
        createdAt: adminUsers.created_at,
        updatedAt: adminUsers.updated_at,
      })
      .from(adminUsers)
      .where(eq(adminUsers.id, id))
      .limit(1);

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1);
    return user || null;
  }

  async createUser(dto: CreateUserDto) {
    // Check for duplicate email
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const [user] = await this.db
      .insert(adminUsers)
      .values({
        email: dto.email,
        name: dto.name,
        password_hash: passwordHash,
        role: dto.role || 'admin',
        company_id: dto.companyId,
        avatar_url: dto.avatarUrl,
      })
      .returning({
        id: adminUsers.id,
        companyId: adminUsers.company_id,
        email: adminUsers.email,
        name: adminUsers.name,
        role: adminUsers.role,
        active: adminUsers.active,
        createdAt: adminUsers.created_at,
      });

    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const updateData: any = { updated_at: new Date() };

    if (dto.email) updateData.email = dto.email;
    if (dto.name) updateData.name = dto.name;
    if (dto.role) updateData.role = dto.role;
    if (dto.avatarUrl !== undefined) updateData.avatar_url = dto.avatarUrl;
    if (dto.password) {
      updateData.password_hash = await bcrypt.hash(dto.password, 12);
    }

    const [user] = await this.db
      .update(adminUsers)
      .set(updateData)
      .where(eq(adminUsers.id, id))
      .returning({
        id: adminUsers.id,
        companyId: adminUsers.company_id,
        email: adminUsers.email,
        name: adminUsers.name,
        role: adminUsers.role,
        active: adminUsers.active,
        updatedAt: adminUsers.updated_at,
      });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async removeUser(id: string) {
    // Soft delete
    const [user] = await this.db
      .update(adminUsers)
      .set({ active: false, updated_at: new Date() })
      .where(eq(adminUsers.id, id))
      .returning({ id: adminUsers.id });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return { message: 'User deactivated' };
  }
}
