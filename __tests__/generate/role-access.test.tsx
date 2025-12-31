
import { render, screen } from '@testing-library/react';
import GeneratePage from '@/app/generate/page';
import { useCurrentMember } from '@/hooks/useCurrentMember';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/Providers';

// Mock Hooks
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

jest.mock('@/hooks/useCurrentMember', () => ({
    useCurrentMember: jest.fn(),
}));

jest.mock('@/components/Providers', () => ({
    useApp: jest.fn(),
}));

// Mock useTranslation (globally mocked in setup, but sometimes needs local override if component uses it directly)
jest.mock('@/hooks/useTranslation', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));


describe('Generate Page Access Control', () => {
    const mockRouter = { push: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        (useApp as jest.Mock).mockReturnValue({
            members: [],
            pantry: [],
            activeDiners: [],
            setActiveDiners: jest.fn(),
            language: 'en'
        });
    });

    it('should redirect to home if user is a GUEST', () => {
        (useCurrentMember as jest.Mock).mockReturnValue({
            isGuest: true,
            loading: false,
            member: { id: '1', role: 'GUEST' }
        });

        render(<GeneratePage />);

        expect(mockRouter.push).toHaveBeenCalledWith('/');
    });

    it('should NOT redirect if user is a MEMBER or ADMIN', () => {
        (useCurrentMember as jest.Mock).mockReturnValue({
            isGuest: false,
            loading: false,
            member: { id: '1', role: 'ADMIN' }
        });

        render(<GeneratePage />);

        expect(mockRouter.push).not.toHaveBeenCalled();
        expect(screen.getByText('generate.title')).toBeInTheDocument();
    });

    it('should wait for loading before checking', () => {
        (useCurrentMember as jest.Mock).mockReturnValue({
            isGuest: true, // is a guest
            loading: true, // but still loading
            member: null
        });

        render(<GeneratePage />);

        // Should not redirect yet
        expect(mockRouter.push).not.toHaveBeenCalled();
    });
});
