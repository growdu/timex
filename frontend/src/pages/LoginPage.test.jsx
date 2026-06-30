import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "./LoginPage";

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("LoginPage", () => {
  const mockOnLogin = vi.fn();

  beforeEach(() => {
    mockOnLogin.mockClear();
  });

  it("renders login form with default demo credentials", () => {
    renderWithRouter(<LoginPage onLogin={mockOnLogin} />);

    expect(screen.getByPlaceholderText("your@email.com")).toHaveValue("demo@timex.com");
    expect(screen.getByPlaceholderText("Enter password")).toHaveValue("demo123");
  });

  it("renders brand and feature sections", () => {
    renderWithRouter(<LoginPage onLogin={mockOnLogin} />);

    expect(screen.getByText("时光机器")).toBeTruthy();
    expect(screen.getByText("个人成长记录与人生回忆沉淀系统")).toBeTruthy();
    expect(screen.getByText("记录你的成长，沉淀你的回忆。")).toBeTruthy();
  });

  it("renders demo account button", () => {
    renderWithRouter(<LoginPage onLogin={mockOnLogin} />);

    expect(screen.getByText(/demo · 时光记录者/)).toBeTruthy();
  });

  it("calls onLogin with credentials when form is submitted", () => {
    renderWithRouter(<LoginPage onLogin={mockOnLogin} />);

    const submitButton = screen.getByRole("button", { name: "登录" });
    fireEvent.click(submitButton);

    expect(mockOnLogin).toHaveBeenCalledWith("demo@timex.com", "demo123");
  });

  it("allows user to change email", () => {
    renderWithRouter(<LoginPage onLogin={mockOnLogin} />);

    const emailInput = screen.getByPlaceholderText("your@email.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    expect(emailInput).toHaveValue("test@example.com");
  });

  it("allows user to change password", () => {
    renderWithRouter(<LoginPage onLogin={mockOnLogin} />);

    const passwordInput = screen.getByPlaceholderText("Enter password");
    fireEvent.change(passwordInput, { target: { value: "newpassword" } });

    expect(passwordInput).toHaveValue("newpassword");
  });

  it("shows loading state when submitting", async () => {
    mockOnLogin.mockImplementation(() => new Promise(() => {}));
    renderWithRouter(<LoginPage onLogin={mockOnLogin} />);

    const submitButton = screen.getByRole("button", { name: "登录" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText("登录中...")).toBeTruthy();
    });
  });

  it("shows error message when login fails", async () => {
    mockOnLogin.mockRejectedValue(new Error("Invalid credentials"));
    renderWithRouter(<LoginPage onLogin={mockOnLogin} />);

    const submitButton = screen.getByRole("button", { name: "登录" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeTruthy();
    });
  });

  it("demo account button fills in demo credentials", () => {
    renderWithRouter(<LoginPage onLogin={mockOnLogin} />);

    fireEvent.click(screen.getByText(/demo · 时光记录者/));

    expect(screen.getByPlaceholderText("your@email.com")).toHaveValue("demo@timex.com");
    expect(screen.getByPlaceholderText("Enter password")).toHaveValue("demo123");
  });
});
