import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../components/RelationshipGraph.jsx", () => ({
  default: ({ people, events, selectedPersonId }) => (
    <div data-testid="relationship-graph" data-selected={selectedPersonId || ""}>
      {people.length} people / {events.length} events
    </div>
  ),
}));

import PeoplePage from "./PeoplePage.jsx";
import { makeApi, sampleEvents, samplePeople, samplePlaces } from "./__fixtures__/data.js";
import { makeLayoutMock } from "./__fixtures__/layout.jsx";

const Layout = makeLayoutMock();
const api = makeApi();
const data = { events: sampleEvents, people: samplePeople, places: samplePlaces };

function renderPeople(overrides = {}) {
  const props = {
    Layout,
    session: { name: "测试者" },
    uiState: { stage: "all" },
    filteredEvents: sampleEvents,
    setUiState: vi.fn(),
    logout: vi.fn(),
    api,
    selectedPerson: samplePeople[0],
    data,
    ...overrides,
  };
  return render(<MemoryRouter><PeoplePage {...props} /></MemoryRouter>);
}

describe("PeoplePage", () => {
  it("无 selectedPerson 时显示空态", () => {
    renderPeople({ selectedPerson: null });
    expect(screen.getByText("暂无人物")).toBeTruthy();
    expect(screen.getByText("您还没有任何人物记录。")).toBeTruthy();
  });

  it("渲染关系图", () => {
    renderPeople();
    const graph = screen.getByTestId("relationship-graph");
    expect(graph).toBeTruthy();
    expect(graph.getAttribute("data-selected")).toBe("u1");
    expect(graph.textContent).toContain("4 people");
  });

  it("显示人物概览 + 详情指标", () => {
    renderPeople();
    expect(screen.getByText("我 与你的共同记忆")).toBeTruthy();
    expect(screen.getAllByText("首次出现").length).toBeGreaterThan(0);
    expect(screen.getAllByText("最近一次").length).toBeGreaterThan(0);
  });

  it("右栏显示共同地点", () => {
    renderPeople();
    expect(screen.getByText(/的共同地点/)).toBeTruthy();
  });

  it("右栏显示适合写一章的片段", () => {
    renderPeople();
    expect(screen.getByText("适合写成一章的片段")).toBeTruthy();
  });

  it("列出与该人物的共享事件", () => {
    renderPeople();
    // 我 出现在 e1 (小雨出生) 和 e3 (创业路演)
    const sharedCard = screen.getByText(/与 .* 相关的时间线/);
    expect(sharedCard).toBeTruthy();
    expect(screen.getAllByText("小雨出生").length).toBeGreaterThan(0);
    expect(screen.getAllByText("第一次创业路演").length).toBeGreaterThan(0);
  });

  it("点击其他人物 chip 切换选中", () => {
    const setUiState = vi.fn();
    renderPeople({ setUiState });
    // People Nodes 区显示所有人物按钮
    const xiaoliBtn = screen.getAllByRole("button", { name: "小李" })[0];
    fireEvent.click(xiaoliBtn);
    expect(setUiState).toHaveBeenCalledWith({ selectedPersonId: "p3" });
  });

  it("当前选中的人物 chip 高亮", () => {
    renderPeople();
    // 我 按钮应带 is-active
    const meBtn = screen.getAllByRole("button", { name: "我" })[0];
    expect(meBtn.className).toContain("is-active");
  });

  it("layout activeNav=people", () => {
    renderPeople();
    expect(screen.getByTestId("layout").getAttribute("data-active-nav")).toBe("people");
  });

  it("进入人物详情页链接", () => {
    renderPeople();
    expect(screen.getByRole("link", { name: /进入人物详情页/ })).toBeTruthy();
  });
});
