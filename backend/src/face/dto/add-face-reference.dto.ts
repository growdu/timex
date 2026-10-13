import { IsObject, IsOptional, IsString, IsUrl } from 'class-validator';

export class AddFaceReferenceDto {
  @IsString()
  @IsUrl({ require_tld: false })
  imageUrl!: string;

  @IsOptional()
  @IsObject()
  bboxHint?: { x: number; y: number; w: number; h: number };
}