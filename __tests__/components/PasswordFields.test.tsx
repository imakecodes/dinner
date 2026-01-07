import { render, screen, fireEvent } from '@testing-library/react';
import { PasswordFields } from '@/components/PasswordFields';

// Mock translation hook
jest.mock('@/hooks/useTranslation', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

describe('PasswordFields Component', () => {
    it('renders correctly', () => {
        render(<PasswordFields onChange={() => {}} />);
        expect(screen.getAllByPlaceholderText('••••••••')).toHaveLength(2);
    });

    it('toggles password visibility', () => {
        render(<PasswordFields onChange={() => {}} />);
        const inputs = screen.getAllByPlaceholderText('••••••••') as HTMLInputElement[];
        const newPasswordInput = inputs[0];

        // Initially password type
        expect(newPasswordInput).toHaveAttribute('type', 'password');

        // Find toggle buttons (there are two, one for each input)
        // They are buttons with 'fa-eye' class inside.
        // Let's find by role button, we have 2. 
        const toggleButtons = screen.getAllByRole('button');
        
        // Click first toggle
        fireEvent.click(toggleButtons[0]);

        // Should be text now
        expect(newPasswordInput).toHaveAttribute('type', 'text');
        
        // Click again
        fireEvent.click(toggleButtons[0]);
        
        // Should be password again
        expect(newPasswordInput).toHaveAttribute('type', 'password');
    });

    it('validates passwords match', () => {
        const handleChange = jest.fn();
        render(<PasswordFields onChange={handleChange} />);
        
        const inputs = screen.getAllByPlaceholderText('••••••••');
        
        fireEvent.change(inputs[0], { target: { value: 'password123' } });
        fireEvent.change(inputs[1], { target: { value: 'passwordXYZ' } });

        // Should call onChange with valid=false
        expect(handleChange).toHaveBeenLastCalledWith(false, 'password123');
        
        // Fix match
        fireEvent.change(inputs[1], { target: { value: 'password123' } });
        
        // Should call onChange with valid=true
        expect(handleChange).toHaveBeenLastCalledWith(true, 'password123');
    });
});
