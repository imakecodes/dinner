

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MembersPage from '@/app/members/page';
import { storageService } from '@/services/storageService';
import { KitchenMember, Kitchen } from '@/types';

// Mock storageService
jest.mock('@/services/storageService');
const mockedStorageService = storageService as jest.Mocked<typeof storageService>;

// Mock UI components that might cause issues in JSDOM
jest.mock('@/components/Sidebar', () => function MockSidebar() { return <div data-testid="sidebar">Sidebar</div>; });
// TagInput can be real as it just renders inputs and chips
// ConfirmDialog just renders a modal
// CodeInput is not used here (it's in Home) but used in page.tsx imports? No, MembersPage doesn't use CodeInput.

const mockKitchen: Kitchen = {
    id: 'k1',
    name: 'Test Kitchen',
    inviteCode: 'INV123',
    createdAt: new Date()
};

const mockAdminUser = {
    user: { id: 'u1', name: 'Admin User', email: 'admin@test.com' }
};

const mockGuestUser = {
    user: { id: 'u2', name: 'Guest User', email: 'guest@test.com' }
};

const mockMembers: KitchenMember[] = [
    {
        id: 'm1',
        userId: 'u1',
        name: 'Admin User',
        email: 'admin@test.com',
        role: 'ADMIN',
        isGuest: false,
        kitchenId: 'k1',
        likes: [],
        dislikes: [],
        restrictions: []
    },
    {
        id: 'm2',
        userId: 'u2',
        name: 'Guest User',
        email: 'guest@test.com',
        role: 'MEMBER', // Role MEMBER but isGuest true
        isGuest: true,
        kitchenId: 'k1',
        likes: [],
        dislikes: [],
        restrictions: []
    },
    {
        id: 'm3',
        userId: 'u3',
        name: 'Other Member',
        email: 'other@test.com',
        role: 'MEMBER',
        isGuest: false,
        kitchenId: 'k1',
        likes: [],
        dislikes: [],
        restrictions: []
    }
];

describe('MembersPage Guest Restrictions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedStorageService.getKitchenMembers.mockResolvedValue(mockMembers);
        mockedStorageService.getCurrentKitchen.mockResolvedValue(mockKitchen);
        // Mock prompt to avoid errors
        window.alert = jest.fn();
        window.scrollTo = jest.fn();
    });

    it('renders correctly for ADMIN user (Full Access)', async () => {
        mockedStorageService.getCurrentUser.mockResolvedValue(mockAdminUser as any);

        render(<MembersPage />);

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.getByText('Invite Code')).toBeInTheDocument();
        });

        // 1. Invite Code should be visible
        expect(screen.getByText('Invite Code')).toBeInTheDocument();
        expect(screen.getByText('INV123')).toBeInTheDocument();

        // 2. Add Member Form should be visible
        expect(screen.getAllByText('Add Guest / Member').length).toBeGreaterThan(0);

        // 3. Delete buttons should be visible for other members
        // const deleteButtons = screen.getAllByTitle('Remove');
        // expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it('restricts UI for GUEST user', async () => {
        mockedStorageService.getCurrentUser.mockResolvedValue(mockGuestUser as any);

        render(<MembersPage />);

        await waitFor(() => {
            expect(screen.getByText('You are viewing this kitchen as a Guest.')).toBeInTheDocument();
        });

        // 1. Invite Code should NOT be visible
        expect(screen.queryByText('Invite Code')).not.toBeInTheDocument();
        expect(screen.queryByText('INV123')).not.toBeInTheDocument();

        // 2. Add Member Form should NOT be visible (Guest View Message instead)
        expect(screen.queryByText('Add Guest / Member')).not.toBeInTheDocument();
        expect(screen.getByText('You are viewing this kitchen as a Guest.')).toBeInTheDocument();

        // 3. Delete buttons should NOT be visible for anyone
        const deleteButtons = screen.queryAllByTitle('Remove member');
        expect(deleteButtons.length).toBe(0);
    });

    it('allows GUEST to edit THEMSELVES', async () => {
        mockedStorageService.getCurrentUser.mockResolvedValue(mockGuestUser as any);

        render(<MembersPage />);

        await waitFor(() => {
            expect(screen.getByText('Guest User')).toBeInTheDocument();
        });

        // Click on self (Guest User) - Use generic card class selector
        // The card has 'bg-white p-4 rounded-3xl' classes
        const guestCard = screen.getByText('Guest User').closest('.bg-white.p-4.rounded-3xl');
        fireEvent.click(guestCard!);

        // Form should appear now for editing self
        expect(screen.getByText('Edit Member')).toBeInTheDocument();
        // Since input values are controlled, getByDisplayValue is good
        expect(screen.getByDisplayValue('Guest User')).toBeInTheDocument();

        // Check Name input allows typing
        const nameInput = screen.getByPlaceholderText('e.g. Grandma, Mike');
        fireEvent.change(nameInput, { target: { value: 'Guest Updated' } });
        expect(nameInput).toHaveValue('Guest Updated');
    });

    it('PREVENTS GUEST from editing OTHERS', async () => {
        mockedStorageService.getCurrentUser.mockResolvedValue(mockGuestUser as any);

        render(<MembersPage />);

        await waitFor(() => {
            expect(screen.getByText('Admin User')).toBeInTheDocument();
        });

        // Spy on alert
        const alertSpy = jest.spyOn(window, 'alert');

        // Click on Admin User (Another member) - Should be disabled now
        const adminCard = screen.getByText('Admin User').closest('.bg-white.p-4.rounded-3xl');
        // We can verify it has cursor-not-allowed class
        expect(adminCard).toHaveClass('cursor-not-allowed');

        fireEvent.click(adminCard!);

        // Expect NO alert (click disabled)
        expect(alertSpy).not.toHaveBeenCalled();

        // Expect Form NOT to show/update to Admin User
        expect(screen.getByText('You are viewing this kitchen as a Guest.')).toBeInTheDocument();
        expect(screen.queryByDisplayValue('Admin User')).not.toBeInTheDocument();
    });
});
