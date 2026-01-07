
import { storageService } from '../../services/storageService';

global.fetch = jest.fn();

describe('storageService Error Handling', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockClear();
        jest.spyOn(console, 'error').mockImplementation(() => { });
        jest.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
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
