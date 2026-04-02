import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTicketDto {
  @IsNotEmpty()
  @IsString()
  conversationTitle: string;

  @IsNotEmpty()
  @IsString()
  agentName: string;

  @IsString()
  @IsIn([
    'Incorrect Response',
    'Hallucination',
    'Tone Issue',
    'Process Violation',
  ])
  ticketType: string;

  @IsString()
  @IsIn(['low', 'medium', 'high', 'critical'])
  severity: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
