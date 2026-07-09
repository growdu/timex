import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardConfig } from './dashboard-config.entity';
import { Event } from '../events/event.entity';
import { Person } from '../people/person.entity';
import { Place } from '../places/place.entity';
import { Moment } from '../moments/moment.entity';
import { Memoir } from '../memoirs/memoir.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DashboardConfig, Event, Person, Place, Moment, Memoir,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
