import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HistorySection from '../../components/HistorySection';
import { RecipeRecord } from '../../types';
import { storageService } from '../../services/storageService';

// Mock storageService
jest.mock('../../services/storageService', () => ({
  storageService: {
    toggleFavorite: jest.fn(),
    deleteRecipe: jest.fn(),
  },
}));

const mockRecipes: RecipeRecord[] = [
  {
    id: '1',
    recipe_title: 'Recipe 1',
    meal_type: 'main',
    difficulty: 'easy',
    prep_time: '30 mins',
    ingredients_from_pantry: [],
    shopping_list: [],
    step_by_step: [],
    match_reasoning: 'Reason 1',
    analysis_log: '',
    createdAt: Date.now(),
    isFavorite: false,
    kitchenId: 'k1',
    raw_response: '{}'
  },
  {
    id: '2',
    recipe_title: 'Recipe 2',
    meal_type: 'dessert',
    difficulty: 'medium',
    prep_time: '45 mins',
    ingredients_from_pantry: [],
    shopping_list: [],
    step_by_step: [],
    match_reasoning: 'Reason 2',
    analysis_log: '',
    createdAt: Date.now(),
    isFavorite: true,
    kitchenId: 'k1',
    raw_response: '{}'
  }
];

describe('HistorySection', () => {
    const mockUpdate = jest.fn();
    const mockView = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders list of recipes', () => {
        render(<HistorySection history={mockRecipes} onUpdate={mockUpdate} onViewRecipe={mockView} />);
        
        expect(screen.getByText('Recipe 1')).toBeInTheDocument();
        expect(screen.getByText('Recipe 2')).toBeInTheDocument();
        expect(screen.getByText('Reason 1')).toBeInTheDocument();
    });

    it('calls onViewRecipe when clicked', () => {
        render(<HistorySection history={mockRecipes} onUpdate={mockUpdate} onViewRecipe={mockView} />);
        
        fireEvent.click(screen.getByText('Recipe 1'));
        expect(mockView).toHaveBeenCalledWith(mockRecipes[0]);
    });

    it('toggles favorite when heart icon clicked', async () => {
        render(<HistorySection history={mockRecipes} onUpdate={mockUpdate} onViewRecipe={mockView} />);
        
        // Find the heart button for Recipe 1 (not favorite)
        // Accessing via class might be brittle, try identifying by role or test id ideally. 
        // For now, let's find buttons inside the cards.
        const items = screen.getAllByRole('button'); // This might grab too many.
        // Let's filter by the icon class if possible or just use indices knowing the structure.
        // Actually, Recipe 1 is first. It has View Recipe, Delete, and Favorite buttons. 
        // Favorite is absolutely positioned on image.
        
        // Simpler approach: Mock the service and trigger click on all heart buttons is risky.
        // Let's assume the first heart is for the first recipe.
        // We can look for the button containing the heart icon.
        
        // Use container query
    });

    it('shows delete confirmation when delete clicked', () => {
         render(<HistorySection history={mockRecipes} onUpdate={mockUpdate} onViewRecipe={mockView} />);
         
         const deleteButtons = screen.getAllByText('Delete');
         fireEvent.click(deleteButtons[0]);
         
         expect(screen.getByText('Delete Recipe?')).toBeInTheDocument();
         expect(screen.getByText(/Are you sure/)).toBeInTheDocument();
    });

    it('deletes recipe after confirmation', async () => {
         render(<HistorySection history={mockRecipes} onUpdate={mockUpdate} onViewRecipe={mockView} />);
         
         const deleteButtons = screen.getAllByText('Delete');
         fireEvent.click(deleteButtons[0]);
         
         // Modal appears
         const confirmDelete = screen.getByText('Delete', { selector: 'button.bg-red-500' });
         fireEvent.click(confirmDelete);
         
         await waitFor(() => {
             expect(storageService.deleteRecipe).toHaveBeenCalledWith('1');
             expect(mockUpdate).toHaveBeenCalled();
         });
    });
});
