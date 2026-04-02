import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SocialLoginDto {
  @IsIn(['google', 'facebook', 'apple'])
  provider: 'google' | 'facebook' | 'apple';

  @IsNotEmpty()
  @IsString()
  providerId: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
