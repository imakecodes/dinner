import React from 'react';
import { render, waitFor } from '@testing-library/react';
import GenerateRecipePage from '../../../app/generate/page';

// Mocks
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
    usePathname: () => '/generate',
}));

jest.mock('../../../services/storageService', () => ({
    storageService: {
        saveRecipe: jest.fn(),
    }
}));

jest.mock('@/hooks/useTranslation', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

jest.mock('@/hooks/useCurrentMember', () => ({
    useCurrentMember: () => ({ isGuest: false, loading: false, member: { role: 'ADMIN' } }),
}));

// We'll use a variable to control the mock return value for useApp
let mockUseAppValues: any = {};

jest.mock('../../../components/Providers', () => ({
    useApp: () => mockUseAppValues,
}));


describe('GenerateRecipePage', () => {
    const mockSetActiveDiners = jest.fn();
    const mockSetMealType = jest.fn();
    const mockSetDifficulty = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        // Default mock values
        mockUseAppValues = {
            members: [],
            pantry: [],
            activeDiners: [],
            setActiveDiners: mockSetActiveDiners,
            difficulty: 'easy',
            setDifficulty: mockSetDifficulty,
            prepTime: 'quick',
            mealType: 'main',
            setMealType: mockSetMealType,
            language: 'en'
        };
    });

    it('defaults selection to Kitchen Admin when no one is selected', async () => {
        const adminMember = { id: 'admin-1', name: 'Chef', role: 'ADMIN' };
        const regularMember = { id: 'mem-1', name: 'User', role: 'MEMBER' };

        mockUseAppValues.members = [regularMember, adminMember];
        mockUseAppValues.activeDiners = [];

        render(<GenerateRecipePage />);

        await waitFor(() => {
            expect(mockSetActiveDiners).toHaveBeenCalledWith(['admin-1']);
        });
    });

    it('falls back to first member if no Admin is found', async () => {
        const regularMember1 = { id: 'mem-1', name: 'User 1', role: 'MEMBER' };
        const regularMember2 = { id: 'mem-2', name: 'User 2', role: 'MEMBER' };

        mockUseAppValues.members = [regularMember1, regularMember2];
        mockUseAppValues.activeDiners = [];

        render(<GenerateRecipePage />);

        await waitFor(() => {
            expect(mockSetActiveDiners).toHaveBeenCalledWith(['mem-1']);
        });
    });

    it('does not change selection if someone is already active', async () => {
        const adminMember = { id: 'admin-1', name: 'Chef', role: 'ADMIN' };

        mockUseAppValues.members = [adminMember];
        mockUseAppValues.activeDiners = ['some-other-id']; // Already selected

        render(<GenerateRecipePage />);

        await waitFor(() => {
            expect(mockSetActiveDiners).not.toHaveBeenCalled();
        });
    });
});
