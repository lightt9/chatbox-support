import { IsString, IsBoolean, IsOptional, IsIn, IsObject } from 'class-validator';

export class UpsertChannelDto {
  @IsString()
  @IsIn([
    'whatsapp',
    'instagram',
    'messenger',
    'viber',
    'bitrix24',
    'amocrm',
    'web_chat',
  ])
  channelType: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  credentials?: Record<string, any>;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
