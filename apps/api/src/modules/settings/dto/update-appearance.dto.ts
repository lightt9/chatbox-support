import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateAppearanceDto {
  @IsOptional()
  @IsString()
  @IsIn(['light', 'dark', 'system'])
  theme?: string;

  @IsOptional()
  @IsString()
  @IsIn(['blue', 'purple', 'green', 'orange', 'red', 'pink'])
  primaryColor?: string;
}
