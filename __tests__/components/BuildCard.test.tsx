import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import BuildCard from '@/components/BuildCard';
import { storageService } from '@/services/storageService';
import { useCurrentMember } from '@/hooks/useCurrentMember';

const pushMock = jest.fn();

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt = '', ...props }: { alt?: string }) => <div role="img" aria-label={alt} {...props} />,
}));

jest.mock('@/hooks/useCurrentMember', () => ({
  useCurrentMember: jest.fn(),
}));

jest.mock('@/services/storageService', () => ({
  storageService: {
    toggleBuildFavorite: jest.fn(),
    deleteBuild: jest.fn(),
    addStashItem: jest.fn(),
  },
}));

const mockBuild = {
  id: 'build-1',
  build_title: 'Arc Build',
  recipe_title: 'Arc Build',
  build_reasoning: 'Fast mapper.',
  match_reasoning: 'Fast mapper.',
  build_cost_tier: 'medium',
  setup_time_minutes: 25,
  setup_time: '25m',
  gear_gems: [
    '{"name":"Orb of Alteration","quantity":"2","unit":"x"}',
    { name: '{"name":"Lightning Warp","quantity":"1","unit":"lvl"}' },
    'Invalid JSON item',
  ],
  build_items: [
    '{"name":"Tabula Rasa","quantity":"1","unit":"x"}',
  ],
  build_steps: ['Step 1', { text: 'Step 2' }],
  analysis_log: 'Audit details',
  language: 'pt-BR',
  isFavorite: false,
  image_base64: 'data:image/png;base64,abc',
} as any;

