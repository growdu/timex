import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { FaceService } from './face.service';
import { SearchFacesDto } from './dto/search-faces.dto';
import { AddFaceReferenceDto } from './dto/add-face-reference.dto';

@Controller('faces')
export class FaceController {
  constructor(private readonly face: FaceService) {}

  @Get('me')
  me(@CurrentUser() u: User) {
    return this.face.getMyProfile(u.id);
  }

  @Post('me/references')
  @HttpCode(HttpStatus.CREATED)
  addRef(@CurrentUser() u: User, @Body() body: AddFaceReferenceDto) {
    return this.face.addReference(u.id, body.imageUrl, body.bboxHint);
  }

  @Delete('me/references/:refId')
  removeRef(@CurrentUser() u: User, @Param('refId') refId: string) {
    return this.face.removeReference(u.id, refId);
  }

  @Patch('me/references/:refId')
  setEnabled(
    @CurrentUser() u: User,
    @Param('refId') refId: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.face.setReferenceEnabled(u.id, refId, body.enabled);
  }

  @Post('search')
  @HttpCode(HttpStatus.CREATED)
  search(@CurrentUser() u: User, @Body() body: SearchFacesDto) {
    return this.face.searchMine(u.id, {
      threshold: body.threshold,
      topK: body.topK,
    });
  }

  @Post('moments/:momentId/extract')
  @HttpCode(HttpStatus.CREATED)
  extract(@CurrentUser() u: User, @Param('momentId') momentId: string) {
    return this.face.enqueueExtractFaces(u.id, momentId);
  }

  @Post('backfill')
  @HttpCode(HttpStatus.CREATED)
  backfill(@CurrentUser() u: User) {
    return this.face.startBackfill(u.id);
  }

  @Get('backfill/status')
  status() {
    return this.face.getBackfillStatus();
  }
}
