
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Home from '../../app/page';
import { storageService } from '../../services/storageService';

jest.mock('next/link', () => {
    const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
        return <a href={href}>{children}</a>;
    };
    MockLink.displayName = 'MockLink';
    return MockLink;
});

// Mock Providers
jest.mock('../../components/Providers', () => ({
    useApp: () => ({
        members: [{ id: '1' }],
        pantry: [{ id: 'p1', inStock: true }, { id: 'p2', inStock: false }],
        language: 'en'
    })
}));

jest.mock('../../services/storageService', () => ({
    storageService: {
        getAllRecipes: jest.fn(),
        getCurrentKitchen: jest.fn(),
        getShoppingList: jest.fn(),
        getCurrentUser: jest.fn().mockResolvedValue({ user: { id: 'u1' } }),
        getKitchenMembers: jest.fn().mockResolvedValue([{ userId: 'u1', isGuest: false }]),
        switchKitchen: jest.fn(),
        joinKitchen: jest.fn()
    }
}));

describe('HomePage', () => {
    const mockRecipes = [
        { id: '1', recipe_title: 'Recent Recipe', createdAt: Date.now(), meal_type: 'dinner' }
    ];
    const mockShopping = [
        { id: 's1', name: 'Item 1', checked: false },
        { id: 's2', name: 'Item 2', checked: true }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        (storageService.getAllRecipes as jest.Mock).mockResolvedValue(mockRecipes);
        (storageService.getCurrentKitchen as jest.Mock).mockResolvedValue({ id: 'k1', name: 'Test Kitchen' });
        (storageService.getShoppingList as jest.Mock).mockResolvedValue(mockShopping);
    });

    it('renders dashboard stats correctly', async () => {
        render(<Home />);

        expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();

        await waitFor(() => {
            // Member count '1'
            // Shopping count '1'
            // We expect at least one '1' for members and one '1' for shopping.
            // Using a more specific query if possible, but getAllByText('1') is what we had.
            const ones = screen.queryAllByText('1');
            expect(ones.length).toBeGreaterThanOrEqual(2);
        });
    });

    it('fetches and displays recent history', async () => {
        render(<Home />);

        await waitFor(() => {
            // Be specific to avoid matching "Recent Recipe"
            expect(screen.getByText('Recent Recipes')).toBeInTheDocument();
            expect(screen.getByText('Recent Recipe')).toBeInTheDocument();
        });
    });

    it('logs error on fetch failure', async () => {
        const error = new Error('Network Error');
        (storageService.getAllRecipes as jest.Mock).mockRejectedValue(error);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        render(<Home />);
        await waitFor(() => expect(storageService.getAllRecipes).toHaveBeenCalled());

        expect(consoleSpy).toHaveBeenCalledWith("Failed to load data", error);
        consoleSpy.mockRestore();
    });
});
