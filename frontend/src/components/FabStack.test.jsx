import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FabStack from "./FabStack";

function renderFab(props = {}) {
  return render(
    <MemoryRouter>
      <FabStack onAddEntity={vi.fn()} {...props} />
    </MemoryRouter>
  );
}

describe("FabStack", () => {
  it("菜单初始关闭 + aria-expanded=false", () => {
    renderFab();
    const btn = screen.getByRole("button", { name: "打开添加菜单" });
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("新建事件")).toBeNull();
  });

  it("点击打开菜单 + aria-expanded=true", () => {
    renderFab();
    const btn = screen.getByRole("button", { name: "打开添加菜单" });
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("新建事件")).toBeTruthy();
    expect(screen.getByText("添加地点")).toBeTruthy();
    expect(screen.getByText("添加人物")).toBeTruthy();
    expect(screen.getByText("创建回忆录")).toBeTruthy();
  });

  it("打开后按钮文案变 × 且 aria-label 变为关闭菜单", () => {
    renderFab();
    const btn = screen.getByRole("button", { name: "打开添加菜单" });
    fireEvent.click(btn);
    expect(btn.textContent).toBe("×");
    expect(btn.getAttribute("aria-label")).toBe("关闭菜单");
  });

  it("再点关闭按钮恢复初始态", () => {
    renderFab();
    const btn = screen.getByRole("button", { name: "打开添加菜单" });
    fireEvent.click(btn);
    const closeBtn = screen.getByRole("button", { name: "关闭菜单" });
    fireEvent.click(closeBtn);
    expect(screen.queryByText("新建事件")).toBeNull();
    expect(btn.getAttribute("aria-expanded")).toBe("false");
  });

  it("点击菜单项触发 onAddEntity(type) + 自动关闭", () => {
    const onAdd = vi.fn();
    renderFab({ onAddEntity: onAdd });
    fireEvent.click(screen.getByRole("button", { name: "打开添加菜单" }));
    fireEvent.click(screen.getByText("新建事件"));
    expect(onAdd).toHaveBeenCalledWith("event");
    expect(screen.queryByText("新建事件")).toBeNull();
  });

  it("点击不同菜单项传递对应 type", () => {
    const onAdd = vi.fn();
    renderFab({ onAddEntity: onAdd });
    fireEvent.click(screen.getByRole("button", { name: "打开添加菜单" }));
    fireEvent.click(screen.getByText("添加地点"));
    expect(onAdd).toHaveBeenCalledWith("place");

    fireEvent.click(screen.getByRole("button", { name: "打开添加菜单" }));
    fireEvent.click(screen.getByText("添加人物"));
    expect(onAdd).toHaveBeenCalledWith("person");

    fireEvent.click(screen.getByRole("button", { name: "打开添加菜单" }));
    fireEvent.click(screen.getByText("创建回忆录"));
    expect(onAdd).toHaveBeenCalledWith("memoir");
  });

  it("菜单 role=menu，菜单项 role=menuitem", () => {
    renderFab();
    fireEvent.click(screen.getByRole("button", { name: "打开添加菜单" }));
    expect(screen.getByRole("menu")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /新建事件|添加地点|添加人物|创建回忆录/ }).length).toBe(4);
  });
});
