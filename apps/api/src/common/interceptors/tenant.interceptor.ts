import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Pool } from 'pg';
import { DATABASE } from '../../config/database.module';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.companyId) {
      // Set the company_id on the PG session for RLS policies
      // This ensures all queries in this request are scoped to the tenant
      await this.db.execute(
        `SET LOCAL app.current_company_id = '${user.companyId}'`,
      );
    }

    return next.handle();
  }
}
