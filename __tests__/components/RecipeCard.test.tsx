import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RecipeCard from '../../components/RecipeCard';
import { RecipeRecord } from '../../types';

// Mock dependencies
// Mock dependencies
jest.mock('next/link', () => {
    const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
        return <a href={href}>{children}</a>;
    };
    MockLink.displayName = 'MockLink';
    return MockLink;
});

jest.mock('../../services/storageService', () => ({
    storageService: {
        toggleFavorite: jest.fn().mockResolvedValue(undefined),
        addPantryItem: jest.fn().mockResolvedValue({ id: '1', name: 'Milk' }),
    },
}));

jest.mock('@/hooks/useCurrentMember', () => ({
    useCurrentMember: jest.fn().mockReturnValue({ isGuest: false, loading: false })
}));

import { storageService } from '../../services/storageService';

const mockRecipe: RecipeRecord = {
    id: '1',
    recipe_title: 'Test Recipe',
    meal_type: 'main',
    difficulty: 'easy',
    prep_time: '30 mins',
    ingredients_from_pantry: [{ name: 'Flour', quantity: '1', unit: 'cup' }],
    shopping_list: [{ name: 'Sugar', quantity: '1', unit: 'cup' }],
    step_by_step: ['Mix ingredients'],
    match_reasoning: 'Good match',
    analysis_log: 'Log',
    createdAt: Date.now(),
    isFavorite: false,
    safety_badge: false
};

import userEvent from '@testing-library/user-event';
import { act } from 'react';

// ... imports ...

describe('RecipeCard', () => {

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    // ... render tests ...
    it('renders recipe details correctly', () => {
        render(<RecipeCard recipe={mockRecipe} />);

        expect(screen.getByText('Test Recipe')).toBeInTheDocument();
        expect(screen.getByText('Good match')).toBeInTheDocument();
        expect(screen.getByText('Mix ingredients')).toBeInTheDocument();
        expect(screen.getByText('Flour')).toBeInTheDocument();
    });

    it('renders difficulty badge correctly', () => {
        render(<RecipeCard recipe={{ ...mockRecipe, difficulty: 'chef' }} />);
        expect(screen.getByText('CHEF')).toBeInTheDocument();
    });

    it('calls toggleFavorite when favorite button is clicked', async () => {
        const { container } = render(<RecipeCard recipe={mockRecipe} />);
        const heartIcon = container.querySelector('.fa-heart');
        const btn = heartIcon?.closest('button');
        if (btn) {
            await act(async () => {
                fireEvent.click(btn);
            });
            expect(storageService.toggleFavorite).toHaveBeenCalledWith('1');
        } else {
            throw new Error('Favorite button not found');
        }
    });

    it('handles error when toggleFavorite fails', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        (storageService.toggleFavorite as jest.Mock).mockRejectedValueOnce(new Error('Failed'));

        const { container } = render(<RecipeCard recipe={mockRecipe} />);
        const btn = container.querySelector('.fa-heart')?.closest('button');

        if (btn) {
            await act(async () => {
                fireEvent.click(btn);
            });
            await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith("Error toggling favorite:", expect.any(Error)));
        }
        consoleSpy.mockRestore();
    });

    it('renders recipe image if provided', () => {
        const recipeWithImg = { ...mockRecipe, image_base64: 'data:image/png;base64,xyz' };
        render(<RecipeCard recipe={recipeWithImg} />);
        const img = screen.getByTestId('recipe-bg-image');
        expect(img).toHaveAttribute('src', 'data:image/png;base64,xyz');
    });

    it('opens share menu and handles copy', async () => {
        jest.useFakeTimers();
        const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
        const recipeWithList = { ...mockRecipe, shopping_list: [{ name: 'Milk', quantity: '1', unit: 'L' }] };

        Object.defineProperty(navigator, 'clipboard', {
            value: {
                writeText: jest.fn().mockImplementation(() => Promise.resolve()),
            },
            configurable: true // Allow re-definition
        });

        render(<RecipeCard recipe={recipeWithList} />);

        const shareIcon = screen.getAllByRole('button').find(b => b.querySelector('.fa-share-alt'));

        if (shareIcon) {
            await user.click(shareIcon);
            expect(screen.getByText('Copy to Clipboard')).toBeInTheDocument();

            await user.click(screen.getByText(/Copy to Clipboard/));
            expect(navigator.clipboard.writeText).toHaveBeenCalled();

            act(() => {
                jest.advanceTimersByTime(100);
            });
            expect(screen.getByText('Copied!')).toBeInTheDocument();
        }
    });

    it('handles adding to pantry', async () => {
        const user = userEvent.setup();
        const recipeWithList = { ...mockRecipe, shopping_list: [{ name: 'Milk', quantity: '1', unit: 'L' }] };
        render(<RecipeCard recipe={recipeWithList} />);

        const addBtns = screen.getAllByTitle('Add to Shopping List');
        await user.click(addBtns[0]);

        expect(screen.getByText(/Add "Milk" to List/)).toBeInTheDocument();

        const alwaysBtn = screen.getByText('Always Replenish').closest('button');
        if (alwaysBtn) {
            await user.click(alwaysBtn);
            await waitFor(() => {
                expect(storageService.addPantryItem).toHaveBeenCalledWith('Milk', 'ALWAYS', false);
            });
        }
    });
});
