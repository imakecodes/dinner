
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from '../../app/settings/page';

// Mocks
const mockSetLanguage = jest.fn();
jest.mock('@/components/Providers', () => ({
    useApp: () => ({
        language: 'en',
        setLanguage: mockSetLanguage,
    }),
}));

jest.mock('@/hooks/useTranslation', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            if (key === 'settings.passwordsMismatch') return 'Passwords do not match';
            return key;
        },
    }),
}));

const mockUpdateProfile = jest.fn();
const mockGetCurrentUser = jest.fn().mockResolvedValue({
    user: {
        name: 'John',
        surname: 'Doe',
        email: 'john@example.com',
        language: 'en',
        measurementSystem: 'METRIC'
    }
});

jest.mock('../../services/storageService', () => ({
    storageService: {
        getCurrentUser: () => mockGetCurrentUser(),
        updateProfile: (data: any) => mockUpdateProfile(data),
    }
}));

describe('SettingsPage Validation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows error when passwords do not match', async () => {
        render(<SettingsPage />);

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.queryByText('settings.title')).toBeInTheDocument();
        });

        // Find password inputs
        // "New Password" label -> input
        // "Confirm Password" label -> input
        const newPasswordInput = screen.getByPlaceholderText('settings.passwordPlaceholder') as HTMLInputElement;
        const confirmPasswordInput = screen.getByPlaceholderText('settings.confirmPlaceholder') as HTMLInputElement;
        
        fireEvent.change(newPasswordInput, { target: { value: 'password123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'passwordXYZ' } });

        const saveButton = screen.getByText('common.save');
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getAllByText('Passwords do not match')[0]).toBeInTheDocument();
        });


        // Ensure API was NOT called
        expect(mockUpdateProfile).not.toHaveBeenCalled();
    });
});
