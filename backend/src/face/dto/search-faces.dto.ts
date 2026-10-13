import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class SearchFacesDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  threshold?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2000)
  topK?: number;
}
