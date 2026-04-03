import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { DB_POOL } from '../../config/database.module';
import { isAtLeast } from './permissions';

/**
 * Validates that the authenticated user has access to the company
 * specified in their JWT token. Server admins can access any company.
 *
 * This guard should be applied AFTER JwtAuthGuard.
 */
@Injectable()
export class CompanyAccessGuard implements CanActivate {
  constructor(@Inject(DB_POOL) private readonly pool: any) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.companyId) {
      throw new ForbiddenException('No company context');
    }

    // Server admins can access any company
    if (isAtLeast(user.role, 'server_admin')) {
      return true;
    }

    // Verify user has an active role in the requested company
    const { rows } = await this.pool.query(
      `SELECT role, active FROM user_company_roles
       WHERE user_id = $1 AND company_id = $2 AND active = true
       LIMIT 1`,
      [user.id, user.companyId],
    );

    if (rows.length === 0) {
      throw new ForbiddenException('No access to this company');
    }

    // Update the user's effective role for this company context
    request.user = {
      ...user,
      role: rows[0].role,
    };

    return true;
  }
}
