
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
    beforeEach(() => {
        // Mock global.fetch for the token verification call
        global.fetch = jest.fn().mockImplementation((url: string) => {
            if (url.includes('/api/auth/verify-token')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ valid: true }),
                    status: 200
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ success: true }),
                status: 200
            });
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('shows error when passwords do not match', async () => {
        render(<ResetPasswordPage />);

        // Wait for the form to appear after verification
        const confirmInputs = await screen.findAllByPlaceholderText('••••••••');
        const passwordInput = confirmInputs[0] as HTMLInputElement;
        const confirmInput = confirmInputs[1] as HTMLInputElement;
        const submitButton = screen.getByRole('button', { name: 'auth.resetPassword' });

        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.change(confirmInput, { target: { value: 'passwordXYZ' } });

        expect(submitButton).toBeDisabled();
    });

    it('shows error when password is too short', async () => {
        render(<ResetPasswordPage />);

        // Wait for the form to appear
        const confirmInputs = await screen.findAllByPlaceholderText('••••••••');
        const submitButton = screen.getByRole('button', { name: 'auth.resetPassword' });

        // Mock the submit API call to return an error
        (global.fetch as jest.Mock).mockImplementationOnce((url: string) => {
            if (url.includes('/api/auth/verify-token')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ valid: true }),
                    status: 200
                });
            }
            return Promise.resolve({
                ok: false,
                status: 400,
                json: () => Promise.resolve({ error: 'Password must be at least 6 characters.' })
            });
        });

        fireEvent.change(confirmInputs[0], { target: { value: '123' } });
        fireEvent.change(confirmInputs[1], { target: { value: '123' } });

        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Password must be at least 6 characters.')).toBeInTheDocument();
        });
    });
});
