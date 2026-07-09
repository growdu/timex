import { IsArray, ValidateNested, IsBoolean, IsString, IsInt, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class WidgetDto {
  @IsString()
  type: string;

  @IsBoolean()
  visible: boolean;

  @IsInt()
  order: number;

  @IsIn(['full', 'half', 'third'])
  size: 'full' | 'half' | 'third';
}

export class UpdateDashboardConfigDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WidgetDto)
  widgets: WidgetDto[];
}
