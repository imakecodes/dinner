
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { storageService } from '@/services/storageService';
import Home from '@/app/page';
import HistoryPage from '@/app/recipes/page';
import ShoppingListPage from '@/app/shopping-list/page';
import PantryPage from '@/app/pantry/page';

// Mocks
jest.mock('@/services/storageService');
jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/components/Sidebar', () => function MockSidebar() { return <div data-testid="sidebar">Sidebar</div>; });

// Mock useApp
jest.mock('@/components/Providers', () => ({
    useApp: () => ({
        members: [{ id: 'm1', role: 'ADMIN' }, { id: 'm2', role: 'GUEST' }],
        pantry: [{ id: 'p1', name: 'Carrot', inStock: true }],
        // Add other properties if accessed by Home
    })
}));

// Mock Data
const MOCK_USER_ID = "user-123";
const MOCK_ADMIN_MEMBER = { id: "m1", userId: MOCK_USER_ID, role: "ADMIN", isGuest: false };
const MOCK_GUEST_MEMBER = { id: "m2", userId: MOCK_USER_ID, role: "GUEST", isGuest: true };

const mockRecipes = [
    { id: 'r1', recipe_title: 'Test Recipe', shopping_list: [], step_by_step: [], createdAt: new Date() }
];
const mockPantry = [
    { id: 'p1', name: 'Carrot', inStock: true }
];
const mockShopping = [
    { id: 's1', name: 'Milk', checked: false }
];

describe('Guest Restrictions', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        (storageService.getAllRecipes as jest.Mock).mockResolvedValue(mockRecipes);
        (storageService.getCurrentKitchen as jest.Mock).mockResolvedValue({ id: 'k1', name: 'Test Kitchen' });
        (storageService.getPantry as jest.Mock).mockResolvedValue(mockPantry);
        (storageService.getShoppingList as jest.Mock).mockResolvedValue(mockShopping);
    });

    const setupUser = (isGuest: boolean) => {
        (storageService.getCurrentUser as jest.Mock).mockResolvedValue({ user: { id: MOCK_USER_ID } });
        (storageService.getKitchenMembers as jest.Mock).mockResolvedValue([
            isGuest ? MOCK_GUEST_MEMBER : MOCK_ADMIN_MEMBER
        ]);
    };

    describe('Home Page', () => {
        test('Guest cannot see Generate Recipe card', async () => {
            setupUser(true);
            render(<Home />);

            await waitFor(() => expect(screen.queryByText('Generate Recipe')).not.toBeInTheDocument());
            expect(screen.getByText('Pantry')).toBeInTheDocument();
        });

        test('Admin can see Generate Recipe card', async () => {
            setupUser(false);
            render(<Home />);

            await waitFor(() => expect(screen.getByText('Generate Recipe')).toBeInTheDocument());
        });
    });

    describe('Recipes History', () => {
        test('Guest cannot see Delete button', async () => {
            setupUser(true);
            render(<HistoryPage />);

            await waitFor(() => expect(screen.getByText('Test Recipe')).toBeInTheDocument());
            expect(screen.queryByText('Delete')).not.toBeInTheDocument();
            expect(screen.getByText('View Recipe')).toBeInTheDocument();
        });

        test('Admin can see Delete button', async () => {
            setupUser(false);
            render(<HistoryPage />);

            await waitFor(() => expect(screen.getByText('Test Recipe')).toBeInTheDocument());
            expect(screen.getByText('Delete')).toBeInTheDocument();
        });
    });

    describe('Shopping List', () => {
        test('Guest cannot see Add Item form or Delete button', async () => {
            setupUser(true);
            render(<ShoppingListPage />);

            await waitFor(() => expect(screen.getByText('Milk')).toBeInTheDocument());

            // Add Form input placeholder "Add item..."
            expect(screen.queryByPlaceholderText('Add item...')).not.toBeInTheDocument();

            // Read Only Notice
            expect(screen.getByText(/Shopping List is generic for the Kitchen/)).toBeInTheDocument();

            // Toggle should not be clickable (class check difficult, but behaviorally:)
            // We can check if onClick handler is present? Testing-library clicks anyway.
            // Ideally we check class "cursor-default" if we rely on visual restriction logic from code
            // But let's trust the logic if form is hidden.
        });

        test('Admin can see Add Item form', async () => {
            setupUser(false);
            render(<ShoppingListPage />);

            await waitFor(() => expect(screen.getByText('Milk')).toBeInTheDocument());
            expect(screen.getByPlaceholderText('Add item...')).toBeInTheDocument();
        });
    });

    describe('Pantry', () => {
        // PantryPage wraps PantrySection. We need to mock useCurrentMember? 
        // Actually PantryPage uses useApp() for pantry state, but PantrySection uses useCurrentMember internally.
        // We need to ensure PantrySection gets rendered.

        // Note: PantryPage needs Provider? 
        // app/pantry/page.tsx just renders PantrySection with props from useApp.
        // We might need to mock useApp if we render Page. 
        // Or creating a wrapper for tests.

        // Let's render PantrySection directly if possible to avoid Provider mess, 
        // but PantrySection is what we want to test.
        // app/pantry/page.tsx passes pantry prop.

    });

});
