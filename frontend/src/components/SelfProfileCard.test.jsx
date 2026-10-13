import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as fp from '../hooks/useFaceProfile';
import { SelfProfileCard } from './SelfProfileCard';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <MemoryRouter>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

describe('SelfProfileCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state', () => {
    vi.spyOn(fp, 'useFaceMe').mockReturnValue({ data: undefined, isLoading: true });
    render(<SelfProfileCard />, { wrapper: makeWrapper() });
    expect(screen.getByText(/加载中/)).toBeTruthy();
  });

  it('renders my profile info when hasProfile=true', () => {
    vi.spyOn(fp, 'useFaceMe').mockReturnValue({
      data: { userId: 'u1', referenceCount: 3, enabledCount: 3, hasProfile: true },
      isLoading: false,
    });
    render(<SelfProfileCard />, { wrapper: makeWrapper() });
    expect(screen.getByText(/我的画像/)).toBeTruthy();
    expect(screen.getByText(/3 张参考 \/ 3 启用/)).toBeTruthy();
  });

  it('disables 找我的照片 button when hasProfile=false', () => {
    vi.spyOn(fp, 'useFaceMe').mockReturnValue({
      data: { userId: 'u1', referenceCount: 0, enabledCount: 0, hasProfile: false },
      isLoading: false,
    });
    render(<SelfProfileCard />, { wrapper: makeWrapper() });
    const btn = screen.getByText(/找我的照片/).closest('button');
    expect(btn).toBeTruthy();
    expect(btn).toBeDisabled();
  });

  it('keeps 添加参考 button enabled regardless of hasProfile', () => {
    vi.spyOn(fp, 'useFaceMe').mockReturnValue({
      data: { userId: 'u1', referenceCount: 0, enabledCount: 0, hasProfile: false },
      isLoading: false,
    });
    render(<SelfProfileCard />, { wrapper: makeWrapper() });
    const btn = screen.getByText(/添加参考/).closest('button');
    expect(btn).toBeTruthy();
    expect(btn).not.toBeDisabled();
  });
});