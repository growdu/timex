import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DumpCard } from './DumpCard';

function makeWrapper() {
  return ({ children }) => <MemoryRouter>{children}</MemoryRouter>;
}

const sample = {
  id: 'dump-1',
  name: '春游照片',
  description: '顾村公园',
  status: 'processing',
  totalItems: 10,
  doneItems: 4,
  failedItems: 1,
  hitsCount: 3,
};

describe('DumpCard', () => {
  it('renders name, status, hits', () => {
    render(<DumpCard dump={sample} />, { wrapper: makeWrapper() });
    expect(screen.getByText('春游照片')).toBeTruthy();
    expect(screen.getByText('processing')).toBeTruthy();
    expect(screen.getByText(/命中 3/)).toBeTruthy();
  });

  it('shows description when present', () => {
    render(<DumpCard dump={sample} />, { wrapper: makeWrapper() });
    expect(screen.getByText('顾村公园')).toBeTruthy();
  });

  it('does not show remove button when onRemove not provided', () => {
    render(<DumpCard dump={sample} />, { wrapper: makeWrapper() });
    expect(screen.queryByTestId(/dump-remove-/)).toBeNull();
  });

  it('shows remove button when onRemove provided', () => {
    const onRemove = vi.fn();
    render(<DumpCard dump={sample} onRemove={onRemove} />, { wrapper: makeWrapper() });
    expect(screen.getByTestId('dump-remove-dump-1')).toBeTruthy();
  });

  it('returns null when dump is missing', () => {
    const { container } = render(<DumpCard dump={null} />, { wrapper: makeWrapper() });
    expect(container.firstChild).toBeNull();
  });
});
