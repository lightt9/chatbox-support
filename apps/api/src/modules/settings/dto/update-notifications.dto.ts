import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationsDto {
  @IsOptional()
  @IsBoolean()
  newConversations?: boolean;

  @IsOptional()
  @IsBoolean()
  escalations?: boolean;

  @IsOptional()
  @IsBoolean()
  browserPush?: boolean;

  @IsOptional()
  @IsBoolean()
  dailySummary?: boolean;

  @IsOptional()
  @IsBoolean()
  weeklyReports?: boolean;
}
