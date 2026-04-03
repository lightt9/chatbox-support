import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { isAtLeast } from '../rbac/permissions';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      return false;
    }

    // Check if user's role is in the required list OR is higher in hierarchy
    // This ensures server_admin/super_admin always passes
    if (requiredRoles.includes(user.role)) {
      return true;
    }

    // Check hierarchy: if user role is >= any required role, allow
    return requiredRoles.some((required) => isAtLeast(user.role, required));
  }
}
