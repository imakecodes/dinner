import { storageService } from '@/services/storageService';

// Mock global fetch
global.fetch = jest.fn();

describe('storageService - Consolidated Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });
        jest.spyOn(console, 'info').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Basic CRUD Operations', () => {
        it('getAllRecipes should return data when API call is successful', async () => {
            const mockRecipes = [{ id: '1', title: 'Pasta' }];
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockRecipes,
            });

            const result = await storageService.getAllRecipes();
            expect(result).toEqual(mockRecipes);
            expect(global.fetch).toHaveBeenCalledWith('/api/builds', expect.any(Object));
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

            expect(global.fetch).toHaveBeenCalledWith('/api/builds', expect.objectContaining({
                method: 'POST',
                body: JSON.stringify(newRecipe),
            }));
        });

        it('deleteRecipe should make DELETE request', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true }),
            });

            await storageService.deleteRecipe('1');

            expect(global.fetch).toHaveBeenCalledWith('/api/builds/1', expect.objectContaining({
                method: 'DELETE'
            }));
        });

        it('toggleFavorite should make PATCH request', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true }),
            });

            await storageService.toggleFavorite('1');

            expect(global.fetch).toHaveBeenCalledWith('/api/builds/1/favorite', expect.objectContaining({
                method: 'PATCH'
            }));
        });

    describe('Error Handling and Edge Cases', () => {
        beforeEach(() => {
            jest.spyOn(console, 'error').mockImplementation(() => { });
            jest.spyOn(console, 'warn').mockImplementation(() => { });
        });

        it('getBuildById returns null on 404 and throws on other errors', async () => {
            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ message: 'Not Found' }) })
                .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ message: 'Fail' }) });

            await expect(storageService.getBuildById('id-1')).resolves.toBeNull();
            await expect(storageService.getBuildById('id-1')).rejects.toThrow('Fail');
        });

        it('getRecipeById returns null on 404', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: async () => ({ message: 'Not Found' })
            });

            await expect(storageService.getRecipeById('legacy-build')).resolves.toBeNull();
            expect(global.fetch).toHaveBeenCalledWith('/api/builds/legacy-build', expect.any(Object));
        });

        it('canonical methods return empty arrays when payload is null', async () => {
            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({ ok: true, json: async () => null }) // getPartyMembers
                .mockResolvedValueOnce({ ok: true, json: async () => null }) // getStash
                .mockResolvedValueOnce({ ok: true, json: async () => null }) // getBuildItems
                .mockResolvedValueOnce({ ok: true, json: async () => null }); // getTags

            await expect(storageService.getPartyMembers()).resolves.toEqual([]);
            await expect(storageService.getStash()).resolves.toEqual([]);
            await expect(storageService.getBuildItems({ status: 'completed' })).resolves.toEqual([]);
            await expect(storageService.getTags('missing')).resolves.toEqual([]);
        });

        it('getAllBuilds canonical supports language query string', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => [] });

            await storageService.getAllBuilds('pt-BR');
            expect(global.fetch).toHaveBeenCalledWith('/api/builds?lang=pt-BR', expect.any(Object));
        });

        it('apiRequest includes backend error details when provided', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: async () => ({ message: 'Request failed', error: 'validation' }),
            });

            await expect(storageService.getAllBuilds()).rejects.toThrow('Request failed (validation)');
        });

        it('apiRequest fallback handles non-json error payload', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => {
                    throw new Error('invalid-json');
                },
            });

            await expect(storageService.getAllBuilds()).rejects.toThrow('HTTP Error 500');
        });

        it('handles 404 correctly', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 404,
                json: async () => ({ message: 'Not Found' })
            });

            await expect(storageService.getAllRecipes()).rejects.toThrow('Not Found');
        });

        it('handles 500 error', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 500,
                json: async () => ({ message: 'Server Fail' })
            });

            await expect(storageService.getAllRecipes()).rejects.toThrow('Server Fail');
        });

        it('handles network error (fetch throws)', async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Network Down'));

            await expect(storageService.getAllRecipes()).rejects.toThrow('Network Down');
        });
    });
});
    });