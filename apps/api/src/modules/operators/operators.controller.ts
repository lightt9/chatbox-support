import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OperatorsService } from './operators.service';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';
import { QueryOperatorDto } from './dto/query-operator.dto';

@Controller('api/v1/operators')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class OperatorsController {
  constructor(private readonly operatorsService: OperatorsService) {}

  @Get()
  @Roles('super_admin', 'admin', 'manager')
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QueryOperatorDto,
  ) {
    return this.operatorsService.findAll(companyId, query);
  }

  @Get('teams')
  @Roles('super_admin', 'admin', 'manager')
  findAllTeams(@CurrentUser('companyId') companyId: string) {
    return this.operatorsService.findAllTeams(companyId);
  }

  @Post('teams')
  @Roles('super_admin', 'admin')
  createTeam(
    @CurrentUser('companyId') companyId: string,
    @Body() body: { name: string; description?: string },
  ) {
    return this.operatorsService.createTeam(companyId, body.name, body.description);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager')
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.operatorsService.findOne(companyId, id);
  }

  @Post()
  @Roles('super_admin', 'admin')
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateOperatorDto,
  ) {
    return this.operatorsService.create(companyId, dto);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'manager')
  update(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOperatorDto,
  ) {
    return this.operatorsService.update(companyId, id, dto, {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: string },
  ) {
    return this.operatorsService.updateStatus(companyId, id, body.status);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  remove(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.operatorsService.remove(companyId, id, {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });
  }
}
