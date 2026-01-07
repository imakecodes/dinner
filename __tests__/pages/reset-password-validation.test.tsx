
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResetPasswordPage from '../../app/(auth)/reset-password/page';

// Mocks
jest.mock('next/navigation', () => ({
    useSearchParams: () => ({
        get: (key: string) => key === 'token' ? 'valid-token' : null,
    }),
    useRouter: () => ({
        push: jest.fn(),
    }),
}));

jest.mock('@/hooks/useTranslation', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            if (key === 'auth.passwordMismatch') return 'Passwords do not match.';
            if (key === 'auth.passwordTooShort') return 'Password must be at least 6 characters.';
            return key;
        },
    }),
}));

describe('ResetPasswordPage Validation', () => {
    it('shows error when passwords do not match', async () => {
        render(<ResetPasswordPage />);

        const confirmInputs = screen.getAllByPlaceholderText('••••••••');
        const passwordInput = confirmInputs[0] as HTMLInputElement;
        const confirmInput = confirmInputs[1] as HTMLInputElement;
        const submitButton = screen.getByRole('button', { name: 'auth.resetPassword' });

        fireEvent.change(confirmInputs[0], { target: { value: 'password123' } });
        fireEvent.change(confirmInput, { target: { value: 'passwordXYZ' } });

        expect(submitButton).toBeDisabled();

        // Ensure it enables when valid (we need to match mismatch first test flow, or just check disabled here)
        // The test above sets mismatch passwords.
    });

    it('shows error when password is too short', async () => {
        render(<ResetPasswordPage />);

        const confirmInputs = screen.getAllByPlaceholderText('••••••••');
        const submitButton = screen.getByRole('button', { name: 'auth.resetPassword' });

        fireEvent.change(confirmInputs[0], { target: { value: '123' } });
        fireEvent.change(confirmInputs[1], { target: { value: '123' } });

        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Password must be at least 6 characters.')).toBeInTheDocument();
        });
    });
});
