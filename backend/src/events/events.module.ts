import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { Event } from './event.entity';
import { Person } from '../people/person.entity';
import { Place } from '../places/place.entity';
import { Moment } from '../moments/moment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Person, Place, Moment])],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
