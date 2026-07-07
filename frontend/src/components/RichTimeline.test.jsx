import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RichTimeline from "./RichTimeline";

function makeApi(overrides = {}) {
  return {
    formatPeople: vi.fn((people) => (people || []).map((p) => p.name)),
    getStageLabel: vi.fn((stage) => stage.toUpperCase()),
    getMediaTotal: vi.fn(() => 5),
    ...overrides,
  };
}

function renderTimeline(events, api) {
  return render(
    <MemoryRouter>
      <RichTimeline events={events} api={api} />
    </MemoryRouter>
  );
}

const events = [
  { id: "e1", title: "毕业典礼", date: "2024-06-30", stage: "student", summary: "告别校园", location: "北京", people: [{ name: "张三" }] },
  { id: "e2", title: "入职第一天", date: "2025-03-01", stage: "first-job", summary: "新的开始", place: { name: "上海" }, people: [{ name: "李四" }, { name: "王五" }] },
  { id: "e3", title: "创业立项", date: "2025-09-15", stage: "maker", place: { name: "杭州" }, people: [] },
];

describe("RichTimeline", () => {
  it("renders empty state when no events", () => {
    renderTimeline([], makeApi());
    expect(screen.getByText("暂无事件")).toBeTruthy();
    expect(screen.getByText("开始记录你生命中的第一段故事。")).toBeTruthy();
  });

  it("sorts events by date descending", () => {
    const { container } = renderTimeline(
      // pass unsorted
      [events[0], events[2], events[1]],
      makeApi()
    );
    const titles = [...container.querySelectorAll(".rich-timeline-card h3")].map((h) => h.textContent);
    expect(titles).toEqual(["创业立项", "入职第一天", "毕业典礼"]);
  });

  it("renders a year marker only when the year changes", () => {
    const { container } = renderTimeline(events, makeApi());
    const markers = [...container.querySelectorAll(".rich-timeline-year")].map((d) => d.textContent);
    // 2025 and 2024 (e2 and e3 share 2025, so only one 2025 marker)
    expect(markers).toEqual(["2025", "2024"]);
  });

  it("links each card to /events/:id", () => {
    const { container } = renderTimeline(events, makeApi());
    const links = [...container.querySelectorAll(".rich-timeline-card")].map((a) => a.getAttribute("href"));
    expect(links).toEqual(["/events/e3", "/events/e2", "/events/e1"]);
  });

  it("uses api.formatPeople and caps to 3 names", () => {
    const api = makeApi();
    const many = [{ id: "e1", title: "t", date: "2025-01-01", stage: "maker", people: [{ name: "a" }, { name: "b" }, { name: "c" }, { name: "d" }] }];
    renderTimeline(many, api);
    expect(api.formatPeople).toHaveBeenCalled();
    const chip = screen.getByText(/👥/);
    expect(chip.textContent).toContain("a、b、c");
    expect(chip.textContent).not.toContain("d");
  });

  it("shows place name from event.location or event.place.name", () => {
    renderTimeline(events, makeApi());
    expect(screen.getByText(/📍 北京/)).toBeTruthy();
    expect(screen.getByText(/📍 上海/)).toBeTruthy();
    expect(screen.getByText(/📍 杭州/)).toBeTruthy();
  });

  it("uses api.getStageLabel when api is provided", () => {
    renderTimeline(events, makeApi());
    expect(screen.getByText("STUDENT")).toBeTruthy();
    expect(screen.getByText("MAKER")).toBeTruthy();
  });

  it("uses api.getMediaTotal for material count chip", () => {
    const api = makeApi();
    renderTimeline(events, api);
    expect(api.getMediaTotal).toHaveBeenCalledTimes(3);
    expect(screen.getAllByText("5 份素材").length).toBe(3);
  });

  it("falls back to raw stage when api is not provided", () => {
    render(
      <MemoryRouter>
        <RichTimeline events={[{ id: "e1", title: "t", date: "2025-01-01", stage: "travel" }]} />
      </MemoryRouter>
    );
    expect(screen.getByText("travel")).toBeTruthy();
  });

  it("shows month-day from date string", () => {
    renderTimeline(
      [{ id: "e1", title: "新年", date: "2025-01-05", stage: "maker" }],
      makeApi()
    );
    expect(screen.getByText("01-05")).toBeTruthy();
  });

  it("does not render people chip when event has no people", () => {
    const { container } = renderTimeline(
      [{ id: "e1", title: "独行", date: "2025-01-01", stage: "maker", people: [] }],
      makeApi()
    );
    expect(container.querySelector(".rich-timeline-meta").textContent).not.toContain("👥");
  });
});
