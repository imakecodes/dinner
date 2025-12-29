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

    it('deleteRecipe should make DELETE request', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        });

        await storageService.deleteRecipe('1');

        expect(global.fetch).toHaveBeenCalledWith('/api/recipes/1', expect.objectContaining({
            method: 'DELETE'
        }));
    });

    it('toggleFavorite should make PATCH request', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        });

        await storageService.toggleFavorite('1');

        expect(global.fetch).toHaveBeenCalledWith('/api/recipes/1/favorite', expect.objectContaining({
            method: 'PATCH'
        }));
    });

    it('getKitchenMembers should return members', async () => {
        const mockMembers = [{ id: 'm1', name: 'Mom' }];
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockMembers,
        });

        const result = await storageService.getKitchenMembers();
        expect(result).toEqual(mockMembers);
    });

    it('saveMember should POST new member', async () => {
        const member = { name: 'Dad', dietary_restrictions: [] } as any;
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        await storageService.saveMember(member);
        expect(global.fetch).toHaveBeenCalledWith('/api/kitchen-members', expect.objectContaining({
            method: 'POST'
        }));
    });

    it('deleteMember should DELETE member', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
        await storageService.deleteMember('1');
        expect(global.fetch).toHaveBeenCalledWith('/api/kitchen-members/1', expect.objectContaining({
            method: 'DELETE'
        }));
    });

    it('addPantryItem should POST new item', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
        await storageService.addPantryItem('Rice');
        expect(global.fetch).toHaveBeenCalledWith('/api/pantry', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ name: 'Rice' })
        }));
    });

    it('removePantryItem should DELETE item', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
        await storageService.removePantryItem('Rice');
        expect(global.fetch).toHaveBeenCalledWith('/api/pantry/Rice', expect.objectContaining({
            method: 'DELETE'
        }));
    });

    it('editPantryItem should PUT item updates', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
        await storageService.editPantryItem('Rice', { inStock: true });
        expect(global.fetch).toHaveBeenCalledWith('/api/pantry/Rice', expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ inStock: true })
        }));
    });

    it('getShoppingList should return items', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => [] });
        await storageService.getShoppingList();
        expect(global.fetch).toHaveBeenCalledWith('/api/shopping-list', expect.any(Object));
    });

    it('addToShoppingList should POST item', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
        await storageService.addToShoppingList('Milk');
        expect(global.fetch).toHaveBeenCalledWith('/api/shopping-list', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ name: 'Milk' })
        }));
    });

    it('updateShoppingItem should PUT updates', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
        await storageService.updateShoppingItem('1', { checked: true });
        expect(global.fetch).toHaveBeenCalledWith('/api/shopping-list/1', expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ checked: true })
        }));
    });

    it('deleteShoppingItem should DELETE item', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
        await storageService.deleteShoppingItem('1');
        expect(global.fetch).toHaveBeenCalledWith('/api/shopping-list/1', expect.objectContaining({
            method: 'DELETE'
        }));
    });

    it('getTags should fetch tags by category', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ['Tag1'] });
        await storageService.getTags('category');
        expect(global.fetch).toHaveBeenCalledWith('/api/tags?category=category', expect.any(Object));
    });

    it('saveTag should POST new tag', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
        await storageService.saveTag('cat', 'tag');
        expect(global.fetch).toHaveBeenCalledWith('/api/tags', expect.objectContaining({
            method: 'POST'
        }));
    });

    it('createKitchen should POST new kitchen', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
        await storageService.createKitchen('My Kitchen');
        expect(global.fetch).toHaveBeenCalledWith('/api/kitchens', expect.objectContaining({
            method: 'POST'
        }));
    });

    it('getCurrentUser should fetch auth/me', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
        await storageService.getCurrentUser();
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/me', expect.any(Object));
    });

    it('switchKitchen should POST context switch', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
        await storageService.switchKitchen('k1');
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/switch-context', expect.objectContaining({
            method: 'POST'
        }));
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
