import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { UploadService } from './upload.service';
import type { UploadKind } from './upload.service';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

class PresignDto {
  @IsEnum(['photo', 'video', 'audio', 'document'])
  kind: UploadKind;

  @IsString()
  mimeType: string;

  @IsNumber()
  @Min(1)
  fileSize: number;
}

class CompleteDto {
  @IsString()
  key: string;

  @IsNumber()
  @IsOptional()
  width?: number;

  @IsNumber()
  @IsOptional()
  height?: number;

  @IsNumber()
  @IsOptional()
  duration?: number;
}

@Controller('api/upload')
@UseGuards(AuthGuard('jwt'))
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * 步骤 1：请求签名 URL
   *
   * curl 示例：
   *   curl -X POST http://localhost:3000/api/upload/sign \
   *     -H "Authorization: Bearer $JWT" \
   *     -H "Content-Type: application/json" \
   *     -d '{"kind":"photo","mimeType":"image/jpeg","fileSize":12345}'
   */
  @Post('sign')
  async sign(@CurrentUser() user: User, @Body() dto: PresignDto) {
    return this.uploadService.presign(
      user.id,
      dto.kind,
      dto.mimeType,
      dto.fileSize,
    );
  }

  /**
   * 步骤 2：上传完成后通知后端
   */
  @Post('complete')
  async complete(@CurrentUser() user: User, @Body() dto: CompleteDto) {
    if (!dto.key) {
      throw new BadRequestException('key is required');
    }
    return this.uploadService.complete(user.id, dto.key, {
      width: dto.width,
      height: dto.height,
      duration: dto.duration,
    });
  }

  /**
   * 删除已上传的对象（带所有权校验）
   */
  @Delete(':key')
  async remove(@CurrentUser() user: User, @Param('key') key: string) {
    // NestJS 自动把 `uploads/user-1/photo/abc.jpg` 中的
    // 整段作为 key（因为路径有 `/`，需 wildcard）
    const fullKey = key.includes('/') ? key : `uploads/${user.id}/photo/${key}`;
    await this.uploadService.remove(user.id, fullKey);
    return { deleted: true };
  }
}
