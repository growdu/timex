import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FabStack from "./FabStack";

function renderFab() {
  return render(
    <MemoryRouter>
      <FabStack />
    </MemoryRouter>
  );
}

describe("FabStack", () => {
  it("renders the mood widget with a label", () => {
    renderFab();
    expect(screen.getByText(/今日心情/)).toBeTruthy();
  });

  it("starts with the menu closed and aria-expanded false", () => {
    renderFab();
    const btn = screen.getByRole("button", { name: /打开快捷菜单/ });
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("新建事件")).toBeNull();
  });

  it("opens the menu on click and shows all 5 quick links", () => {
    renderFab();
    const btn = screen.getByRole("button", { name: /打开快捷菜单/ });
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("新建事件")).toBeTruthy();
    expect(screen.getByText("写章节")).toBeTruthy();
    expect(screen.getByText("探索空间")).toBeTruthy();
    expect(screen.getByText("关系网络")).toBeTruthy();
    expect(screen.getByText("按线查看")).toBeTruthy();
  });

  it("changes the button label and aria-label when open", () => {
    renderFab();
    const btn = screen.getByRole("button", { name: /打开快捷菜单/ });
    fireEvent.click(btn);
    expect(btn.textContent).toBe("×");
    expect(btn.getAttribute("aria-label")).toBe("关闭快捷菜单");
  });

  it("closes the menu when the toggle is clicked again", () => {
    renderFab();
    const btn = screen.getByRole("button", { name: /打开快捷菜单/ });
    fireEvent.click(btn); // open
    fireEvent.click(btn); // close
    expect(screen.queryByText("新建事件")).toBeNull();
    expect(btn.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes the menu after clicking a quick link", () => {
    renderFab();
    fireEvent.click(screen.getByRole("button", { name: /打开快捷菜单/ }));
    fireEvent.click(screen.getByText("写章节"));
    expect(screen.queryByText("写章节")).toBeNull();
  });

  it("quick links point to the correct routes", () => {
    const { container } = renderFab();
    fireEvent.click(screen.getByRole("button", { name: /打开快捷菜单/ }));
    const hrefs = [...container.querySelectorAll(".fab-menu-item")].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/timeline", "/memoir", "/space", "/people", "/lines"]);
  });
});
