import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LineCard from "./LineCard";

function renderCard(line, compact = false) {
  return render(
    <MemoryRouter>
      <LineCard line={line} compact={compact} />
    </MemoryRouter>
  );
}

const baseLine = {
  id: "family",
  label: "亲情",
  icon: "🏠",
  gradient: "linear-gradient(135deg, #2ec4b6, #6cd6cc)",
  blurb: "家人与成长地",
  count: 3,
  topPeople: [
    { id: "p1", name: "沈棠" },
    { id: "p2", name: "周屿" },
  ],
  topPlace: { id: "pl1", name: "杭州" },
  latestEvent: { id: "e1", date: "2026-06-01", title: "家庭聚餐" },
};

describe("LineCard", () => {
  it("renders label, icon, blurb and count", () => {
    renderCard(baseLine);
    expect(screen.getByText("亲情")).toBeTruthy();
    expect(screen.getByText("🏠")).toBeTruthy();
    expect(screen.getByText("家人与成长地")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("links to /lines/:id", () => {
    const { container } = renderCard(baseLine);
    const link = container.querySelector("a.line-card");
    expect(link.getAttribute("href")).toBe("/lines/family");
  });

  it("shows topPeople chips, topPlace and latestEvent when count > 0", () => {
    renderCard(baseLine);
    expect(screen.getByText("沈棠")).toBeTruthy();
    expect(screen.getByText("周屿")).toBeTruthy();
    expect(screen.getByText("杭州")).toBeTruthy();
    expect(screen.getByText(/2026-06-01 · 家庭聚餐/)).toBeTruthy();
  });

  it("shows empty-state hint when count === 0", () => {
    renderCard({ ...baseLine, count: 0 });
    expect(screen.getByText(/这条线还没有记录/)).toBeTruthy();
    // empty card should not render people / place / latest
    expect(screen.queryByText("沈棠")).toBeNull();
    expect(screen.queryByText("杭州")).toBeNull();
  });

  it("omits topPeople row when array is empty", () => {
    renderCard({ ...baseLine, topPeople: [] });
    expect(screen.queryByText("常出现")).toBeNull();
  });

  it("omits topPlace row when not provided", () => {
    renderCard({ ...baseLine, topPlace: null });
    expect(screen.queryByText("高频地")).toBeNull();
  });

  it("omits latestEvent row when not provided", () => {
    renderCard({ ...baseLine, latestEvent: null });
    expect(screen.queryByText("最近")).toBeNull();
  });

  it("applies is-compact class when compact prop is set", () => {
    const { container } = renderCard(baseLine, true);
    expect(container.querySelector(".line-card.is-compact")).toBeTruthy();
  });

  it("applies is-empty class when count === 0", () => {
    const { container } = renderCard({ ...baseLine, count: 0 });
    expect(container.querySelector(".line-card.is-empty")).toBeTruthy();
  });

  it("exposes an aria-label with label and count", () => {
    renderCard(baseLine);
    expect(screen.getByLabelText("亲情 3 条记忆")).toBeTruthy();
  });

  it("shows a dash for missing latestEvent date", () => {
    renderCard({ ...baseLine, latestEvent: { id: "e1", date: null, title: "无日期" } });
    expect(screen.getByText(/— · 无日期/)).toBeTruthy();
  });
});
