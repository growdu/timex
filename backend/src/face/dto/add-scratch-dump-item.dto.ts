import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class AddScratchDumpItemDto {
  @IsString()
  @IsUrl({ require_tld: false })
  imageUrl!: string;

  @IsOptional()
  @IsDateString()
  takenAt?: string;

  @IsOptional()
  @IsDateString()
  fileMtime?: string;

  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;
}
