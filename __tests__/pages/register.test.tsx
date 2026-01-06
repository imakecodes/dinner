import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterPage from '../../app/(auth)/register/page';
import { useTranslation } from '@/hooks/useTranslation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useSearchParams: () => ({
        get: jest.fn().mockReturnValue(null),
    }),
    useRouter: () => ({
        push: jest.fn(),
    }),
}));

// Mock useTranslation
jest.mock('@/hooks/useTranslation', () => ({
    useTranslation: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('RegisterPage', () => {
    const mockT = jest.fn((key: string) => {
        const translations: Record<string, string> = {
            'auth.checkEmailTitle': 'Check your email',
            'auth.checkEmailSent': "We've sent a verification link to {email}. Please check your inbox to activate your account.",
            'auth.firstName': 'First Name',
            'auth.lastName': 'Last Name',
            'auth.email': 'Email',
            'auth.password': 'Password',
            'auth.confirmPassword': 'Confirm Password',
            'auth.signupBtn': 'Sign Up',
            'members.namePlaceholder': 'Name Placeholder',
            'members.emailPlaceholder': 'Email Placeholder',
        };
        return translations[key] || key;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        (useTranslation as jest.Mock).mockReturnValue({
            t: mockT,
            lang: 'en',
        });
    });

    it('should display the correctly injected email address upon successful registration', async () => {
        const testEmail = 'test@example.com';
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: 'Registration successful' }),
        });

        render(<RegisterPage />);

        // Fill form using placeholders or specific text that we mocked
        fireEvent.change(screen.getAllByPlaceholderText('Name Placeholder')[0], { target: { value: 'John' } });
        fireEvent.change(screen.getAllByPlaceholderText('Name Placeholder')[1], { target: { value: 'Doe' } });
        fireEvent.change(screen.getByPlaceholderText('Email Placeholder'), { target: { value: testEmail } });

        // Passwords use literal placeholder "••••••••" in the code
        const passwordInputs = screen.getAllByPlaceholderText('••••••••');
        fireEvent.change(passwordInputs[0], { target: { value: 'password123' } });
        fireEvent.change(passwordInputs[1], { target: { value: 'password123' } });

        // Submit
        fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));

        // Wait for success screen
        await waitFor(() => {
            expect(screen.getByText('Check your email')).toBeInTheDocument();
        });

        // Verify email is in the document
        expect(screen.getByText(new RegExp(`We've sent a verification link to ${testEmail}`, 'i'))).toBeInTheDocument();
    });
});
