import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RecipeCard from '../../components/RecipeCard';
import { RecipeRecord } from '../../types';

// Mock dependencies
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

jest.mock('../../services/storageService', () => ({
  storageService: {
    toggleFavorite: jest.fn().mockResolvedValue(undefined),
  },
}));

import { storageService } from '../../services/storageService';

const mockRecipe: RecipeRecord = {
    id: '1',
    recipe_title: 'Test Recipe',
    meal_type: 'main',
    difficulty: 'easy',
    prep_time: '30 mins',
    ingredients_from_pantry: ['Flour'],
    shopping_list: ['Sugar'],
    step_by_step: ['Mix ingredients'],
    match_reasoning: 'Good match',
    analysis_log: 'Log',
    createdAt: Date.now(),
    isFavorite: false,
    kitchenId: 'k1',
    raw_response: '{}'
};

describe('RecipeCard', () => {
    it('renders recipe details correctly', () => {
        render(<RecipeCard recipe={mockRecipe} />);
        
        expect(screen.getByText('Test Recipe')).toBeInTheDocument();
        expect(screen.getByText('Good match')).toBeInTheDocument();
        expect(screen.getByText('Mix ingredients')).toBeInTheDocument();
        expect(screen.getByText('Flour')).toBeInTheDocument();
    });

    it('renders difficulty badge correctly', () => {
        render(<RecipeCard recipe={{...mockRecipe, difficulty: 'chef'}} />);
        expect(screen.getByText('CHEF')).toBeInTheDocument();
    });

    it('calls toggleFavorite when favorite button is clicked', async () => {
        const { container } = render(<RecipeCard recipe={mockRecipe} />);
        
        // Find favorite button by icon class
        const heartIcon = container.querySelector('.fa-heart');
        const btn = heartIcon?.closest('button');
        
        if (btn) {
            fireEvent.click(btn);
            expect(storageService.toggleFavorite).toHaveBeenCalledWith('1');
        } else {
            throw new Error('Favorite button not found');
        }
    });
});
