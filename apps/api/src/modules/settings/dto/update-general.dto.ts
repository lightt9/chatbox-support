import { IsOptional, IsString, IsEmail } from 'class-validator';

export class UpdateGeneralDto {
  @IsOptional()
  @IsString()
  platformName?: string;

  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @IsOptional()
  @IsString()
  defaultLanguage?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
