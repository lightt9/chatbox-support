import { IsOptional, IsString, IsIn, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryOperatorDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsIn(['admin', 'manager', 'agent'])
  @IsOptional()
  role?: string;

  @IsString()
  @IsIn(['online', 'away', 'busy', 'offline'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsIn(['true', 'false'])
  @IsOptional()
  active?: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number;
}
