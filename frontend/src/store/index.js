import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('timex_access_token'),
  isLoading: true,

  setUser: (user) => set({ user, isLoading: false }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated, isLoading: false }),
  logout: () => {
    localStorage.removeItem('timex_access_token');
    localStorage.removeItem('timex_refresh_token');
    localStorage.removeItem('timex_license_token');
    set({ user: null, isAuthenticated: false });
  },
}));

export const useLicenseStore = create((set) => ({
  license: null,
  devices: [],
  isInTrial: false,
  trialExpiresAt: null,
  isLicensed: !!localStorage.getItem('timex_license_token'),

  setLicense: (license, devices, isInTrial, trialExpiresAt) =>
    set({ license, devices, isInTrial, trialExpiresAt, isLicensed: true }),
  clearLicense: () => set({ license: null, devices: [], isInTrial: false, trialExpiresAt: null, isLicensed: false }),
}));

export const useUIStore = create((set) => ({
  sidebarCollapsed: false,
  currentPage: 'timeline',
  selectedEventId: null,
  selectedPlaceId: null,
  selectedPersonId: null,
  selectedChapterId: null,
  year: 'all',
  stage: 'all',
  line: 'all',
  search: '',

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setCurrentPage: (page) => set({ currentPage: page }),
  setUiState: (updates) => set((state) => ({ ...state, ...updates })),
  setSelectedEvent: (id) => set({ selectedEventId: id }),
  setSelectedPlace: (id) => set({ selectedPlaceId: id }),
  setSelectedPerson: (id) => set({ selectedPersonId: id }),
  setSelectedChapter: (id) => set({ selectedChapterId: id }),
  resetFilters: () => set({ year: 'all', stage: 'all', line: 'all', search: '' }),
}));