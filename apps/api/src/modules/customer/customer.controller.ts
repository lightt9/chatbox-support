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
import { CustomerService } from './customer.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('api/v1/customers')
@UseGuards(JwtAuthGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  async findAll() {
    // TODO: Implement list customers
    return { message: 'TODO: List customers' };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // TODO: Implement get customer by id
    return { message: `TODO: Get customer ${id}` };
  }

  @Post()
  async create(@Body() body: any) {
    // TODO: Implement create customer
    return { message: 'TODO: Create customer' };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    // TODO: Implement update customer
    return { message: `TODO: Update customer ${id}` };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    // TODO: Implement delete customer
    return { message: `TODO: Delete customer ${id}` };
  }

  @Get(':id/conversations')
  async getConversations(@Param('id') id: string) {
    // TODO: Implement get customer conversations
    return { message: `TODO: Get conversations for customer ${id}` };
  }
}
