import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('api/v1/conversations')
@UseGuards(JwtAuthGuard)
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get()
  async findAll(@Query('status') status?: string) {
    // TODO: Implement list conversations with optional status filter
    return { message: 'TODO: List conversations' };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // TODO: Implement get conversation by id
    return { message: `TODO: Get conversation ${id}` };
  }

  @Post()
  async create(@Body() body: any) {
    // TODO: Implement create conversation
    return { message: 'TODO: Create conversation' };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    // TODO: Implement update conversation
    return { message: `TODO: Update conversation ${id}` };
  }

  @Get(':id/messages')
  async getMessages(@Param('id') id: string) {
    // TODO: Implement get messages for conversation
    return { message: `TODO: Get messages for conversation ${id}` };
  }

  @Post(':id/messages')
  async sendMessage(@Param('id') id: string, @Body() body: any) {
    // TODO: Implement send message in conversation
    return { message: `TODO: Send message in conversation ${id}` };
  }

  @Post(':id/escalate')
  async escalate(@Param('id') id: string, @Body() body: any) {
    // TODO: Implement escalate conversation
    return { message: `TODO: Escalate conversation ${id}` };
  }

  @Patch(':id/resolve')
  async resolve(@Param('id') id: string) {
    // TODO: Implement resolve conversation
    return { message: `TODO: Resolve conversation ${id}` };
  }

  @Patch(':id/assign')
  async assign(@Param('id') id: string, @Body() body: any) {
    // TODO: Implement assign conversation to agent
    return { message: `TODO: Assign conversation ${id}` };
  }
}
