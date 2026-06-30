/**
 * AiActionButton 组件测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../api/ai', () => ({
  aiApi: {
    tagImage: vi.fn(),
    summarizeImage: vi.fn(),
    transcribe: vi.fn(),
    summarizeMemoir: vi.fn(),
    summarizeChapter: vi.fn(),
    summarizeEvent: vi.fn(),
    getJob: vi.fn(),
    listJobs: vi.fn(),
  },
}));

import { aiApi } from '../api/ai';
import { AiActionButton } from '../components/AiActionButton';

describe('AiActionButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows label initially and triggers submit on click', async () => {
    aiApi.summarizeChapter.mockResolvedValueOnce({
      id: 'job-c',
      kind: 'chapter-summary',
      status: 'succeeded',
      output: '这是摘要',
    });

    const onSettled = vi.fn();
    render(
      <AiActionButton
        kind="chapter-summary"
        args={{ chapterId: 'ch-1', text: '...' }}
        label="AI 摘要"
        onSettled={onSettled}
      />,
    );

    const btn = screen.getByRole('button');
    expect(btn.textContent).toContain('AI 摘要');

    fireEvent.click(btn);

    await waitFor(() => {
      expect(btn.textContent).toContain('完成');
    });

    expect(aiApi.summarizeChapter).toHaveBeenCalledWith('ch-1', '...');
    expect(onSettled).toHaveBeenCalled();
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <AiActionButton kind="event-summary" args={{ eventId: 'x', text: '' }} label="x" disabled />,
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
