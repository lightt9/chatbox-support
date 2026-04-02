import { IsEmail, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateChatLeadDto {
  @IsNotEmpty() @IsUUID()
  conversationId: string;

  @IsNotEmpty() @IsString()
  name: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString()
  phone?: string;

  @IsOptional() @IsString()
  companyName?: string;

  @IsNotEmpty() @IsString()
  firstMessage: string;

  @IsOptional() @IsObject()
  customFields?: Record<string, string>;
}
