
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import KitchensPage from '@/app/kitchens/page';
import { storageService } from '@/services/storageService';
import { useTranslation } from '@/hooks/useTranslation';

// Mock dependencies
jest.mock('@/services/storageService', () => ({
    storageService: {
        getCurrentUser: jest.fn(),
        createKitchen: jest.fn(),
        switchKitchen: jest.fn(),
        deleteKitchen: jest.fn(),
        updateKitchen: jest.fn(),
    }
}));

jest.mock('@/hooks/useTranslation', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    })
}));

jest.mock('@/components/Sidebar', () => {
    return function MockSidebar() {
        return <div data-testid="sidebar">Sidebar</div>;
    };
});

jest.mock('@/components/ShareButtons', () => {
    return {
        ShareButtons: () => <div data-testid="share-buttons">ShareButtons</div>
    };
});


describe('KitchensPage', () => {
    const mockUser = {
        id: 'user1',
        currentKitchenId: 'kitchen1',
        kitchenMemberships: [
            {
                id: 'mem1',
                kitchenId: 'kitchen1',
                role: 'ADMIN',
                isGuest: false,
                kitchen: {
                    id: 'kitchen1',
                    name: 'Admin Kitchen',
                    inviteCode: 'ADMIN-CODE'
                }
            },
            {
                id: 'mem2',
                kitchenId: 'kitchen2',
                role: 'MEMBER',
                isGuest: true,
                kitchen: {
                    id: 'kitchen2',
                    name: 'Guest Kitchen',
                    inviteCode: 'GUEST-CODE'
                }
            }
        ]
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (storageService.getCurrentUser as jest.Mock).mockResolvedValue({ user: mockUser });
    });

    it('renders kitchen list successfully', async () => {
        render(<KitchensPage />);

        await waitFor(() => {
            expect(screen.getByText('Admin Kitchen')).toBeInTheDocument();
            expect(screen.getByText('Guest Kitchen')).toBeInTheDocument();
        });
    });

    it('shows invite code for non-guest (Admin) kitchens', async () => {
        render(<KitchensPage />);

        await waitFor(() => {
            expect(screen.getByText('ADMIN-CODE')).toBeInTheDocument();
        });
    });

    it('DOES NOT show invite code for guest kitchens', async () => {
        render(<KitchensPage />);

        await waitFor(() => {
            // Should verify Guest Kitchen exists
            expect(screen.getByText('Guest Kitchen')).toBeInTheDocument();
            // But its code should NOT be there
            expect(screen.queryByText('GUEST-CODE')).not.toBeInTheDocument();
        });
    });

    it('allows creating a new kitchen', async () => {
        render(<KitchensPage />);

        await waitFor(() => screen.getByTestId('sidebar'));
        // Wait for loading to finish
        await waitFor(() => expect(screen.queryByText('kitchens.loading')).not.toBeInTheDocument());

        const input = screen.getByPlaceholderText('kitchens.createPlaceholder');
        const button = screen.getByText('kitchens.create');

        fireEvent.change(input, { target: { value: 'New Kitchen' } });
        fireEvent.click(button);

        await waitFor(() => {
            expect(storageService.createKitchen).toHaveBeenCalledWith('New Kitchen');
        });
    });
});
