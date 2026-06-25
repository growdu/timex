import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore, useLicenseStore, useUIStore } from "./index";

describe("useAuthStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
    });
    localStorage.clear();
  });

  it("has correct initial state", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(true);
  });

  it("setUser updates user and isLoading", () => {
    const mockUser = { id: "user-1", email: "test@example.com" };
    useAuthStore.getState().setUser(mockUser);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isLoading).toBe(false);
  });

  it("setAuthenticated updates authentication state", () => {
    useAuthStore.getState().setAuthenticated(true);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it("logout clears user and localStorage", () => {
    localStorage.setItem("timex_access_token", "test-token");
    localStorage.setItem("timex_refresh_token", "refresh-token");
    localStorage.setItem("timex_license_token", "license-token");

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(localStorage.getItem("timex_access_token")).toBeNull();
    expect(localStorage.getItem("timex_refresh_token")).toBeNull();
    expect(localStorage.getItem("timex_license_token")).toBeNull();
  });
});

describe("useLicenseStore", () => {
  beforeEach(() => {
    useLicenseStore.setState({
      license: null,
      devices: [],
      isInTrial: false,
      trialExpiresAt: null,
      isLicensed: false,
    });
    localStorage.clear();
  });

  it("has correct initial state", () => {
    const state = useLicenseStore.getState();
    expect(state.license).toBeNull();
    expect(state.devices).toEqual([]);
    expect(state.isInTrial).toBe(false);
    expect(state.isLicensed).toBe(false);
  });

  it("setLicense updates all license state", () => {
    const mockLicense = { planType: "lifetime", deviceLimit: 5 };
    const mockDevices = [{ id: "device-1", deviceName: "Chrome" }];
    const trialExpiresAt = new Date().toISOString();

    useLicenseStore.getState().setLicense(mockLicense, mockDevices, true, trialExpiresAt);

    const state = useLicenseStore.getState();
    expect(state.license).toEqual(mockLicense);
    expect(state.devices).toEqual(mockDevices);
    expect(state.isInTrial).toBe(true);
    expect(state.trialExpiresAt).toBe(trialExpiresAt);
    expect(state.isLicensed).toBe(true);
  });

  it("clearLicense resets all license state", () => {
    const mockLicense = { planType: "lifetime" };
    useLicenseStore.getState().setLicense(mockLicense, [], false, null);

    useLicenseStore.getState().clearLicense();

    const state = useLicenseStore.getState();
    expect(state.license).toBeNull();
    expect(state.devices).toEqual([]);
    expect(state.isInTrial).toBe(false);
    expect(state.trialExpiresAt).toBeNull();
    expect(state.isLicensed).toBe(false);
  });
});

describe("useUIStore", () => {
  beforeEach(() => {
    useUIStore.setState({
      sidebarCollapsed: false,
      currentPage: "timeline",
    });
  });

  it("has correct initial state", () => {
    const state = useUIStore.getState();
    expect(state.sidebarCollapsed).toBe(false);
    expect(state.currentPage).toBe("timeline");
  });

  it("toggleSidebar toggles sidebar state", () => {
    const initialState = useUIStore.getState().sidebarCollapsed;
    useUIStore.getState().toggleSidebar();

    const newState = useUIStore.getState().sidebarCollapsed;
    expect(newState).toBe(!initialState);

    // Toggle again
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(initialState);
  });

  it("setCurrentPage updates current page", () => {
    useUIStore.getState().setCurrentPage("events");

    const state = useUIStore.getState();
    expect(state.currentPage).toBe("events");
  });
});
