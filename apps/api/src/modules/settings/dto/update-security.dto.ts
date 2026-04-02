import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateSecurityDto {
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  sessionTimeout?: number;

  @IsOptional()
  @IsBoolean()
  require2fa?: boolean;

  @IsOptional()
  @IsBoolean()
  enableSso?: boolean;
}
