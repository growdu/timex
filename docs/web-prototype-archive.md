# Web 原型归档（v0.1）

> **状态**：已归档（2026-06-30）。原 `web-test/` 目录已通过 `git rm -r` 从仓库中删除。

## 背景

`web-test/` 是 timex 项目的 **v0.1 静态原型**，最初 commit
`3b6106b chore: initialize timex prototype repository` 引入。
它是一套高保真静态 HTML+JS 原型：

- 假登录 + 本地测试数据
- 验证"时光机器"在 Web 端的信息架构、叙事结构、页面原型
- 用于早期设计评审 / 用户访谈 / 视觉走查

## 为何归档

- **已被 v1.0 React/Vite SPA 完全取代**（见 `docs/architecture.md`）
- 13 个文件（5 个 HTML + 2 个 JS + 1 个 CSS + 5 个其他），共 ~100 KB
- 维护成本：原型代码会随设计漂移，需要持续同步才能保持文档"准确"
- 损坏的引用：`docs/web-prototype.md` 用了绝对路径
  `/Users/growduduan/ai/timex/web-test`，从未同步

## 替代品

- 当前生产实现见 `frontend/src/pages/*.jsx`（React + Vite SPA）
- 设计规范见 `docs/architecture.md` 第 4 节
- 信息架构原型历史价值可参考 git 提交 `3b6106b` 的快照

## 如何找回（如果需要）

```bash
# 查看归档前的快照
git show 3b6106b -- web-test/ | less

# 临时恢复（仅参考，不建议继续维护）
git checkout 3b6106b -- web-test/
```

## 关联

- [架构文档](./architecture.md) — 当前生产架构
- [变更日志](./changelog.md) — 2026-06-30 归档记录
