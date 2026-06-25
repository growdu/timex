import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
} from 'class-validator';
import { EventStage } from '../event-stage.enum';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  placeId?: string;

  @IsEnum(EventStage)
  @IsOptional()
  stage?: EventStage;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsString()
  @IsOptional()
  longText?: string;

  @IsString()
  @IsOptional()
  coverUrl?: string;

  @IsArray()
  @IsOptional()
  personIds?: string[];
}

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  placeId?: string;

  @IsEnum(EventStage)
  @IsOptional()
  stage?: EventStage;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsString()
  @IsOptional()
  longText?: string;

  @IsString()
  @IsOptional()
  coverUrl?: string;

  @IsArray()
  @IsOptional()
  personIds?: string[];
}
