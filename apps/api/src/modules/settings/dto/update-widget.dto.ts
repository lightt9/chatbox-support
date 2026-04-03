import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsArray,
  IsIn,
  Min,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateWidgetDto {
  /* ── Branding ──────────────────────────────────────────────────────────── */
  @IsOptional() @IsString() @MaxLength(100)
  companyName?: string;

  @IsOptional() @IsString() @MaxLength(500)
  welcomeMessage?: string;

  @IsOptional() @IsString() @MaxLength(500)
  botAvatarUrl?: string;

  /* ── Chat UI Colors ────────────────────────────────────────────────────── */
  @IsOptional() @IsString() @MaxLength(9)
  headerColor?: string;

  @IsOptional() @IsString() @MaxLength(9)
  userMessageColor?: string;

  @IsOptional() @IsString() @MaxLength(9)
  botMessageColor?: string;

  @IsOptional() @IsString() @MaxLength(9)
  chatBackground?: string;

  /* ── Widget Layout ─────────────────────────────────────────────────────── */
  @IsOptional() @IsString() @IsIn(['left', 'right'])
  widgetPosition?: string;

  @IsOptional() @IsString() @IsIn(['small', 'medium', 'large'])
  widgetSize?: string;

  @IsOptional() @IsNumber() @Min(0) @Max(24)
  borderRadius?: number;

  /* ── Behavior ──────────────────────────────────────────────────────────── */
  @IsOptional() @IsBoolean()
  autoOpenEnabled?: boolean;

  @IsOptional() @IsNumber() @Min(1) @Max(120)
  autoOpenDelay?: number;

  /* ── Notifications / Experience ─────────────────────────────────────────── */
  @IsOptional() @IsBoolean()
  soundEnabled?: boolean;

  @IsOptional() @IsBoolean()
  notificationBadge?: boolean;

  @IsOptional() @IsBoolean()
  pulseAnimation?: boolean;

  /* ── Pre-chat form ──────────────────────────────────────────────────────── */
  @IsOptional() @IsBoolean()
  preChatFormEnabled?: boolean;

  @IsOptional() @IsBoolean()
  preChatNameRequired?: boolean;

  @IsOptional() @IsBoolean()
  preChatEmailRequired?: boolean;

  @IsOptional() @IsBoolean()
  preChatPhoneEnabled?: boolean;

  @IsOptional() @IsArray()
  preChatCustomFields?: { label: string; type: string; required: boolean }[];

  /* ── Advanced ──────────────────────────────────────────────────────────── */
  @IsOptional() @IsString() @MaxLength(5000)
  customCSS?: string;

  /* ── Feature Toggles ──────────────────────────────────────────────────── */
  @IsOptional() @IsBoolean()
  featureLiveTyping?: boolean;

  @IsOptional() @IsBoolean()
  featureSeenStatus?: boolean;

  @IsOptional() @IsBoolean()
  featureFileUpload?: boolean;

  @IsOptional() @IsBoolean()
  featureEmoji?: boolean;

  @IsOptional() @IsBoolean()
  featureSound?: boolean;

  @IsOptional() @IsBoolean()
  featureChatHistory?: boolean;

  @IsOptional() @IsBoolean()
  featureEndChat?: boolean;

  @IsOptional() @IsBoolean()
  featureAiSuggestions?: boolean;
}
