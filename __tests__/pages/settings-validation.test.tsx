
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
        // PasswordFields renders 2 inputs with placeholder '••••••••'.
        // SettingsPage also renders 1 PasswordInput with placeholder '••••••••' before it.
        // So we should have 3 inputs with '••••••••'.
        // Index 0: Current
        // Index 1: New
        // Index 2: Confirm
        
        const inputs = screen.getAllByPlaceholderText('••••••••');
        expect(inputs).toHaveLength(3);
        
        const currentInput = inputs[0];
        const newPasswordInput = inputs[1];
        const confirmInput = inputs[2];

        // Fill current password
        fireEvent.change(currentInput, { target: { value: 'oldpassword' } });

        // Set mismatch
        fireEvent.change(newPasswordInput, { target: { value: 'password123' } });
        fireEvent.change(confirmInput, { target: { value: 'passwordXYZ' } });

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

        const inputs = screen.getAllByPlaceholderText('••••••••');
        const currentInput = inputs[0];
        const newPasswordInput = inputs[1];

        fireEvent.change(currentInput, { target: { value: 'oldpass' } });
        fireEvent.change(newPasswordInput, { target: { value: '123' } });

        // Component validates in real-time now
        await waitFor(() => {
            expect(screen.getByText('Password too short')).toBeInTheDocument();
        });

        // Check if button is disabled
        const saveButton = screen.getByText('common.save');
        expect(saveButton).toBeDisabled();
    });

    it('disables save button if current password is missing', async () => {
        render(<SettingsPage />);
        // Wait for loading to complete
        await waitFor(() => expect(screen.queryByText('settings.title')).toBeInTheDocument());
        
        const inputs = screen.getAllByPlaceholderText('••••••••');
        const newPasswordInput = inputs[1];
        const confirmInput = inputs[2];

        // Set valid new password
        fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
        fireEvent.change(confirmInput, { target: { value: 'newpassword123' } });

        // Current password empty (default)
        const saveButton = screen.getByText('common.save');
        expect(saveButton).toBeDisabled();
        
        // Fill current
        fireEvent.change(inputs[0], { target: { value: 'currentpass' } });
        expect(saveButton).not.toBeDisabled();
    });
});
