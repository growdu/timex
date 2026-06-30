import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiJob, AiJobKind, AiJobStatus, AiJobTargetType } from './entities/ai-job.entity';
import { AiRouterProvider } from './providers/ai-router.provider';
import { LlmCompletionRequest } from './providers/llm-provider.interface';

export interface SubmitAiJobInput {
  userId: string;
  kind: AiJobKind;
  targetType: AiJobTargetType;
  targetId: string;
  promptInput: LlmCompletionRequest['input'];
}

@Injectable()
export class AiService {
  private log = new Logger(AiService.name);

  constructor(
    @InjectRepository(AiJob)
    private repo: Repository<AiJob>,
    private llm: AiRouterProvider,
  ) {}

  /** 提交一个异步任务（立即返回 job，前台 / 后台 worker 调 runJob 处理） */
  async submit(input: SubmitAiJobInput): Promise<AiJob> {
    const job = this.repo.create({
      userId: input.userId,
      kind: input.kind,
      targetType: input.targetType,
      targetId: input.targetId,
      status: 'queued',
    });
    await this.repo.save(job);
    // 异步跑（不 await）
    void this.runJob(job.id, input.promptInput).catch((e) => {
      this.log.error(`background runJob crashed: ${e.message}`);
    });
    return job;
  }

  /** 直接同步跑（用于测试 / 简单场景） */
  async runNow(input: SubmitAiJobInput): Promise<AiJob> {
    const job = await this.submit(input);
    // 等最多 30s
    for (let i = 0; i < 60; i++) {
      await sleep(500);
      const fresh = await this.repo.findOneBy({ id: job.id });
      if (!fresh) continue;
      if (fresh.status === 'succeeded' || fresh.status === 'failed') {
        return fresh;
      }
    }
    throw new Error('AI job timed out');
  }

  /** 单次 job 执行（可被 worker / 测试调用） */
  async runJob(jobId: string, promptInput: LlmCompletionRequest['input']): Promise<AiJob> {
    const job = await this.repo.findOneBy({ id: jobId });
    if (!job) throw new NotFoundException(`ai job ${jobId} not found`);
    if (job.status === 'succeeded' || job.status === 'failed') {
      this.log.warn(`job ${jobId} already terminal (${job.status}), skipping`);
      return job;
    }
    await this.repo.update(jobId, { status: 'running' });

    try {
      const res = await this.llm.complete({
        task: job.kind,
        input: promptInput,
      });

      await this.repo.update(jobId, {
        status: 'succeeded',
        provider: res.provider,
        model: res.model,
        output: res.output,
        structured: (res.structured ?? null) as any,
        latencyMs: res.latencyMs,
      });

      // 副作用：把结果写回 target 实体
      await this.applyToTarget(job, res.output, res.structured);

      return await this.repo.findOneBy({ id: jobId }) as AiJob;
    } catch (e) {
      const msg = (e as Error).message;
      this.log.error(`job ${jobId} failed: ${msg}`);
      await this.repo.update(jobId, { status: 'failed', error: msg });
      return await this.repo.findOneBy({ id: jobId }) as AiJob;
    }
  }

  async getJob(id: string, userId: string): Promise<AiJob> {
    const job = await this.repo.findOne({ where: { id, userId } });
    if (!job) throw new NotFoundException(`job ${id} not found`);
    return job;
  }

  async listJobs(userId: string, limit = 20): Promise<AiJob[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 100),
    });
  }

  /** 根据任务类型，把输出写回对应的目标实体 */
  private async applyToTarget(job: AiJob, output: string, structured: unknown): Promise<void> {
    switch (job.kind) {
      case 'image-tag': {
        const tags = Array.isArray(structured)
          ? (structured as string[])
          : output.split(',').map((t) => t.trim()).filter(Boolean);
        // 写到 moment.ai_tags
        await this.repo.manager.query(
          `UPDATE moments SET ai_tags = $1::text[], updated_at = NOW() WHERE id = $2 AND user_id = $3`,
          [tags, job.targetId, job.userId],
        );
        break;
      }
      case 'image-summary': {
        await this.repo.manager.query(
          `UPDATE moments SET ai_summary = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
          [output, job.targetId, job.userId],
        );
        break;
      }
      case 'audio-transcribe': {
        await this.repo.manager.query(
          `UPDATE moments SET transcript = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
          [output, job.targetId, job.userId],
        );
        break;
      }
      case 'memoir-summary': {
        await this.repo.manager.query(
          `UPDATE memoirs SET blurb = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
          [output, job.targetId, job.userId],
        );
        break;
      }
      case 'chapter-summary': {
        await this.repo.manager.query(
          `UPDATE memoir_chapters SET content = $1, updated_at = NOW() WHERE id = $2 AND memoir_id IN (SELECT id FROM memoirs WHERE user_id = $3)`,
          [output, job.targetId, job.userId],
        );
        break;
      }
      case 'event-summary': {
        await this.repo.manager.query(
          `UPDATE events SET summary = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
          [output, job.targetId, job.userId],
        );
        break;
      }
    }
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}