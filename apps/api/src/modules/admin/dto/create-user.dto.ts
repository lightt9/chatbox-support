import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsUUID()
  @IsString()
  companyId: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}
