import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DumpProgressBar } from './DumpProgressBar';

describe('DumpProgressBar', () => {
  it('shows 0/0 with no segs when total=0', () => {
    render(<DumpProgressBar total={0} done={0} failed={0} />);
    expect(screen.getByText('0/0')).toBeTruthy();
  });

  it('computes pending as total - done - failed', () => {
    // total=10, done=4, failed=1 → pending=5
    // percentage: done 40%, failed 10%, pending 50%
    const { container } = render(
      <DumpProgressBar total={10} done={4} failed={1} />,
    );
    const segs = container.querySelectorAll('.dump-progress-seg');
    expect(segs).toHaveLength(3);
    expect(segs[0]).toHaveClass('done');
    expect(segs[1]).toHaveClass('failed');
    expect(segs[2]).toHaveClass('pending');
    expect(segs[0].style.width).toBe('40%');
    expect(segs[1].style.width).toBe('10%');
    expect(segs[2].style.width).toBe('50%');
    expect(screen.getByText(/失败/)).toBeTruthy();
  });

  it('clamps done+failed to total (pending >= 0)', () => {
    // done=8, failed=5, total=10 → pending clamps to 0
    const { container } = render(
      <DumpProgressBar total={10} done={8} failed={5} />,
    );
    const segs = container.querySelectorAll('.dump-progress-seg');
    expect(segs).toHaveLength(2);
    expect(segs[0]).toHaveClass('done');
    expect(segs[1]).toHaveClass('failed');
  });
});
