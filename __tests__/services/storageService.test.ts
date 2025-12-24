import { storageService } from '../../services/storageService';

// Mock global fetch
global.fetch = jest.fn();

describe('storageService', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockClear();
    });

    it('getAllRecipes should return data when API call is successful', async () => {
        const mockRecipes = [{ id: '1', title: 'Pasta' }];
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockRecipes,
        });

        const result = await storageService.getAllRecipes();
        expect(result).toEqual(mockRecipes);
        expect(global.fetch).toHaveBeenCalledWith('/api/recipes', expect.any(Object));
    });

    it('getAllRecipes should return empty array when API returns null', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => null,
        });

        const result = await storageService.getAllRecipes();
        expect(result).toEqual([]);
    });

    it('saveRecipe should make a POST request', async () => {
        const newRecipe = { title: 'New Recipe' };
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        });

        await storageService.saveRecipe(newRecipe);

        expect(global.fetch).toHaveBeenCalledWith('/api/recipes', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(newRecipe),
        }));
    });

    it('getRecipeById should return null on 404', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 404,
            json: async () => ({}),
        });

        const result = await storageService.getRecipeById('123');
        expect(result).toBeNull();
    });

    it('should throw error on non-404 API failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({ message: 'Server Error' }),
        });

        await expect(storageService.getAllRecipes()).rejects.toThrow('Server Error');
    });

    it('getPantry should return items', async () => {
        const mockPantry = [{ id: '1', name: 'Salt' }];
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockPantry,
        });

        const result = await storageService.getPantry();
        expect(result).toEqual(mockPantry);
        expect(global.fetch).toHaveBeenCalledWith('/api/pantry', expect.any(Object));
    });

    it('updateProfile should make PUT request', async () => {
        const profileData = { name: 'John', surname: 'Doe', measurementSystem: 'metric' };
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        });

        await storageService.updateProfile(profileData);
        
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/me', expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify(profileData)
        }));
    });
});
