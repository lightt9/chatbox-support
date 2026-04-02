import { IsInt, IsString, IsBoolean, IsOptional, Min, Max, Matches } from 'class-validator';

export class CreateScheduleDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'openTime must be in HH:mm format' })
  openTime: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'closeTime must be in HH:mm format' })
  closeTime: string;

  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;
}
