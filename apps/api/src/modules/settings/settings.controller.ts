import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SettingsService } from './settings.service';
import { ChatGateway } from '../chat/chat.gateway';
import { UpdateGeneralDto } from './dto/update-general.dto';
import { UpdateNotificationsDto } from './dto/update-notifications.dto';
import { UpdateSecurityDto } from './dto/update-security.dto';
import { UpdateAppearanceDto } from './dto/update-appearance.dto';
import { UpdateWidgetDto } from './dto/update-widget.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('api/v1/settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get()
  async getAll(@CurrentUser() user: any) {
    return this.settingsService.getAll(user.companyId, user.id);
  }

  @Patch('general')
  async updateGeneral(
    @CurrentUser() user: any,
    @Body() dto: UpdateGeneralDto,
  ) {
    return this.settingsService.updateGeneral(user.companyId, dto);
  }

  @Patch('notifications')
  async updateNotifications(
    @CurrentUser() user: any,
    @Body() dto: UpdateNotificationsDto,
  ) {
    return this.settingsService.updateNotifications(user.companyId, dto);
  }

  @Patch('security')
  async updateSecurity(
    @CurrentUser() user: any,
    @Body() dto: UpdateSecurityDto,
  ) {
    return this.settingsService.updateSecurity(user.companyId, dto);
  }

  @Patch('appearance')
  async updateAppearance(
    @CurrentUser() user: any,
    @Body() dto: UpdateAppearanceDto,
  ) {
    return this.settingsService.updateAppearance(user.companyId, dto);
  }

  @Patch('widget')
  async updateWidget(
    @CurrentUser() user: any,
    @Body() dto: UpdateWidgetDto,
  ) {
    const result = this.settingsService.updateWidget(user.companyId, dto);
    // Notify all connected widgets to refetch config
    this.chatGateway.server.emit('widget:config-updated', { companyId: user.companyId });
    return result;
  }

  @Patch('ai')
  async updateAi(
    @CurrentUser() user: any,
    @Body() body: { tone?: string; customPrompt?: string; knowledgeContext?: string },
  ) {
    return this.settingsService.updateAiSettings(user.companyId, body);
  }

  @Get('ai')
  async getAi(@CurrentUser() user: any) {
    return this.settingsService.getAiSettings(user.companyId);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.settingsService.changePassword(user.id, dto);
  }
}
