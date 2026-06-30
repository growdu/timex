import { IsOptional, IsString, IsUrl } from 'class-validator';

export class ImageTagDto {
  @IsUrl({ require_tld: false })
  mediaUrl!: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class ImageSummaryDto {
  @IsUrl({ require_tld: false })
  mediaUrl!: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class AudioTranscribeDto {
  @IsUrl({ require_tld: false })
  audioUrl!: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class MemoirSummaryDto {
  @IsOptional()
  @IsString()
  text?: string;
}

export class ChapterSummaryDto {
  @IsOptional()
  @IsString()
  text?: string;
}

export class EventSummaryDto {
  @IsOptional()
  @IsString()
  text?: string;
}