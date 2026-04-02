import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsUUID()
  @IsString()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;
}
