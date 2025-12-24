
import { storageService } from '../../services/storageService';

global.fetch = jest.fn();

describe('storageService Error Handling', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockClear();
    });

    it('handles 404 correctly', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            status: 404,
            json: async () => ({})
        });

        const result = await storageService.getAllRecipes();
        // Since 404 might return null or empty based on implementation choice in apiRequest?
        // Looking at apiRequest code: if (status === 404) return null;
        // getAllRecipes returns data || []. So null || [] = [].
        expect(result).toEqual([]);
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
