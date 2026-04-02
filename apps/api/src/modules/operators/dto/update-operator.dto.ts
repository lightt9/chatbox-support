import {
  IsEmail,
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  IsArray,
  IsIn,
  MinLength,
  Min,
  Max,
  IsUUID,
} from 'class-validator';

export class UpdateOperatorDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @IsString()
  @IsIn(['admin', 'manager', 'agent'])
  @IsOptional()
  role?: string;

  @IsString()
  @IsIn(['online', 'away', 'busy', 'offline'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsIn(['en', 'ro', 'ru'])
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  maxConcurrentChats?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  languages?: string[];

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  teamIds?: string[];

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
