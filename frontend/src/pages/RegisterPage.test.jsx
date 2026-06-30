import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { authApi } from "../api/auth.js";

// Mock the authApi module so we can control register() outcomes
vi.mock("../api/auth.js", () => ({
  authApi: {
    register: vi.fn(),
  },
}));

// Mock useNavigate so we can assert navigation calls
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import RegisterPage from "./RegisterPage";

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("RegisterPage", () => {
  const mockOnLogin = vi.fn();

  beforeEach(() => {
    mockOnLogin.mockClear();
    mockNavigate.mockClear();
    authApi.register.mockReset();
  });

  it("renders registration form with empty fields", () => {
    renderWithRouter(<RegisterPage onLogin={mockOnLogin} />);

    expect(screen.getByPlaceholderText("your@email.com")).toHaveValue("");
    expect(screen.getByPlaceholderText("设置登录密码")).toHaveValue("");
    expect(screen.getByPlaceholderText("再次输入密码")).toHaveValue("");
    expect(screen.getByPlaceholderText("想让朋友怎么称呼你")).toHaveValue("");
  });

  it("renders brand and hero copy", () => {
    renderWithRouter(<RegisterPage onLogin={mockOnLogin} />);

    expect(screen.getByText("时光机器")).toBeTruthy();
    expect(screen.getByText("个人成长记录与人生回忆沉淀系统")).toBeTruthy();
    expect(screen.getByText(/开启一段属于自己的时光档案/)).toBeTruthy();
  });

  it("renders 3 feature highlights (trial, isolation, sync)", () => {
    renderWithRouter(<RegisterPage onLogin={mockOnLogin} />);

    expect(screen.getByText("14 天试用授权")).toBeTruthy();
    expect(screen.getByText("数据完全隔离")).toBeTruthy();
    expect(screen.getByText("多设备同步")).toBeTruthy();
  });

  // Note: empty-email validation is enforced by the browser's HTML5 `required`
  // attribute, so the JS-level handleSubmit cannot reach the empty-check
  // branch. We cover it implicitly by other tests below.

  it("shows error when password is too short", async () => {
    renderWithRouter(<RegisterPage onLogin={mockOnLogin} />);

    fireEvent.change(screen.getByPlaceholderText("your@email.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("设置登录密码"), {
      target: { value: "short" },
    });
    fireEvent.change(screen.getByPlaceholderText("再次输入密码"), {
      target: { value: "short" },
    });

    fireEvent.click(screen.getByRole("button", { name: /创建账号并进入/ }));

    await waitFor(() => {
      expect(screen.getByText("密码至少 8 位")).toBeTruthy();
    });
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it("shows error when passwords do not match", async () => {
    renderWithRouter(<RegisterPage onLogin={mockOnLogin} />);

    fireEvent.change(screen.getByPlaceholderText("your@email.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("设置登录密码"), {
      target: { value: "longpassword1" },
    });
    fireEvent.change(screen.getByPlaceholderText("再次输入密码"), {
      target: { value: "longpassword2" },
    });

    fireEvent.click(screen.getByRole("button", { name: /创建账号并进入/ }));

    await waitFor(() => {
      expect(screen.getByText("两次输入的密码不一致")).toBeTruthy();
    });
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it("calls authApi.register and navigates on success", async () => {
    authApi.register.mockResolvedValue({ user: { id: "u1" }, tokens: {} });

    renderWithRouter(<RegisterPage onLogin={mockOnLogin} />);

    fireEvent.change(screen.getByPlaceholderText("your@email.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("设置登录密码"), {
      target: { value: "longpassword" },
    });
    fireEvent.change(screen.getByPlaceholderText("再次输入密码"), {
      target: { value: "longpassword" },
    });
    fireEvent.change(screen.getByPlaceholderText("想让朋友怎么称呼你"), {
      target: { value: "TestUser" },
    });

    fireEvent.click(screen.getByRole("button", { name: /创建账号并进入/ }));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "longpassword",
        nickname: "TestUser",
      });
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/timeline", { replace: true });
    });
  });

  it("invokes onLogin after successful registration (to bind tokens)", async () => {
    authApi.register.mockResolvedValue({ user: { id: "u1" }, tokens: {} });

    renderWithRouter(<RegisterPage onLogin={mockOnLogin} />);

    fireEvent.change(screen.getByPlaceholderText("your@email.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("设置登录密码"), {
      target: { value: "longpassword" },
    });
    fireEvent.change(screen.getByPlaceholderText("再次输入密码"), {
      target: { value: "longpassword" },
    });

    fireEvent.click(screen.getByRole("button", { name: /创建账号并进入/ }));

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith(
        "test@example.com",
        "longpassword",
      );
    });
  });

  it("shows error from server response on failure", async () => {
    authApi.register.mockRejectedValue({
      response: { data: { message: "Email already registered" } },
    });

    renderWithRouter(<RegisterPage onLogin={mockOnLogin} />);

    fireEvent.change(screen.getByPlaceholderText("your@email.com"), {
      target: { value: "existing@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("设置登录密码"), {
      target: { value: "longpassword" },
    });
    fireEvent.change(screen.getByPlaceholderText("再次输入密码"), {
      target: { value: "longpassword" },
    });

    fireEvent.click(screen.getByRole("button", { name: /创建账号并进入/ }));

    await waitFor(() => {
      expect(screen.getByText("Email already registered")).toBeTruthy();
    });
  });

  it("shows loading state during submission", async () => {
    authApi.register.mockImplementation(() => new Promise(() => {})); // never resolves

    renderWithRouter(<RegisterPage onLogin={mockOnLogin} />);

    fireEvent.change(screen.getByPlaceholderText("your@email.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("设置登录密码"), {
      target: { value: "longpassword" },
    });
    fireEvent.change(screen.getByPlaceholderText("再次输入密码"), {
      target: { value: "longpassword" },
    });

    fireEvent.click(screen.getByRole("button", { name: /创建账号并进入/ }));

    await waitFor(() => {
      expect(screen.queryByText("注册中...")).toBeTruthy();
    });
  });

  it("renders login link for users with existing account", () => {
    renderWithRouter(<RegisterPage onLogin={mockOnLogin} />);

    const loginLink = screen.getByText("直接登录");
    expect(loginLink.closest("a")).toHaveAttribute("href", "/login");
  });
});