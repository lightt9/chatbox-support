import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('api/v1/admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  async findAll() {
    // TODO: Implement list admin/agent users
    return { message: 'TODO: List admin users' };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // TODO: Implement get user by id
    return { message: `TODO: Get admin user ${id}` };
  }

  @Post()
  async create(@Body() body: any) {
    // TODO: Implement create admin/agent user
    return { message: 'TODO: Create admin user' };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    // TODO: Implement update user
    return { message: `TODO: Update admin user ${id}` };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    // TODO: Implement delete user
    return { message: `TODO: Delete admin user ${id}` };
  }

  @Patch(':id/role')
  async updateRole(@Param('id') id: string, @Body() body: any) {
    // TODO: Implement update user role
    return { message: `TODO: Update role for user ${id}` };
  }
}
