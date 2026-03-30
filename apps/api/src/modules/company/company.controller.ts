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
import { CompanyService } from './company.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('api/v1/companies')
@UseGuards(JwtAuthGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  async findAll() {
    // TODO: Implement list companies
    return { message: 'TODO: List companies' };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // TODO: Implement get company by id
    return { message: `TODO: Get company ${id}` };
  }

  @Post()
  async create(@Body() body: any) {
    // TODO: Implement create company
    return { message: 'TODO: Create company' };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    // TODO: Implement update company
    return { message: `TODO: Update company ${id}` };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    // TODO: Implement delete company
    return { message: `TODO: Delete company ${id}` };
  }

  @Get(':id/settings')
  async getSettings(@Param('id') id: string) {
    // TODO: Implement get company settings
    return { message: `TODO: Get settings for company ${id}` };
  }

  @Put(':id/settings')
  async updateSettings(@Param('id') id: string, @Body() body: any) {
    // TODO: Implement update company settings
    return { message: `TODO: Update settings for company ${id}` };
  }
}
