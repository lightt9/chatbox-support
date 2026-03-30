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
import { ChannelsService } from './channels.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('api/v1/channels')
@UseGuards(JwtAuthGuard)
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get()
  async findAll() {
    // TODO: Implement list channels
    return { message: 'TODO: List channels' };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // TODO: Implement get channel by id
    return { message: `TODO: Get channel ${id}` };
  }

  @Post()
  async create(@Body() body: any) {
    // TODO: Implement create/connect channel
    return { message: 'TODO: Create channel' };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    // TODO: Implement update channel configuration
    return { message: `TODO: Update channel ${id}` };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    // TODO: Implement disconnect/remove channel
    return { message: `TODO: Remove channel ${id}` };
  }
}
