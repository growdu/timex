# 代码健康检查

`scripts/health-check.sh` 是项目根目录的统一体检脚本，把 lint / 类型检查 /
测试 / 构建 / 覆盖率聚合成一条命令。

## 用法

```bash
./scripts/health-check.sh           # 全套（lint + typecheck + test + build）
./scripts/health-check.sh fast      # 只跑 lint + typecheck + test
./scripts/health-check.sh coverage  # 只跑覆盖率
./scripts/health-check.sh backend   # 只跑后端
./scripts/health-check.sh frontend  # 只跑前端
./scripts/health-check.sh help      # 帮助
```

## 检查项

| 步骤 | 命令 | 后端 | 前端 |
|------|------|------|------|
| lint | `eslint` strict type-checked (后端) / react + hooks (前端) | ✓ | ✓ |
| typecheck | `tsc --noEmit` | ✓ | — |
| test | `jest` (后端) / `vitest run` (前端) | ✓ | ✓ |
| build | `nest build` (后端) / `vite build` (前端) | ✓ | ✓ |
| coverage | ≥ 50% 阈值检查 | opt | opt |

## 退出码

- `0` 全部通过
- `1` 有失败项
- `2` 参数错误

## CI

GitHub Actions 在 `.github/workflows/ci.yml` 的 `health-check` job
每天凌晨（cron）+ push + PR 时自动跑 full 模式（`./scripts/health-check.sh`）。
lint / typecheck 失败会让 PR 红 ❌。

## 当前已知 warning（非错误）

- 前端 `no-unused-vars` 55 处：技术债，分批清理
- 后端 `main.ts` `no-unsafe-argument` 2 处：装饰器拿 req/res 是 any，无法根除

修改 ESLint 规则时，请同步更新本文档。