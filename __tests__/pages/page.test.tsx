
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Home from '../../app/page';
import { storageService } from '../../services/storageService';

jest.mock('next/link', () => {
    return ({ children, href }: { children: React.ReactNode; href: string }) => {
        return <a href={href}>{children}</a>;
    };
});

// Mock Providers
jest.mock('../../components/Providers', () => ({
    useApp: () => ({
        household: [{ id: '1' }],
        pantry: [{ id: 'p1', inStock: true }, { id: 'p2', inStock: false }]
    })
}));

jest.mock('../../services/storageService', () => ({
    storageService: {
        getAllRecipes: jest.fn()
    }
}));

describe('HomePage', () => {
    const mockRecipes = [
        { id: '1', recipe_title: 'Recent Recipe', createdAt: Date.now(), meal_type: 'dinner' }
    ];

    beforeEach(() => {
        (storageService.getAllRecipes as jest.Mock).mockResolvedValue(mockRecipes);
    });

    it('renders dashboard stats correctly', async () => {
        render(<Home />);
        
        expect(screen.getByText('Good Evening, Chef!')).toBeInTheDocument();
        // Members count
        expect(screen.getAllByText('1')[0]).toBeInTheDocument();
        // Pantry in-stock count
        expect(screen.getAllByText('1')[1]).toBeInTheDocument(); 
    });

    it('fetches and displays recent history', async () => {
        render(<Home />);
        await waitFor(() => expect(storageService.getAllRecipes).toHaveBeenCalled());
        
        expect(screen.getByText('Recent Creations')).toBeInTheDocument();
        expect(screen.getByText('Recent Recipe')).toBeInTheDocument();
    });

    it('logs error on fetch failure', async () => {
        // Mock error
        const error = new Error('Network Error');
        (storageService.getAllRecipes as jest.Mock).mockRejectedValue(error);
        
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        render(<Home />);
        await waitFor(() => expect(storageService.getAllRecipes).toHaveBeenCalled());
        
        expect(consoleSpy).toHaveBeenCalledWith("Failed to load history", error);
        consoleSpy.mockRestore();
    });
});
