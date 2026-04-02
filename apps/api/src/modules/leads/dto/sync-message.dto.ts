import { IsIn, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SyncMessageDto {
  @IsNotEmpty() @IsUUID()
  conversationId: string;

  @IsNotEmpty() @IsString()
  message: string;

  @IsNotEmpty() @IsString() @IsIn(['customer', 'ai', 'operator', 'system'])
  senderType: string;
}
