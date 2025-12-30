import { render, screen, fireEvent } from '@testing-library/react';
import RecipeForm from '../../components/RecipeForm';

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

    it('removes an ingredient', () => {
        render(<RecipeForm onSubmit={mockSubmit} isSubmitting={false} title="Create Recipe" />);

        // Add one first
        const nameInput = screen.getByPlaceholderText('Ingredient Name');
        fireEvent.change(nameInput, { target: { value: 'To Remove' } });
        fireEvent.change(screen.getAllByPlaceholderText('Qty')[0], { target: { value: '1' } });
        fireEvent.change(screen.getAllByPlaceholderText('Unit')[0], { target: { value: 'cup' } });
        fireEvent.click(screen.getAllByText('Add')[0]);

        expect(screen.getByText(/1 cup To Remove/)).toBeInTheDocument();

        // Find remove button (red X)
        const removeBtn = screen.getByText(/To Remove/).closest('li')?.querySelector('button');
        if (removeBtn) {
            fireEvent.click(removeBtn);
            expect(screen.queryByText(/1 cup To Remove/)).not.toBeInTheDocument();
        } else {
            throw new Error('Remove button not found');
        }
    });

    it('submits form with correct data', () => {
        render(<RecipeForm onSubmit={mockSubmit} isSubmitting={false} title="Create Recipe" />);

        fireEvent.change(screen.getByLabelText('Recipe Title'), { target: { value: 'My Recipe' } });

        // Add step text
        const stepInput = screen.getByPlaceholderText(/Step 1 instructions/);
        fireEvent.change(stepInput, { target: { value: 'Mix it' } });

        fireEvent.click(screen.getByText('Save Recipe'));

        expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({
            recipe_title: 'My Recipe',
            step_by_step: ['Mix it']
        }));
    });

    it('manages shopping list items', () => {
        render(<RecipeForm onSubmit={mockSubmit} isSubmitting={false} title="Create Recipe" />);

        // Find shopping list inputs. They have placeholders Qty, Unit, Item Name
        // Since there are multiple Qty/Unit inputs (one set for ingredients, one for shopping), use index or container
        // Shopping list is the second section.
        const qtyInputs = screen.getAllByPlaceholderText('Qty');
        const unitInputs = screen.getAllByPlaceholderText('Unit');
        const nameInputs = screen.getAllByPlaceholderText('Item Name');

        // Index 1 is for shopping list (Index 0 is ingredients)
        fireEvent.change(qtyInputs[1], { target: { value: '1' } });
        fireEvent.change(unitInputs[1], { target: { value: 'box' } });

        // Item Name is unique to Shopping List (Ingredients use "Ingredient Name")
        // So nameInputs will have only 1 element (or more if list has items?)
        // The list rendering doesn't use input for display, it uses <span>.
        // So only the "Add new" row has input.
        // So nameInputs has length 1.
        fireEvent.change(nameInputs[0], { target: { value: 'Pasta' } }); // Use index 0

        const addBtns = screen.getAllByText('Add');
        fireEvent.click(addBtns[1]); // Second Add button

        expect(screen.getByText(/1 box Pasta/)).toBeInTheDocument();

        // Remove it
        const removeBtn = screen.getByText(/1 box Pasta/).closest('li')?.querySelector('button');
        if (removeBtn) {
            fireEvent.click(removeBtn);
            expect(screen.queryByText(/1 box Pasta/)).not.toBeInTheDocument();
        }
    });

    it('manages steps', () => {
        render(<RecipeForm onSubmit={mockSubmit} isSubmitting={false} title="Create Recipe" />);

        // Initial step
        expect(screen.getAllByPlaceholderText(/Step .* instructions/)).toHaveLength(1);

        // Add step
        fireEvent.click(screen.getByText('+ Add Step'));
        expect(screen.getAllByPlaceholderText(/Step .* instructions/)).toHaveLength(2);

        // Remove step 1
        const removeBtn = screen.getByLabelText('Remove step 1');
        fireEvent.click(removeBtn);

        // Should have 1 step left
        expect(screen.getAllByPlaceholderText(/Step .* instructions/)).toHaveLength(1);
    });

    it('validates empty submission', () => {
        const alertMock = jest.spyOn(window, 'alert').mockImplementation();
        render(<RecipeForm onSubmit={mockSubmit} isSubmitting={false} title="Create Recipe" initialData={{ recipe_title: '' }} />);

        const titleInput = screen.getByPlaceholderText("Recipe Title (e.g. Mom's Lasagna)");
        expect(titleInput).toBeRequired();

        alertMock.mockRestore();
    });

});
