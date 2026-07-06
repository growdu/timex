import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiJob } from './entities/ai-job.entity';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { OllamaProvider } from './providers/ollama.provider';
import { MockProvider } from './providers/mock.provider';
import { AiRouterProvider } from './providers/ai-router.provider';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([AiJob])],
  controllers: [AiController],
  providers: [
    AiService,
    OllamaProvider,
    MockProvider,
    AiRouterProvider, // 路由器作为默认 LlmProvider 注入 AiService
  ],
  exports: [AiService, TypeOrmModule, AiRouterProvider],
})
export class AiModule {}
