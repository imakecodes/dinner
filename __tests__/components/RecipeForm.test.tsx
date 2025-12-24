import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RecipeForm from '../../components/RecipeForm';
import { RecipeRecord } from '../../types';

// Mock types
const mockRecipe: any = {
    recipe_title: 'Test Recipe',
    meal_type: 'main',
    difficulty: 'easy',
    prep_time: '30 mins',
    ingredients_from_pantry: [{ name: 'Ingredient 1', quantity: '1', unit: 'cup' }],
    shopping_list: [],
    step_by_step: ['Step 1'],
};

describe('RecipeForm', () => {
    const mockSubmit = jest.fn();

    beforeEach(() => {
        mockSubmit.mockClear();
    });

    it('renders the form with initial data', () => {
        render(<RecipeForm initialData={mockRecipe} onSubmit={mockSubmit} isSubmitting={false} title="Edit Recipe" />);
        
        expect(screen.getByDisplayValue('Test Recipe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('30 mins')).toBeInTheDocument();
        expect(screen.getByText(/Ingredient 1/)).toBeInTheDocument();
    });

    it('renders empty form with default values', () => {
        render(<RecipeForm onSubmit={mockSubmit} isSubmitting={false} title="Create Recipe" />);
        
        expect(screen.getByPlaceholderText("Recipe Title (e.g. Mom's Lasagna)")).toHaveValue('');
        expect(screen.getByText('Main Course')).toBeInTheDocument();
    });

    it('calls onSubmit with form data', () => {
        render(<RecipeForm onSubmit={mockSubmit} isSubmitting={false} title="Create Recipe" />);
        
        fireEvent.change(screen.getByPlaceholderText("Recipe Title (e.g. Mom's Lasagna)"), { target: { value: 'New Recipe' } });
        fireEvent.click(screen.getByText('Save Recipe'));
        
        expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({
            recipe_title: 'New Recipe'
        }));
    });

    it('adds an ingredient to the list', () => {
        render(<RecipeForm onSubmit={mockSubmit} isSubmitting={false} title="Create Recipe" />);
        
        const nameInput = screen.getByPlaceholderText('Ingredient Name');
        fireEvent.change(nameInput, { target: { value: 'New Ingredient' } });
        fireEvent.change(screen.getAllByPlaceholderText('Qty')[0], { target: { value: '2' } });
        fireEvent.change(screen.getAllByPlaceholderText('Unit')[0], { target: { value: 'kg' } });
        
        // Find the specific add button for ingredients (the first one)
        const addButtons = screen.getAllByText('Add');
        fireEvent.click(addButtons[0]);
        
        expect(screen.getByText(/2 kg New Ingredient/)).toBeInTheDocument();
    });

    it('adds a step', () => {
        render(<RecipeForm onSubmit={mockSubmit} isSubmitting={false} title="Create Recipe" />);
        
        fireEvent.click(screen.getByText('+ Add Step'));
        
        const steps = screen.getAllByPlaceholderText(/Step .* instructions/);
        expect(steps).toHaveLength(2); // Initial 1 + new 1
    });
});
