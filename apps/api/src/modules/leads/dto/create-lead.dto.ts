import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLeadDto {
  @IsNotEmpty() @IsString() name: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() @IsIn(['website', 'chat_widget', 'referral', 'social', 'ads', 'manual', 'api']) source?: string;
  @IsOptional() @IsString() @IsIn(['hot', 'warm', 'cold']) rating?: string;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @IsString() notes?: string;
}
