import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LicensePage from "./LicensePage";

// Mock the licenseApi
vi.mock("../api/license", () => ({
  licenseApi: {
    activate: vi.fn(),
    deactivateDevice: vi.fn(),
    getStatus: vi.fn(),
  },
}));

// Mock the store
vi.mock("../store", () => ({
  useLicenseStore: vi.fn(() => ({
    license: null,
    devices: [],
    isInTrial: false,
    trialExpiresAt: null,
    setLicense: vi.fn(),
    clearLicense: vi.fn(),
  })),
}));

import { licenseApi } from "../api/license";
import { useLicenseStore } from "../store";

describe("LicensePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = { id: "user-1", email: "test@example.com" };

  it("renders license management header", () => {
    render(<LicensePage user={mockUser} />);

    expect(screen.getByText("License 管理")).toBeTruthy();
    expect(screen.getByText("管理您的授权许可和已注册设备")).toBeTruthy();
  });

  it("renders refresh status button", () => {
    render(<LicensePage user={mockUser} />);

    expect(screen.getByText("刷新状态")).toBeTruthy();
  });

  it("shows empty state when no license", () => {
    render(<LicensePage user={mockUser} />);

    expect(screen.getByText("暂无激活的 License")).toBeTruthy();
  });

  it("shows trial notice when in trial", () => {
    useLicenseStore.mockReturnValueOnce({
      license: null,
      devices: [],
      isInTrial: true,
      trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      setLicense: vi.fn(),
      clearLicense: vi.fn(),
    });

    render(<LicensePage user={mockUser} />);

    expect(screen.getByText(/试用版/)).toBeTruthy();
  });

  it("shows license card when license exists", () => {
    useLicenseStore.mockReturnValueOnce({
      license: {
        planType: "lifetime",
        deviceLimit: 5,
        expiresAt: null,
      },
      devices: [],
      isInTrial: false,
      trialExpiresAt: null,
      setLicense: vi.fn(),
      clearLicense: vi.fn(),
    });

    render(<LicensePage user={mockUser} />);

    // Check license card section has 终身版 (the one in license-plan span)
    const licensePlan = screen.getByText("设备限额: 5 台");
    expect(licensePlan).toBeTruthy();
  });

  it("calls getStatus when refresh button is clicked", async () => {
    licenseApi.getStatus.mockResolvedValue({
      activeLicense: null,
      devices: [],
      isInTrial: false,
      trialExpiresAt: null,
    });

    render(<LicensePage user={mockUser} />);

    const refreshButton = screen.getByText("刷新状态");
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(licenseApi.getStatus).toHaveBeenCalled();
    });
  });

  it("shows activation form with input and button", () => {
    render(<LicensePage user={mockUser} />);

    const input = screen.getByPlaceholderText("输入 License Key (如 TIMEX-LIFE-XXXX)");
    expect(input).toBeTruthy();
    expect(screen.getByRole("button", { name: "激活" })).toBeTruthy();
  });

  it("allows user to type license key", () => {
    render(<LicensePage user={mockUser} />);

    const input = screen.getByPlaceholderText("输入 License Key (如 TIMEX-LIFE-XXXX)");
    fireEvent.change(input, { target: { value: "TIMEX-LIFE-ABC123" } });

    expect(input).toHaveValue("TIMEX-LIFE-ABC123");
  });

  it("shows pricing cards for purchase", () => {
    render(<LicensePage user={mockUser} />);

    expect(screen.getByText("终身版")).toBeTruthy();
    expect(screen.getByText("¥499")).toBeTruthy();
    expect(screen.getByText("年费版")).toBeTruthy();
    expect(screen.getByText("¥99/年")).toBeTruthy();
  });

  it("displays device list when devices exist", () => {
    useLicenseStore.mockReturnValueOnce({
      license: { planType: "lifetime", deviceLimit: 5 },
      devices: [
        {
          id: "device-1",
          deviceName: "Chrome Browser",
          lastActiveAt: new Date().toISOString(),
        },
      ],
      isInTrial: false,
      trialExpiresAt: null,
      setLicense: vi.fn(),
      clearLicense: vi.fn(),
    });

    render(<LicensePage user={mockUser} />);

    expect(screen.getByText("Chrome Browser")).toBeTruthy();
    expect(screen.getByText("解绑")).toBeTruthy();
  });
});
