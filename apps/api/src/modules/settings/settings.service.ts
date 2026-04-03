import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { DATABASE } from '../../config/database.module';
import { companies } from '../../database/schema/companies';
import { adminUsers } from '../../database/schema/admin';
import { UpdateGeneralDto } from './dto/update-general.dto';
import { UpdateNotificationsDto } from './dto/update-notifications.dto';
import { UpdateSecurityDto } from './dto/update-security.dto';
import { UpdateAppearanceDto } from './dto/update-appearance.dto';
import { UpdateWidgetDto } from './dto/update-widget.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const DEFAULT_WIDGET = {
  companyName: 'ChatBox',
  welcomeMessage: 'Hi there! How can we help you today?',
  botAvatarUrl: '',
  headerColor: '#3b82f6',
  userMessageColor: '#3b82f6',
  botMessageColor: '#f1f5f9',
  chatBackground: '#ffffff',
  widgetPosition: 'right',
  widgetSize: 'medium',
  borderRadius: 16,
  autoOpenEnabled: false,
  autoOpenDelay: 5,
  soundEnabled: true,
  notificationBadge: true,
  pulseAnimation: true,
  preChatFormEnabled: true,
  preChatNameRequired: true,
  preChatEmailRequired: true,
  preChatPhoneEnabled: false,
  preChatCustomFields: [],
  customCSS: '',
  // Feature toggles
  featureLiveTyping: true,
  featureSeenStatus: true,
  featureFileUpload: true,
  featureEmoji: true,
  featureSound: true,
  featureChatHistory: true,
  featureEndChat: true,
  featureAiSuggestions: true,
};

const BCRYPT_ROUNDS = 12;

@Injectable()
export class SettingsService {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  /** Public: returns widget config for a company (no auth needed) */
  async getPublicWidgetConfig(companyId: string) {
    const [company] = await this.db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const settings = (company.settings ?? {}) as Record<string, any>;
    return { ...DEFAULT_WIDGET, ...settings.widget };
  }

