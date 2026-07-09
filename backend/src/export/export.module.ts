import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { Event } from '../events/event.entity';
import { Memoir } from '../memoirs/memoir.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Memoir, User])],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
