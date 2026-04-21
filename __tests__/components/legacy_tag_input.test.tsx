import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TagInput } from '@/components/ui/TagInput';

describe('TagInput (unified)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ['Arc', 'Spark'],
    }) as jest.Mock;
  });

  it('adds and removes tags via keyboard', () => {
    const onChange = jest.fn();
    render(
      <TagInput
        tags={['Arc']}
        onChange={onChange}
        placeholder="Add tags"
        category="like"
      />,
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Spark' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['Arc', 'Spark']);

    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('loads suggestions when focused and adds via dropdown', async () => {
    const onChange = jest.fn();
    render(
      <TagInput
        tags={[]}
        onChange={onChange}
        placeholder="Add tags"
        category="dislike"
      />,
    );

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Ar' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/tags?category=dislike&q=Ar');
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Arc' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Spark' })).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Arc' }));
    expect(onChange).toHaveBeenCalledWith(['Arc']);
  });

  it('handles suggestion fetch errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network'));
    const onChange = jest.fn();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <TagInput
        tags={[]}
        onChange={onChange}
        placeholder="Add tags"
        category="restriction"
      />,
    );

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Ar' } });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });
});
