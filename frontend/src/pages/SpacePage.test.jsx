import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// SpaceMap 走 Leaflet，jsdom 没有 canvas / real DOM size，直接 mock
vi.mock("../components/SpaceMap.jsx", () => ({
  default: (props) => <div data-testid="space-map" data-selected={props.selectedPlaceId || ""}>{props.places.length} places</div>,
}));

import SpacePage from "./SpacePage.jsx";
import { makeApi, sampleEvents, samplePeople, samplePlaces } from "./__fixtures__/data.js";
import { makeLayoutMock } from "./__fixtures__/layout.jsx";

const Layout = makeLayoutMock();
const api = makeApi();
const data = { events: sampleEvents, people: samplePeople, places: samplePlaces };

function renderSpace(overrides = {}) {
  const props = {
    Layout,
    session: { name: "测试者" },
    uiState: { stage: "all", year: "all", line: "all" },
    filteredEvents: sampleEvents,
    setUiState: vi.fn(),
    onLogout: vi.fn(),
    logout: vi.fn(),
    api,
    selectedPlace: samplePlaces[0],
    data,
    ...overrides,
  };
  return render(<MemoryRouter><SpacePage {...props} /></MemoryRouter>);
}

describe("SpacePage", () => {
  it("无 selectedPlace 时显示空态", () => {
    renderSpace({ selectedPlace: null });
    expect(screen.getByText("暂无地点")).toBeTruthy();
    expect(screen.getByText("您还没有任何地点记录。")).toBeTruthy();
  });

  it("选中地点时渲染概览面板", () => {
    renderSpace();
    expect(screen.getByText("北京 的场所记忆")).toBeTruthy();
  });

  it("显示选中地点的统计指标", () => {
    renderSpace();
    expect(screen.getByText("首次出现")).toBeTruthy();
    expect(screen.getByText("最近出现")).toBeTruthy();
  });

  it("渲染 SpaceMap 组件", () => {
    renderSpace();
    const map = screen.getByTestId("space-map");
    expect(map).toBeTruthy();
    expect(map.getAttribute("data-selected")).toBe("p1");
  });

  it("显示地点排行（按事件数倒序）", () => {
    renderSpace();
    const ranking = screen.getByText("地点排行").closest("section");
    const items = within(ranking).getAllByRole("listitem");
    expect(items.length).toBe(3);
  });

  it("只显示选中地点的相关事件", () => {
    renderSpace();
    // selectedPlace=北京(p1)，只有小雨出生属于该地点
    expect(screen.getByText("小雨出生")).toBeTruthy();
    expect(screen.queryByText("与老同学相聚")).toBeNull();
    expect(screen.queryByText("第一次创业路演")).toBeNull();
  });

  it("显示事件卡片包含详情链接", () => {
    renderSpace();
    const detailLinks = screen.getAllByRole("link", { name: "查看详情" });
    expect(detailLinks.length).toBeGreaterThan(0);
  });

  it("无相关事件时显示空提示", () => {
    // 选中杭州 (p2)，但筛选条件下没有该地点的事件
    renderSpace({ selectedPlace: samplePlaces[1], filteredEvents: [] });
    expect(screen.getByText("该地点暂无相关事件")).toBeTruthy();
  });

  it("点击排行项切换 selectedPlaceId", () => {
    const setUiState = vi.fn();
    renderSpace({ setUiState });
    // 找到排行里的杭州按钮
    const buttons = screen.getAllByRole("button", { name: "杭州" });
    const hangzhouBtn = buttons[0];
    fireEvent.click(hangzhouBtn);
    expect(setUiState).toHaveBeenCalled();
    const call = setUiState.mock.calls[0][0];
    expect(call.selectedPlaceId).toBe("p2");
  });

  it("Layout 接收 activeNav=space", () => {
    renderSpace();
    expect(screen.getByTestId("layout").getAttribute("data-active-nav")).toBe("space");
  });
});
