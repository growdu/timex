import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { databaseConfig } from './config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LicenseModule } from './license/license.module';
import { DevicesModule } from './devices/devices.module';
import { EventsModule } from './events/events.module';
import { MomentsModule } from './moments/moments.module';
import { PeopleModule } from './people/people.module';
import { PlacesModule } from './places/places.module';
import { MemoirsModule } from './memoirs/memoirs.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
    }),
    AuthModule,
    UsersModule,
    LicenseModule,
    DevicesModule,
    EventsModule,
    MomentsModule,
    PeopleModule,
    PlacesModule,
    MemoirsModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
