
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HistoryPage from '../../../app/recipes/page';
import { storageService } from '../../../services/storageService';

// Mock mocks
jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn() })
}));

jest.mock('../../../components/Providers', () => ({
    useApp: () => ({ lang: 'en' })
}));

jest.mock('../../../services/storageService', () => ({
    storageService: {
        getAllRecipes: jest.fn(),
        getCurrentUser: jest.fn().mockResolvedValue({ user: { id: 'u1' } }),
        getKitchenMembers: jest.fn().mockResolvedValue([{ userId: 'u1', isGuest: false }]),
    }
}));

// Mock HistorySection to avoid deep rendering complexity
jest.mock('../../../components/HistorySection', () => {
    return function MockHistorySection({ history }: { history: any[] }) {
        return (
            <div data-testid="history-list">
                {history.map(h => (
                    <div key={h.id}>{h.recipe_title}</div>
                ))}
            </div>
        );
    };
});

describe('HistoryPage', () => {
    const mockRecipes = [
        { id: '1', recipe_title: 'Pasta', ingredients_from_pantry: ['Tomato'], shopping_list: [] },
        { id: '2', recipe_title: 'Salad', ingredients_from_pantry: [{ name: 'Lettuce' }], shopping_list: [] }
    ];

    beforeEach(() => {
        (storageService.getAllRecipes as jest.Mock).mockResolvedValue(mockRecipes);
    });

    it('renders and fetches recipes', async () => {
        render(<HistoryPage />);
        await waitFor(() => expect(screen.getByText('Pasta')).toBeInTheDocument());
        expect(screen.getByText('Salad')).toBeInTheDocument();
    });

    it('filters recipes by title', async () => {
        render(<HistoryPage />);
        await waitFor(() => expect(screen.getByText('Pasta')).toBeInTheDocument());

        const searchInput = screen.getByPlaceholderText('Search by title or ingredient...');
        fireEvent.change(searchInput, { target: { value: 'Pasta' } });

        expect(screen.getByText('Pasta')).toBeInTheDocument();
        expect(screen.queryByText('Salad')).not.toBeInTheDocument();
    });

    it('filters recipes by ingredient (string)', async () => {
        render(<HistoryPage />);
        await waitFor(() => expect(screen.getByText('Pasta')).toBeInTheDocument());

        const searchInput = screen.getByPlaceholderText('Search by title or ingredient...');
        fireEvent.change(searchInput, { target: { value: 'Tomato' } });

        expect(screen.getByText('Pasta')).toBeInTheDocument();
        expect(screen.queryByText('Salad')).not.toBeInTheDocument();
    });

    it('filters recipes by ingredient (object)', async () => {
        render(<HistoryPage />);
        await waitFor(() => expect(screen.getByText('Pasta')).toBeInTheDocument());

        const searchInput = screen.getByPlaceholderText('Search by title or ingredient...');
        fireEvent.change(searchInput, { target: { value: 'Lettuce' } });

        expect(screen.getByText('Salad')).toBeInTheDocument();
        expect(screen.queryByText('Pasta')).not.toBeInTheDocument();
    });

    it('shows empty state when no matches', async () => {
        render(<HistoryPage />);
        await waitFor(() => expect(screen.getByText('Pasta')).toBeInTheDocument());

        const searchInput = screen.getByPlaceholderText('Search by title or ingredient...');
        fireEvent.change(searchInput, { target: { value: 'Burger' } });

        expect(screen.getByText('No results for "Burger". Try another keyword!')).toBeInTheDocument();
    });
});
