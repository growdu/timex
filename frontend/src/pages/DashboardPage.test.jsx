import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// mock 整个 App.jsx，只暴露 useDashboardStats（DashboardPage 唯一依赖）
vi.mock("../App.jsx", () => ({
  useDashboardStats: vi.fn(),
}));

import DashboardPage from "./DashboardPage.jsx";
import { sampleDashboardStats } from "./__fixtures__/data.js";
import { useDashboardStats } from "../App.jsx";

function renderDashboard(overrides = {}) {
  const refetch = vi.fn();
  useDashboardStats.mockReturnValue({
    data: sampleDashboardStats,
    isLoading: false,
    error: null,
    refetch,
    ...overrides,
  });
  return {
    refetch,
    ...render(
      <MemoryRouter><DashboardPage user={{ id: "u1", email: "demo@timex.com", nickname: "演示者" }} logout={vi.fn()} /></MemoryRouter>
    ),
  };
}

describe("DashboardPage", () => {
  it("加载态显示 spinner", () => {
    useDashboardStats.mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: vi.fn() });
    render(<MemoryRouter><DashboardPage user={{ id: "u1" }} logout={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText(/正在加载统计数据/)).toBeTruthy();
  });

  it("错误态显示重试按钮", () => {
    useDashboardStats.mockReturnValue({ data: undefined, isLoading: false, error: new Error("网络挂了"), refetch: vi.fn() });
    render(<MemoryRouter><DashboardPage user={{ id: "u1" }} logout={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText(/统计数据加载失败/)).toBeTruthy();
    const retry = screen.getByRole("button", { name: "重新加载" });
    fireEvent.click(retry);
  });

  it("显示问候横幅 + 用户昵称", () => {
    renderDashboard();
    expect(screen.getByText("演示者的时光档案")).toBeTruthy();
    const greeting = screen.getByText("演示者的时光档案").closest("section");
    expect(greeting.textContent).toMatch(/3\s*个事件/);
    expect(greeting.textContent).toMatch(/4\s*位人物/);
    expect(greeting.textContent).toMatch(/3\s*个地点/);
  });

  it("无昵称时降级用 email 前缀", () => {
    useDashboardStats.mockReturnValue({ data: sampleDashboardStats, isLoading: false, error: null, refetch: vi.fn() });
    render(<MemoryRouter><DashboardPage user={{ email: "alice@example.com" }} logout={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText("alice的时光档案")).toBeTruthy();
  });

  it("完全无 user 时显示「用户」", () => {
    useDashboardStats.mockReturnValue({ data: sampleDashboardStats, isLoading: false, error: null, refetch: vi.fn() });
    render(<MemoryRouter><DashboardPage user={null} logout={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText("用户的时光档案")).toBeTruthy();
  });

  it("显示 5 张统计指标卡", () => {
    renderDashboard();
    expect(screen.getAllByText(/^📅|^👥|^📍|^📸|^📖/).length).toBeGreaterThanOrEqual(5);
  });

  it("渲染时间线分布 + 阶段分布柱状", () => {
    renderDashboard();
    expect(screen.getByText("📊 时间线分布")).toBeTruthy();
    expect(screen.getByText("🎯 阶段分布")).toBeTruthy();
    expect(screen.getByText("2022年")).toBeTruthy();
    expect(screen.getByText("2024年")).toBeTruthy();
  });

  it("渲染最近事件列表", () => {
    renderDashboard();
    expect(screen.getByText("🕐 最近事件")).toBeTruthy();
    expect(screen.getByText("第一次创业路演")).toBeTruthy();
  });

  it("渲染核心人物 / 素材构成 / 回忆录小卡", () => {
    renderDashboard();
    expect(screen.getByText("⭐ 核心人物")).toBeTruthy();
    expect(screen.getByText("🎞 素材构成")).toBeTruthy();
    expect(screen.getAllByText("📖 回忆录").length).toBeGreaterThan(0);
  });

  it("导出区含 3 个入口", () => {
    renderDashboard();
    expect(screen.getByRole("link", { name: /导出相册/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /导出时间线/ })).toBeTruthy();
  });

  it("点击故事书按钮展开回忆录选择", () => {
    renderDashboard();
    const storybookBtn = screen.getByRole("button", { name: /导出故事书/ });
    fireEvent.click(storybookBtn);
    expect(screen.getByText("小满成长记")).toBeTruthy();
  });

  it("defensive: 空 stats 也安全渲染", () => {
    useDashboardStats.mockReturnValue({ data: {}, isLoading: false, error: null, refetch: vi.fn() });
    render(<MemoryRouter><DashboardPage user={{ nickname: "x" }} logout={vi.fn()} /></MemoryRouter>);
    // 不会出现崩溃，且 greeting 仍渲染
    expect(screen.getByText("x的时光档案")).toBeTruthy();
    expect(screen.getAllByText(/暂无数据/).length).toBeGreaterThan(0);
  });
});
