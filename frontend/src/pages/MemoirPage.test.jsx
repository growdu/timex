import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const renderWithProviders = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

// AiActionButton 调真实 AI api，jsdom 跑不动，直接 mock
vi.mock("../components/AiActionButton.jsx", () => ({
  AiActionButton: (props) => <button data-testid="ai-btn" disabled={props.disabled}>{props.label}</button>,
}));

import MemoirPage from "./MemoirPage.jsx";
import { sampleEvents, samplePeople, samplePlaces, sampleMemoirs } from "./__fixtures__/data.js";
import { makeLayoutMock } from "./__fixtures__/layout.jsx";

const Layout = makeLayoutMock();
const data = { events: sampleEvents, people: samplePeople, places: samplePlaces, memoirs: sampleMemoirs };

function renderMemoir(overrides = {}) {
  const props = {
    Layout,
    session: { name: "测试者" },
    uiState: {},
    filteredEvents: sampleEvents,
    setUiState: vi.fn(),
    logout: vi.fn(),
    data,
    ...overrides,
  };
  return renderWithProviders(<MemoryRouter><MemoirPage {...props} /></MemoryRouter>);
}

describe("MemoirPage", () => {
  it("无回忆录时显示空态", () => {
    renderMemoir({ data: { events: [], people: [], places: [], memoirs: [] } });
    expect(screen.getByText("暂无回忆录")).toBeTruthy();
    expect(screen.getByText(/开始创建第一本回忆录吧/)).toBeTruthy();
  });

  it("渲染章节树", () => {
    renderMemoir();
    expect(screen.getByText("章节树")).toBeTruthy();
    const tree = screen.getByText("章节树").closest("section");
    const items = within(tree).getAllByRole("button");
    // 3 个章节按钮
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  it("默认选中第一个章节", () => {
    renderMemoir();
    // 章节 c1 (出生) 是默认章节，AI 按钮 label="AI 生成摘要"
    const aiBtn = screen.getByTestId("ai-btn");
    expect(aiBtn.textContent).toBe("AI 生成摘要");
  });

  it("点击章节切换选中", () => {
    const setUiState = vi.fn();
    renderMemoir({ setUiState });
    // 找到「第一次走路」章节按钮
    const walkingBtn = screen.getByRole("button", { name: /第一次走路/ });
    fireEvent.click(walkingBtn);
    expect(setUiState).toHaveBeenCalledWith({ selectedChapterId: "c2" });
  });

  it("渲染章节编辑器主区", () => {
    renderMemoir();
    expect(screen.getAllByText("出生").length).toBeGreaterThan(0);
    // Chapter Intro / Narrative Blocks 区块
    expect(screen.getByText("Chapter Intro")).toBeTruthy();
    expect(screen.getByText("Narrative Blocks")).toBeTruthy();
  });

  it("右栏显示当前章节状态卡", () => {
    renderMemoir();
    const card = screen.getByText("当前章节状态").closest("section");
    expect(card.textContent).toContain("出生");
  });

  it("右栏显示候选事件库（最多 4 条）", () => {
    renderMemoir();
    const rail = screen.getByText("候选事件库").closest("section");
    // sampleEvents 有 3 条，全部显示
    expect(within(rail).getAllByRole("article").length).toBe(3);
  });

  it("uiState 指定 selectedChapterId 时使用该章节", () => {
    renderMemoir({ uiState: { selectedChapterId: "c3" } });
    // c3 = 北漂篇，应被选中并显示
    expect(screen.getAllByText("北漂篇").length).toBeGreaterThan(0);
  });

  it("layout activeNav=memoir", () => {
    renderMemoir();
    expect(screen.getByTestId("layout").getAttribute("data-active-nav")).toBe("memoir");
  });
});
