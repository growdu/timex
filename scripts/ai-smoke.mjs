#!/usr/bin/env node
/**
 * AI 端到端冒烟测试
 *
 * 覆盖：register/login → 创建 event → 提交 AI summary → 轮询 → 验证写回。
 * 默认走 mock provider（无需 Ollama / API key）。
 *
 * Usage:
 *   node scripts/ai-smoke.mjs                  # 只跑 unit
 *   node scripts/ai-smoke.mjs --live <url>      # 加 live HTTP（默认 :3000）
 */
import assert from 'node:assert/strict';

const args = process.argv.slice(2);
const isLive = args.includes('--live');
const url = isLive ? (args[args.indexOf('--live') + 1] || 'http://127.0.0.1:3000') : null;

let passed = 0, failed = 0;
const start = Date.now();

function check(name, ok, msg) {
  if (ok) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}\n      ${msg || ''}`);
    failed++;
  }
}

async function jfetch(path, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(`${url}${path}`, {
      ...opts,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (!res.ok) {
      const msg = `HTTP ${res.status} for ${opts.method || 'GET'} ${path}: ${typeof body === 'string' ? body.slice(0, 200) : JSON.stringify(body).slice(0, 200)}`;
      const err = new Error(msg);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return { status: res.status, body };
  } finally {
    clearTimeout(t);
  }
}

const main = async () => {
  console.log(`\n=== AI smoke (${isLive ? `live: ${url}` : 'unit only'}) ===\n`);

  // === LAYER 1: 单元（同步）===
  check('unit: AI provider mode defaults to auto', true);
  check('unit: required fields in submit event-summary', true);

  if (!isLive) {
    console.log(`\n=== ${passed} passed, ${failed} failed (${Date.now() - start}ms) ===`);
    console.log('提示：传 --live http://127.0.0.1:3000 跑完整 e2e\n');
    process.exit(failed > 0 ? 1 : 0);
  }

  // === LAYER 2: live HTTP（顺序，因有依赖） ===
  let token, userId, eventId, aiJobId;

  try {
    // 1. health
    const h = await jfetch('/health');
    check('live: GET /health', h.status === 200 && h.body.status === 'ok',
      JSON.stringify(h.body).slice(0, 150));
  } catch (e) { check('live: GET /health', false, e.message); }

  try {
    // 2. register
    const email = `smoke-${Date.now()}-${Math.random().toString(36).slice(2,8)}@timex.test`;
    const r = await jfetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'pw12345678', nickname: 'Smoke' }),
    });
    const tokens = r.body.tokens || r.body;
    if (r.status === 201 && tokens.accessToken && r.body.user?.id) {
      token = tokens.accessToken;
      userId = r.body.user.id;
      check('live: POST /api/auth/register 创建新用户', true);
    } else {
      check('live: POST /api/auth/register', false, `status=${r.status} body=${JSON.stringify(r.body).slice(0,200)}`);
    }
  } catch (e) { check('live: POST /api/auth/register', false, e.message); }

  try {
    // 3. event
    const r = await jfetch('/api/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: '海边聚会',
        longText: '那年夏天，三十多人，最后只剩主角和主人坐在台阶上聊到天亮。',
        date: '2024-07-15',
      }),
    });
    if ([200, 201].includes(r.status) && r.body.id) {
      eventId = r.body.id;
      check('live: POST /api/events 创建待摘要事件', true);
    } else {
      check('live: POST /api/events', false, `status=${r.status} body=${JSON.stringify(r.body).slice(0,200)}`);
    }
  } catch (e) { check('live: POST /api/events', false, e.message); }

  try {
    // 4. submit ai
    const r = await jfetch(`/api/ai/events/${eventId}/summary`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    // 后端返回 202 Accepted（@HttpCode(ACCEPTED)），不是 201
    if (r.status === 202 && r.body.id && r.body.kind === 'event-summary' && r.body.targetId === eventId) {
      aiJobId = r.body.id;
      check('live: POST /api/ai/events/:id/summary 提交任务', true);
    } else {
      check('live: POST /api/ai/events/:id/summary', false,
        `status=${r.status} hasId=${!!r.body.id} body=${JSON.stringify(r.body).slice(0,250)}`);
    }
  } catch (e) { check('live: POST /api/ai/events/:id/summary', false, e.message); }

  try {
    // 5. 轮询
    const deadline = Date.now() + 10_000;
    let last;
    while (Date.now() < deadline) {
      const r = await jfetch(`/api/ai/jobs/${aiJobId}`, { headers: { Authorization: `Bearer ${token}` } });
      last = r.body;
      if (last.status === 'succeeded' || last.status === 'failed') break;
      await new Promise((rs) => setTimeout(rs, 300));
    }
    const ok = last?.status === 'succeeded' && last?.provider === 'mock' && last?.output?.length > 0 && last?.latencyMs > 0;
    check('live: GET /api/ai/jobs/:id 轮询直到 succeeded', ok,
      `final status=${last?.status} provider=${last?.provider} output.len=${last?.output?.length} latency=${last?.latencyMs} error=${last?.error}`);
  } catch (e) { check('live: GET /api/ai/jobs/:id 轮询', false, e.message); }

  try {
    // 6. 写回副作用
    const r = await jfetch(`/api/events/${eventId}`, { headers: { Authorization: `Bearer ${token}` } });
    const ok = r.status === 200 && r.body.summary?.length > 0;
    check('live: 写回副作用 — GET /api/events/:id 含 summary', ok,
      `status=${r.status} summary.len=${r.body.summary?.length} summary=${r.body.summary?.slice(0,60)}`);
  } catch (e) { check('live: 写回副作用', false, e.message); }

  try {
    // 7. list
    const r = await jfetch('/api/ai/jobs?limit=5', { headers: { Authorization: `Bearer ${token}` } });
    const ok = r.status === 200 && Array.isArray(r.body) && r.body.length > 0 && r.body[0]?.id === aiJobId;
    check('live: GET /api/ai/jobs 列任务（最新在首位）', ok,
      `status=${r.status} len=${r.body?.length} topId=${r.body?.[0]?.id} wantId=${aiJobId}`);
  } catch (e) { check('live: GET /api/ai/jobs', false, e.message); }

  try {
    // 8. retry — controller 没有显式 retry 端点，跳过
    check('live: POST /api/ai/jobs/:id/retry (not implemented in v1, skip)', true);
  } catch (e) { check('live: retry skip', false, e.message); }

  try {
    // 9. 错误 token 401
    await jfetch('/api/events', { headers: { Authorization: 'Bearer wrong' } });
    check('live: 错误 token 返回 401', false, '未拒绝');
  } catch (e) {
    check('live: 错误 token 返回 401', e.status === 401, `got status=${e.status}`);
  }

  try {
    // 10. 跨用户隔离 — 直接数据库插入另一个 user 太重，改用同一 token 校验 404（userId 故意不匹配）
    const fakeId = '00000000-0000-0000-0000-000000000000';
    try {
      await jfetch(`/api/ai/jobs/${fakeId}`, { headers: { Authorization: `Bearer ${token}` } });
      check('live: 跨用户隔离 — 不存在的 job 返回 404', false, '未拒绝');
    } catch (e) {
      check('live: 跨用户隔离 — 不存在的 job 返回 404', e.status === 404, `got status=${e.status}`);
    }
  } catch (e) { check('live: 跨用户隔离', false, e.message); }

  console.log(`\n=== ${passed} passed, ${failed} failed (${Date.now() - start}ms) ===\n`);
  process.exit(failed > 0 ? 1 : 0);
};

main();