  async getAll(companyId: string, userId: string) {
    const [company] = await this.db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const users = await this.db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, userId))
      .limit(1);

    const user = users[0] ?? null;
    const settings = (company.settings ?? {}) as Record<string, any>;

    return {
      general: {
        platformName: company.name,
        supportEmail: settings.supportEmail ?? '',
        defaultLanguage: company.default_language,
        timezone: company.timezone,
      },
      notifications: {
        newConversations: settings.notifications?.newConversations ?? true,
        escalations: settings.notifications?.escalations ?? true,
        browserPush: settings.notifications?.browserPush ?? false,
        dailySummary: settings.notifications?.dailySummary ?? false,
        weeklyReports: settings.notifications?.weeklyReports ?? true,
      },
      security: {
        sessionTimeout: settings.security?.sessionTimeout ?? 30,
        require2fa: settings.security?.require2fa ?? false,
        enableSso: settings.security?.enableSso ?? false,
      },
      appearance: {
        theme: settings.appearance?.theme ?? 'light',
        primaryColor: settings.appearance?.primaryColor ?? 'blue',
      },
      widget: { ...DEFAULT_WIDGET, ...settings.widget },
      profile: user
        ? {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatar_url,
            role: user.role,
            authProvider: user.auth_provider ?? 'local',
          }
        : null,
    };
  }

  async updateGeneral(companyId: string, dto: UpdateGeneralDto) {
    const [company] = await this.db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const currentSettings = (company.settings ?? {}) as Record<string, any>;

    const updateData: Record<string, any> = { updated_at: new Date() };

    if (dto.platformName !== undefined) {
      updateData.name = dto.platformName;
    }
    if (dto.defaultLanguage !== undefined) {
      updateData.default_language = dto.defaultLanguage;
    }
    if (dto.timezone !== undefined) {
      updateData.timezone = dto.timezone;
    }
    if (dto.supportEmail !== undefined) {
      currentSettings.supportEmail = dto.supportEmail;
      updateData.settings = currentSettings;
    }

    const [updated] = await this.db
      .update(companies)
      .set(updateData)
      .where(eq(companies.id, companyId))
      .returning();

    const settings = (updated.settings ?? {}) as Record<string, any>;

    return {
      platformName: updated.name,
      supportEmail: settings.supportEmail ?? '',
      defaultLanguage: updated.default_language,
      timezone: updated.timezone,
    };
  }

  async updateNotifications(companyId: string, dto: UpdateNotificationsDto) {
    const [company] = await this.db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const currentSettings = (company.settings ?? {}) as Record<string, any>;
    const currentNotifications = currentSettings.notifications ?? {};

    const merged = {
      ...currentNotifications,
      ...(dto.newConversations !== undefined && {
        newConversations: dto.newConversations,
      }),
      ...(dto.escalations !== undefined && { escalations: dto.escalations }),
      ...(dto.browserPush !== undefined && { browserPush: dto.browserPush }),
      ...(dto.dailySummary !== undefined && { dailySummary: dto.dailySummary }),
      ...(dto.weeklyReports !== undefined && {
        weeklyReports: dto.weeklyReports,
      }),
    };

    currentSettings.notifications = merged;

    const [updated] = await this.db
      .update(companies)
      .set({ settings: currentSettings, updated_at: new Date() })
      .where(eq(companies.id, companyId))
      .returning();

    return (updated.settings as any).notifications;
  }

  async updateSecurity(companyId: string, dto: UpdateSecurityDto) {
    const [company] = await this.db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const currentSettings = (company.settings ?? {}) as Record<string, any>;
    const currentSecurity = currentSettings.security ?? {};

    const merged = {
      ...currentSecurity,
      ...(dto.sessionTimeout !== undefined && {
        sessionTimeout: dto.sessionTimeout,
      }),
      ...(dto.require2fa !== undefined && { require2fa: dto.require2fa }),
      ...(dto.enableSso !== undefined && { enableSso: dto.enableSso }),
    };

    currentSettings.security = merged;

    const [updated] = await this.db
      .update(companies)
      .set({ settings: currentSettings, updated_at: new Date() })
      .where(eq(companies.id, companyId))
      .returning();

    return (updated.settings as any).security;
  }

  async updateAppearance(companyId: string, dto: UpdateAppearanceDto) {
    const [company] = await this.db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const currentSettings = (company.settings ?? {}) as Record<string, any>;
    const currentAppearance = currentSettings.appearance ?? {};

    const merged = {
      ...currentAppearance,
      ...(dto.theme !== undefined && { theme: dto.theme }),
      ...(dto.primaryColor !== undefined && { primaryColor: dto.primaryColor }),
    };

    currentSettings.appearance = merged;

    const [updated] = await this.db
      .update(companies)
      .set({ settings: currentSettings, updated_at: new Date() })
      .where(eq(companies.id, companyId))
      .returning();

    return (updated.settings as any).appearance;
  }

  async updateWidget(companyId: string, dto: UpdateWidgetDto) {
    const [company] = await this.db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const currentSettings = (company.settings ?? {}) as Record<string, any>;
    const currentWidget = currentSettings.widget ?? {};

    const merged = { ...currentWidget };
    for (const [key, val] of Object.entries(dto)) {
      if (val !== undefined) {
        merged[key] = val;
      }
    }

    currentSettings.widget = merged;

    const [updated] = await this.db
      .update(companies)
      .set({ settings: currentSettings, updated_at: new Date() })
      .where(eq(companies.id, companyId))
      .returning();

    return { ...DEFAULT_WIDGET, ...(updated.settings as any).widget };
  }

  async getAiSettings(companyId: string) {
    const [company] = await this.db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!company) return { tone: 'friendly', customPrompt: '', knowledgeContext: '' };
    const settings = (company.settings ?? {}) as Record<string, any>;
    return {
      tone: settings.ai?.tone ?? 'friendly',
      customPrompt: settings.ai?.customPrompt ?? '',
      knowledgeContext: settings.ai?.knowledgeContext ?? '',
    };
  }

  async updateAiSettings(companyId: string, dto: { tone?: string; customPrompt?: string; knowledgeContext?: string }) {
    const [company] = await this.db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!company) throw new NotFoundException('Company not found');
    const existing = (company.settings ?? {}) as Record<string, any>;
    const updatedAi = { ...(existing.ai ?? {}), ...dto };
    const updatedSettings = { ...existing, ai: updatedAi };
    await this.db.update(companies).set({ settings: updatedSettings, updated_at: new Date() }).where(eq(companies.id, companyId));
    return updatedAi;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const [user] = await this.db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.password_hash) {
      throw new BadRequestException(
        'Cannot change password for social login accounts. Use your social provider to manage your password.',
      );
    }

    const isValid = await bcrypt.compare(dto.currentPassword, user.password_hash);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    await this.db
      .update(adminUsers)
      .set({ password_hash: newHash, updated_at: new Date() })
      .where(eq(adminUsers.id, userId));

    return { message: 'Password changed successfully' };
  }
}
