
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
            if (key === 'auth.passwordMismatch') return 'Passwords do not match';
            if (key === 'auth.passwordTooShort') return 'Password too short';
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
        const confirmInputs = screen.getAllByPlaceholderText('••••••••');
        const newPasswordInput = confirmInputs[0] as HTMLInputElement;
        const confirmPasswordInput = confirmInputs[1] as HTMLInputElement;
        
        fireEvent.change(newPasswordInput, { target: { value: 'password123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'passwordXYZ' } });

        // Wait for real-time validation error to appear
        await waitFor(() => {
            expect(screen.getAllByText('Passwords do not match')[0]).toBeInTheDocument();
        });

        const saveButton = screen.getByText('common.save');
        fireEvent.click(saveButton);


        // Ensure API was NOT called
        expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it('shows error when password is too short', async () => {
        render(<SettingsPage />);
        await waitFor(() => expect(screen.queryByText('settings.title')).toBeInTheDocument());

        const confirmInputs = screen.getAllByPlaceholderText('••••••••');
        const newPasswordInput = confirmInputs[0] as HTMLInputElement;
        
        fireEvent.change(newPasswordInput, { target: { value: '123' } });

        // Component validates in real-time now
        await waitFor(() => {
            expect(screen.getByText('Password too short')).toBeInTheDocument();
        });

        // Check if button is disabled
        const saveButton = screen.getByText('common.save');
        expect(saveButton).toBeDisabled();

        // Ensure API was NOT called if we tried to click (though disabled prevents click usually, check state)
        // fireEvent.click(saveButton); // FireEvent can bypass disabled attribute if not careful, but check attribute first.
    });
});
