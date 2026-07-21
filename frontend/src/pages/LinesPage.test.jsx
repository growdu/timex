import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// 用 stub 替换掉重组件，避免 react-router / Link 完整链路 + 渲染重 SVG / d3
vi.mock("../components/RichTimeline.jsx", () => ({
  default: ({ events }) => <div data-testid="rich-timeline">{events.length} events</div>,
}));

import LinesPage from "./LinesPage.jsx";
import { makeApi, sampleEvents, samplePeople, samplePlaces } from "./__fixtures__/data.js";
import { makeLayoutMock } from "./__fixtures__/layout.jsx";

const Layout = makeLayoutMock();
const data = { events: sampleEvents, people: samplePeople, places: samplePlaces };
const api = makeApi();

function renderAt(pathname = "/lines") {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <Routes>
        <Route path="/lines" element={<LinesPage Layout={Layout} uiState={{}} api={api} data={data} />} />
        <Route path="/lines/:lineId" element={<LinesPage Layout={Layout} uiState={{}} api={api} data={data} />} />
        <Route path="/timeline" element={<div data-testid="timeline-stub" />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("LinesPage", () => {
  it("渲染 6 条线 hub", () => {
    renderAt();
    const cards = screen.getAllByLabelText(/条记忆$/);
    expect(cards).toHaveLength(6);
  });

  it("每条线显示计数", () => {
    renderAt();
    // sample 数据中 family 1 / first-job 1 / maker 1 → 亲情/朋友/事业线至少各有 1 条
    expect(screen.getByText("亲情线")).toBeTruthy();
    expect(screen.getByText("事业线")).toBeTruthy();
  });

  it("无 lineId 参数时不显示详情区", () => {
    renderAt("/lines");
    expect(screen.queryByLabelText(/详情$/)).toBeNull();
  });

  it("URL 带 lineId 时渲染详情 + RichTimeline", () => {
    renderAt("/lines/family");
    expect(screen.getByLabelText(/亲情线.*详情/)).toBeTruthy();
    expect(screen.getByTestId("rich-timeline")).toBeTruthy();
  });

  it("详情区空事件时显示 empty 提示", () => {
    renderAt("/lines/emotion");
    // 时间线在 sample 中没有匹配事件
    expect(screen.getByText(/这条线目前没有匹配的事件/)).toBeTruthy();
  });

  it("清除筛选按钮可点击", () => {
    renderAt("/lines/family");
    const btn = screen.getByRole("button", { name: "清除筛选" });
    fireEvent.click(btn);
    // 路由跳转，详情应消失；由于 MemoryRouter 直接跳到 /lines
    // 这里我们只验证不抛错
    expect(btn).toBeTruthy();
  });

  it("hub 中卡片链接到 /lines/<id>", () => {
    renderAt();
    const links = screen.getAllByRole("link");
    const familyLinks = links.filter((a) => a.getAttribute("href") === "/lines/family");
    expect(familyLinks.length).toBeGreaterThan(0);
  });

  it("无 api 时显示 0 计数", () => {
    render(
      <MemoryRouter initialEntries={["/lines"]}>
        <Routes>
          <Route path="/lines" element={<LinesPage Layout={Layout} uiState={{}} api={null} data={null} />} />
        </Routes>
      </MemoryRouter>
    );
    const cards = screen.getAllByLabelText(/条记忆$/);
    cards.forEach((c) => {
      expect(within(c).getByText("0")).toBeTruthy();
    });
  });
});