describe('BuildCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCurrentMember as jest.Mock).mockReturnValue({
      member: { role: 'ADMIN' },
      isGuest: false,
      loading: false,
    });
    (storageService.toggleBuildFavorite as jest.Mock).mockResolvedValue(undefined);
    (storageService.deleteBuild as jest.Mock).mockResolvedValue(undefined);
    (storageService.addStashItem as jest.Mock).mockResolvedValue({ id: 'stash-1' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'build-1', build_title: 'Arc Build PT', build_reasoning: 'Traduzido.' }),
    }) as jest.Mock;
    window.alert = jest.fn();
  });

  it('translates build, reverts to original, and redirects when translation persists to new id', async () => {
    const user = userEvent.setup();
    render(<BuildCard build={mockBuild} />);

    const translateButton = screen.getByRole('button', { name: /Translate Build/i });
    await user.click(translateButton);
    await waitFor(() => expect(screen.getByText('Arc Build PT')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Show Original/i }));
    await waitFor(() => expect(screen.getByText('Arc Build')).toBeInTheDocument());

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'build-2', build_title: 'Arc Build EN' }),
    });

    await user.click(screen.getByRole('button', { name: /Translate Build/i }));
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/builds/build-2');
    });
  });

  it('handles translation failure with alert', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

    render(<BuildCard build={mockBuild} />);
    await user.click(screen.getByRole('button', { name: /Translate Build/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('common.error');
    });
  });

  it('toggles favorite and calls onSaved callback; logs on toggle error', async () => {
    const user = userEvent.setup();
    const onSaved = jest.fn();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<BuildCard build={mockBuild} onSaved={onSaved} />);

    await user.click(screen.getByRole('button', { name: /Favorite/i }));
    expect(storageService.toggleBuildFavorite).toHaveBeenCalledWith('build-1');
    expect(onSaved).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Unfavorite/i })).toBeInTheDocument();

    (storageService.toggleBuildFavorite as jest.Mock).mockRejectedValueOnce(new Error('toggle fail'));
    await user.click(screen.getByRole('button', { name: /Unfavorite/i }));
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('Error toggling favorite:', expect.any(Error));
    });
    errorSpy.mockRestore();
  });

  it('deletes build from confirm dialog and handles delete error', async () => {
    const user = userEvent.setup();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<BuildCard build={mockBuild} />);

    await user.click(screen.getByTitle('Delete'));
    await user.click(screen.getByRole('button', { name: 'common.confirm' }));
    await waitFor(() => {
      expect(storageService.deleteBuild).toHaveBeenCalledWith('build-1');
      expect(pushMock).toHaveBeenCalledWith('/builds');
    });

    (storageService.deleteBuild as jest.Mock).mockRejectedValueOnce(new Error('delete fail'));
    await user.click(screen.getByTitle('Delete'));
    await user.click(screen.getByRole('button', { name: 'common.confirm' }));
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('common.error');
      expect(errorSpy).toHaveBeenCalledWith('Failed to delete build', expect.any(Error));
    });
    errorSpy.mockRestore();
  });

  it('opens share menu, closes on outside click, and adds checklist items to stash with all rules', async () => {
    const user = userEvent.setup();
    render(<BuildCard build={mockBuild} />);

    const shareMenuButton = screen
      .getAllByRole('button')
      .find((b) => b.querySelector('.fa-share-alt')) as HTMLButtonElement;
    expect(shareMenuButton).toBeInTheDocument();

    await user.click(shareMenuButton);
    expect(screen.getByText(/Copy to Clipboard/i)).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByText(/Copy to Clipboard/i)).not.toBeInTheDocument();
    });

    const addButtons = screen.getAllByTitle('Add to Checklist');
    await user.click(addButtons[0]);
    expect(screen.getByText(/Add "Tabula Rasa" to List/i)).toBeInTheDocument();
    await user.click(screen.getByText('Always Replenish'));
    await waitFor(() => {
      expect(storageService.addStashItem).toHaveBeenCalledWith('Tabula Rasa', 'ALWAYS', false);
    });

    await user.click(screen.getAllByTitle('Add to Checklist')[0]);
    await user.click(screen.getByText('One Shot'));
    await waitFor(() => {
      expect(storageService.addStashItem).toHaveBeenCalledWith('Tabula Rasa', 'ONE_SHOT', false);
    });

    await user.click(screen.getAllByTitle('Add to Checklist')[0]);
    await user.click(screen.getByText('Just Track'));
    await waitFor(() => {
      expect(storageService.addStashItem).toHaveBeenCalledWith('Tabula Rasa', 'NEVER', false);
    });
  });

  it('renders parsed and fallback item content, and supports guest restrictions', async () => {
    (useCurrentMember as jest.Mock).mockReturnValue({
      member: { role: 'MEMBER' },
      isGuest: true,
      loading: false,
    });

    render(<BuildCard build={mockBuild} />);

    expect(screen.getByText('Orb of Alteration')).toBeInTheDocument();
    expect(screen.getByText('Lightning Warp')).toBeInTheDocument();
    expect(screen.getByText('Invalid JSON item')).toBeInTheDocument();
    expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
    expect(screen.queryByText(/Edit/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle('Add to Checklist')).not.toBeInTheDocument();
  });

  it('uses legacy field fallbacks and avoids duplicate translate requests while loading', async () => {
    let resolveFetch: ((value: any) => void) | undefined;
    const pendingFetch = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    (global.fetch as jest.Mock).mockReturnValueOnce(pendingFetch);

    const legacyBuild = {
      ...mockBuild,
      id: 'legacy-1',
      build_title: '',
      recipe_title: 'Legacy Title',
      build_reasoning: '',
      match_reasoning: 'Legacy Reason',
      build_cost_tier: undefined,
      difficulty: 'cheap',
      setup_time_minutes: undefined,
      prep_time_minutes: 15,
      setup_time: '',
      prep_time: '15m',
      gear_gems: undefined,
      ingredients_from_pantry: [{ name: 'Legacy Wand', quantity: '1', unit: 'x' }],
      build_items: undefined,
      shopping_list: [],
      build_steps: undefined,
      step_by_step: ['Legacy Step'],
      image_base64: '',
      language: 'pt-BR',
    } as any;

    render(<BuildCard build={legacyBuild} />);
    expect(screen.getByText('Legacy Title')).toBeInTheDocument();
    expect(screen.getByText('Legacy Reason')).toBeInTheDocument();
    expect(screen.getByText('15 min')).toBeInTheDocument();
    expect(screen.queryByTestId('recipe-bg-image')).not.toBeInTheDocument();
    expect(screen.getByText('Legacy Wand')).toBeInTheDocument();
    expect(screen.getByText('Legacy Step')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Translate Build/i }));
    fireEvent.click(screen.getByRole('button', { name: /Translating/i }));
    expect(global.fetch).toHaveBeenCalledTimes(1);

    resolveFetch?.({
      ok: true,
      json: async () => ({ id: 'legacy-1', build_title: 'Legacy PT', build_reasoning: 'Translated' }),
    });
    await waitFor(() => expect(screen.getByText('Legacy PT')).toBeInTheDocument());
  });

  it('handles add-to-stash failure and supports closing modal', async () => {
    const user = userEvent.setup();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (storageService.addStashItem as jest.Mock).mockRejectedValueOnce(new Error('stash-fail'));
    (useCurrentMember as jest.Mock).mockReturnValue({
      member: { role: 'MEMBER' },
      isGuest: false,
      loading: false,
    });

    render(<BuildCard build={mockBuild} />);
    expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Edit/i })).toBeInTheDocument();

    await user.click(screen.getAllByTitle('Add to Checklist')[0]);
    await user.click(screen.getByText('Always Replenish'));
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('Error adding to stash:', expect.any(Error));
    });

    await user.click(screen.getAllByTitle('Add to Checklist')[0]);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText(/Add "Tabula Rasa" to List/i)).not.toBeInTheDocument();
    errorSpy.mockRestore();
  });

  it('parses checklist item fallbacks and hides translate when build language already matches', () => {
    const sameLangBuild = {
      ...mockBuild,
      language: 'en',
      build_cost_tier: 'mirror_of_kalandra',
      build_items: [
        'Broken item payload',
        { name: '{"name":"Mirror Shard","quantity":"2","unit":"x"}' },
      ],
    } as any;

    render(<BuildCard build={sameLangBuild} />);

    expect(screen.getByText('Broken item payload')).toBeInTheDocument();
    expect(screen.getByText('Mirror Shard')).toBeInTheDocument();
    expect(screen.getByText('Mirror of Kalandra')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Translate Build/i })).not.toBeInTheDocument();
  });
});
