import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { EscalationService } from './escalation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('api/v1/escalation-rules')
@UseGuards(JwtAuthGuard)
export class EscalationController {
  constructor(private readonly escalationService: EscalationService) {}

  @Get()
  async findAll() {
    // TODO: Implement list escalation rules
    return { message: 'TODO: List escalation rules' };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // TODO: Implement get escalation rule by id
    return { message: `TODO: Get escalation rule ${id}` };
  }

  @Post()
  async create(@Body() body: any) {
    // TODO: Implement create escalation rule
    return { message: 'TODO: Create escalation rule' };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    // TODO: Implement update escalation rule
    return { message: `TODO: Update escalation rule ${id}` };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    // TODO: Implement delete escalation rule
    return { message: `TODO: Delete escalation rule ${id}` };
  }
}
