import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
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
import { AppThrottlerModule } from './throttler/throttler.module';
import { AiModule } from './ai/ai.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExportModule } from './export/export.module';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';

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
    AppThrottlerModule,
    AiModule,
    DashboardModule,
    ExportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(SecurityHeadersMiddleware, RequestLoggerMiddleware)
      .forRoutes('*');
  }
}
