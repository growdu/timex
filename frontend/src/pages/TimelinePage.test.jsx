import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../components/RichTimeline.jsx", () => ({
  default: ({ events }) => <div data-testid="rich-timeline">{events.length}</div>,
}));
vi.mock("../components/LineCard.jsx", () => ({
  default: ({ line }) => <div data-testid="line-card" data-line-id={line.id}>{line.label}</div>,
}));

import TimelinePage from "./TimelinePage.jsx";
import { makeApi, sampleEvents, samplePeople, samplePlaces, sampleMemoirs } from "./__fixtures__/data.js";
import { makeLayoutMock } from "./__fixtures__/layout.jsx";

const Layout = makeLayoutMock();
const api = makeApi();
const data = { events: sampleEvents, people: samplePeople, places: samplePlaces, memoirs: sampleMemoirs };

function renderTimeline(overrides = {}) {
  const props = {
    Layout,
    session: { name: "测试者" },
    uiState: { stage: "all", year: "all", line: "all" },
    filteredEvents: sampleEvents,
    setUiState: vi.fn(),
    onLogout: vi.fn(),
    api,
    data,
    ...overrides,
  };
  return render(<MemoryRouter><TimelinePage {...props} /></MemoryRouter>);
}

describe("TimelinePage", () => {
  it("空数据时显示欢迎卡片", () => {
    renderTimeline({ filteredEvents: [], data: { events: [], people: [], places: [], memoirs: [] } });
    expect(screen.getByText(/还没有任何事件记录/)).toBeTruthy();
  });

  it("渲染问候横幅", () => {
    renderTimeline();
    expect(screen.getAllByText(/早安|中午好|下午好|晚上好/).length).toBeGreaterThan(0);
  });

  it("显示统计指标卡（事件/地点/人物/素材/回忆录）", () => {
    renderTimeline();
    expect(screen.getByText("Events")).toBeTruthy();
    expect(screen.getByText("Places")).toBeTruthy();
    expect(screen.getByText("People")).toBeTruthy();
    expect(screen.getByText("Media")).toBeTruthy();
    expect(screen.getByText("Memoirs")).toBeTruthy();
  });

  it("渲染横向 SVG 时间线 + tick", () => {
    const { container } = renderTimeline();
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg.getAttribute("aria-label")).toBe("时间线");
  });

  it("SVG 时间线 dot 数 = 事件数", () => {
    const { container } = renderTimeline();
    const dots = container.querySelectorAll(".vt-dot");
    expect(dots.length).toBe(3);
  });

  it("点击 SVG dot 触发 setUiState", () => {
    const setUiState = vi.fn();
    const { container } = renderTimeline({ setUiState });
    const dot = container.querySelector(".vt-dot");
    fireEvent.click(dot);
    expect(setUiState).toHaveBeenCalledWith(expect.objectContaining({ selectedEventId: expect.any(String) }));
  });

  it("渲染 RichTimeline 卡片视图", () => {
    renderTimeline();
    expect(screen.getByTestId("rich-timeline")).toBeTruthy();
  });

  it("渲染 6 条线 hub", () => {
    const { container } = renderTimeline();
    const cards = container.querySelectorAll('[data-testid="line-card"]');
    expect(cards.length).toBe(6);
  });

  it("渲染快速操作链接", () => {
    renderTimeline();
    expect(screen.getByText("新建事件")).toBeTruthy();
    expect(screen.getByText("探索空间")).toBeTruthy();
    expect(screen.getAllByText("关系网络").length).toBeGreaterThan(0);
    expect(screen.getByText("编辑回忆录")).toBeTruthy();
    expect(screen.getByText("授权管理")).toBeTruthy();
  });

  it("点击 SVG dot 选中事件", () => {
    const setUiState = vi.fn();
    const { container } = renderTimeline({ setUiState });
    const dot = container.querySelector(".vt-dot");
    fireEvent.click(dot);
    // selectedEventId / selectedPlaceId / selectedPersonId 都更新
    const call = setUiState.mock.calls[0][0];
    expect(call.selectedEventId).toBeTruthy();
    expect(call.selectedPlaceId).toBeTruthy();
  });

  it("layout activeNav=timeline", () => {
    renderTimeline();
    expect(screen.getByTestId("layout").getAttribute("data-active-nav")).toBe("timeline");
  });
});
