import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as fx from '../hooks/useExtractFaces';
import { ExtractFaceButton } from './ExtractFaceButton';

describe('ExtractFaceButton', () => {
  it('calls mutate(momentId) on click', () => {
    const mutate = vi.fn();
    const spy = vi.spyOn(fx, 'useExtractFaces').mockReturnValue({ mutate, isPending: false });

    render(<ExtractFaceButton momentId="m1" />);

    fireEvent.click(screen.getByText(/提取人脸/));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith('m1');

    spy.mockRestore();
  });

  it('disables button and shows 提取中… when isPending is true', () => {
    const mutate = vi.fn();
    const spy = vi.spyOn(fx, 'useExtractFaces').mockReturnValue({ mutate, isPending: true });

    render(<ExtractFaceButton momentId="m1" />);

    const btn = screen.getByRole('button', { name: /extract faces/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent('提取中…');

    spy.mockRestore();
  });
});
