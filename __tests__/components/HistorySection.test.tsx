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

jest.mock('@/hooks/useCurrentMember', () => ({
  useCurrentMember: jest.fn().mockReturnValue({ isGuest: false, loading: false })
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
    safety_badge: false
  },
  {
    id: '2',
    recipe_title: 'Recipe 2',
    meal_type: 'dessert',
    difficulty: 'easy',
    prep_time: '45 mins',
    ingredients_from_pantry: [],
    shopping_list: [],
    step_by_step: [],
    match_reasoning: 'Reason 2',
    analysis_log: '',
    createdAt: Date.now(),
    isFavorite: true,
    safety_badge: false
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
    const { container } = render(<HistorySection history={mockRecipes} onUpdate={mockUpdate} onViewRecipe={mockView} />);

    // Find all heart buttons
    const heartIcons = container.querySelectorAll('.fa-heart');
    expect(heartIcons.length).toBeGreaterThan(0);

    const firstBtn = heartIcons[0].closest('button');
    if (firstBtn) {
      fireEvent.click(firstBtn);
      // It calls the service directly inside RecipeCard, so we expect storageService call
      await waitFor(() => expect(storageService.toggleFavorite).toHaveBeenCalledWith('1'));
    }
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
