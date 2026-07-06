import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  MaxLength,
} from 'class-validator';
import { MomentType } from '../moment.entity';

export class CreateMomentDto {
  @IsEnum(MomentType)
  type: MomentType;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20000)
  content?: string;

  @IsString()
  @IsOptional()
  eventId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  mediaUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  thumbnailUrl?: string;

  @IsNumber()
  @IsOptional()
  duration?: number;

  @IsNumber()
  @IsOptional()
  width?: number;

  @IsNumber()
  @IsOptional()
  height?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsDateString()
  @IsOptional()
  takenAt?: string;
}

export class UpdateMomentDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20000)
  content?: string;

  @IsString()
  @IsOptional()
  eventId?: string;

  @IsArray()
  @IsOptional()
  aiTags?: string[];
}
