import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { sql } from 'drizzle-orm';
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
      await this.db.execute(
        sql`SET LOCAL app.current_company_id = ${user.companyId}`,
      );
    }

    return next.handle();
  }
}
