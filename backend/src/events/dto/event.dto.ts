import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { EventStage } from '../event-stage.enum';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  location?: string;

  @IsString()
  @IsOptional()
  placeId?: string;

  @IsEnum(EventStage)
  @IsOptional()
  stage?: EventStage;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  summary?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10000)
  longText?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  coverUrl?: string;

  @IsArray()
  @IsOptional()
  personIds?: string[];
}

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  title?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  location?: string;

  @IsString()
  @IsOptional()
  placeId?: string;

  @IsEnum(EventStage)
  @IsOptional()
  stage?: EventStage;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  summary?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10000)
  longText?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  coverUrl?: string;

  @IsArray()
  @IsOptional()
  personIds?: string[];
}
