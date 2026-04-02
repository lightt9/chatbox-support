import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  @IsIn(['open', 'investigating', 'resolved'])
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn(['low', 'medium', 'high', 'critical'])
  severity?: string;

  @IsOptional()
  @IsString()
  @IsIn([
    'Incorrect Response',
    'Hallucination',
    'Tone Issue',
    'Process Violation',
  ])
  ticketType?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
