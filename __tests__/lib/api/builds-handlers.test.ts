import { NextRequest } from 'next/server';
import {
  deleteBuildById,
  getBuildById,
  getBuilds,
  saveBuild,
  toggleBuildFavorite,
  translateBuildById,
  updateBuildById,
} from '@/lib/api/builds-handlers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { translateBuild } from '@/services/geminiService';
import { normalizeBuildPayload, serializeBuildPayload } from '@/lib/build-contract';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    recipe: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
    },
    kitchenMember: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    favoriteRecipe: {
      findUnique: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
    },
    recipeIngredient: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    recipeShoppingItem: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    ingredient: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    shoppingItem: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn(),
}));

jest.mock('@/services/geminiService', () => ({
  translateBuild: jest.fn(),
}));

jest.mock('@/lib/build-contract', () => ({
  normalizeBuildPayload: jest.fn(),
  serializeBuildPayload: jest.fn(),
}));

function canonicalBuild(input: any = {}) {
  return {
    analysis_log: input.analysis_log || '',
    build_title: input.build_title || input.recipe_title || 'Build',
    build_reasoning: input.build_reasoning || input.match_reasoning || 'Reason',
    gear_gems: Array.isArray(input.gear_gems) ? input.gear_gems : Array.isArray(input.ingredients_from_pantry) ? input.ingredients_from_pantry : [],
    build_items: Array.isArray(input.build_items) ? input.build_items : Array.isArray(input.shopping_list) ? input.shopping_list : [],
    build_steps: Array.isArray(input.build_steps) ? input.build_steps : Array.isArray(input.step_by_step) ? input.step_by_step : [],
    compliance_badge: input.compliance_badge ?? input.safety_badge ?? true,
    build_archetype: input.build_archetype || input.meal_type || 'mapper',
    build_cost_tier: input.build_cost_tier || input.difficulty || 'medium',
    setup_time: input.setup_time || input.prep_time || '15m',
    setup_time_minutes: input.setup_time_minutes ?? input.prep_time_minutes ?? 15,
    build_image: input.build_image || input.dishImage || '',
    language: input.language || 'en',
    originalBuildId: input.originalBuildId || input.originalRecipeId || null,
    isFavorite: Boolean(input.isFavorite),
    translations: Array.isArray(input.translations) ? input.translations : [],
  };
}

const makeLongString = (size: number) => 'x'.repeat(size);

describe('lib/api/builds-handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyToken as jest.Mock).mockResolvedValue({ kitchenId: 'k1', userId: 'u1' });
    (normalizeBuildPayload as jest.Mock).mockImplementation((value: any) => canonicalBuild(value));
    (serializeBuildPayload as jest.Mock).mockImplementation((value: any, shape: string, language?: string) => ({
      ...value,
      __shape: shape,
      __lang: language || value?.language || null,
    }));
  });

  it('getBuilds returns 401 when unauthorized', async () => {
    (verifyToken as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/builds');
    const res = await getBuilds(req);
    expect(res.status).toBe(401);
  });

  it('getBuilds groups translation families and selects requested language', async () => {
    (prisma.recipe.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'r1',
        originalRecipeId: null,
        language: 'en',
        recipe_title: 'Arc Starter',
        match_reasoning: 'Good mapper',
        analysis_log: 'log',
        meal_type: 'mapper',
        difficulty: 'cheap',
        prep_time: '20m',
        prep_time_minutes: 20,
        dishImage: null,
        step_by_step: ['a'],
        safety_badge: true,
        ingredients: [{ inPantry: true, quantity: '1', unit: 'x', ingredient: { name: 'Wand' } }],
        shoppingItems: [{ shoppingItem: { name: 'Tabula', quantity: '1', unit: 'x' } }],
        favoritedBy: [],
        translations: [],
      },
      {
        id: 'r2',
        originalRecipeId: 'r1',
        language: 'pt-BR',
        recipe_title: 'Arc Traduzida',
        match_reasoning: 'Bom mapper',
        analysis_log: 'log',
        meal_type: 'mapper',
        difficulty: 'cheap',
        prep_time: '20m',
        prep_time_minutes: 20,
        dishImage: null,
        step_by_step: ['a'],
        safety_badge: true,
        ingredients: [{ inPantry: true, quantity: '1', unit: 'x', ingredient: { name: 'Wand' } }],
        shoppingItems: [{ shoppingItem: { name: 'Tabula', quantity: '1', unit: 'x' } }],
        favoritedBy: [{ id: 'fav-1' }],
        translations: [],
      },
    ]);

    const req = new NextRequest('http://localhost/api/builds?lang=pt-BR');
    const res = await getBuilds(req, 'canonical');
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
    expect(json[0].id).toBe('r2');
    expect(json[0].translations).toEqual([
      expect.objectContaining({ id: 'r1', language: 'en', build_title: 'Arc Starter' }),
    ]);
    expect(json[0].__shape).toBe('canonical');
  });

  it('getBuilds handles JSON-like ingredient names and malformed JSON safely', async () => {
    (prisma.recipe.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'r3',
        originalRecipeId: null,
        language: 'en',
        recipe_title: 'Build',
        match_reasoning: '',
        analysis_log: '',
        meal_type: 'mapper',
        difficulty: 'cheap',
        prep_time: '10m',
        prep_time_minutes: 10,
        dishImage: null,
        step_by_step: ['a'],
        safety_badge: true,
        ingredients: [
          {
            inPantry: true,
            quantity: '',
            unit: '',
            ingredient: { name: '{"name":"Sceptre","quantity":"1","unit":"x"}' },
          },
          {
            inPantry: true,
            quantity: '',
            unit: '',
            ingredient: { name: '{bad-json' },
          },
        ],
        shoppingItems: [],
        favoritedBy: [],
        translations: [],
      },
    ]);

    const req = new NextRequest('http://localhost/api/builds');
    const res = await getBuilds(req);
    const json = await res.json();

    expect(json[0].gear_gems[0]).toEqual({ name: 'Sceptre', quantity: '1', unit: 'x' });
    expect(json[0].gear_gems[1].name).toBe('{bad-json');
  });

  it('getBuilds returns 500 on unexpected errors', async () => {
    (prisma.recipe.findMany as jest.Mock).mockRejectedValue(new Error('db'));
    const req = new NextRequest('http://localhost/api/builds');
    const res = await getBuilds(req);
    expect(res.status).toBe(500);
  });

  it('saveBuild returns 401 when unauthorized', async () => {
    (verifyToken as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/builds', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await saveBuild(req);
    expect(res.status).toBe(401);
  });

  it('saveBuild persists normalized payload and supports favorite creation', async () => {
    (prisma.kitchenMember.findFirst as jest.Mock).mockResolvedValue({ id: 'member-1' });
    (prisma.recipe.create as jest.Mock).mockResolvedValue({
      id: 'new-1',
      recipe_title: 'Build',
      match_reasoning: 'reason',
      analysis_log: 'Manual Entry',
      meal_type: 'mapper',
      difficulty: 'cheap',
      prep_time: '10m',
      prep_time_minutes: 10,
      dishImage: null,
      step_by_step: ['a'],
      safety_badge: true,
      language: 'en',
      originalRecipeId: null,
      ingredients: [{ inPantry: true, quantity: '1', unit: 'x', ingredient: { name: 'Wand' } }],
      shoppingItems: [{ shoppingItem: { name: 'Tabula', quantity: '1', unit: 'x' } }],
      favoritedBy: [{ id: 'f1' }],
      translations: [],
    });

    const req = new NextRequest('http://localhost/api/builds', {
      method: 'POST',
      body: JSON.stringify({
        build_title: 'Build',
        gear_gems: JSON.stringify([{ name: 'Wand', quantity: '1', unit: 'x' }]),
        build_items: JSON.stringify([{ name: 'Tabula', quantity: '1', unit: 'x' }]),
        build_steps: JSON.stringify(['a']),
        isFavorite: true,
      }),
    });

    const res = await saveBuild(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.recipe.create).toHaveBeenCalled();
    expect(json.id).toBe('new-1');
  });

  it('saveBuild tolerates malformed JSON payload fields and forwards raw values for normalization', async () => {
    (prisma.kitchenMember.findFirst as jest.Mock).mockResolvedValue({ id: 'member-1' });
    (prisma.recipe.create as jest.Mock).mockResolvedValue({
      id: 'new-invalid',
      recipe_title: 'Build',
      match_reasoning: 'reason',
      analysis_log: 'Manual Entry',
      meal_type: 'mapper',
      difficulty: 'cheap',
      prep_time: '10m',
      prep_time_minutes: 10,
      dishImage: null,
      step_by_step: ['a'],
      safety_badge: true,
      language: 'en',
      originalRecipeId: null,
      ingredients: [],
      shoppingItems: [],
      favoritedBy: [],
      translations: [],
    });

    const req = new NextRequest('http://localhost/api/builds', {
      method: 'POST',
      body: JSON.stringify({
        build_title: 'Build',
        gear_gems: '{bad-json',
        build_items: '{bad-json',
        build_steps: '{bad-json',
      }),
    });

    const res = await saveBuild(req);

    expect(res.status).toBe(200);
    expect(normalizeBuildPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        gear_gems: '{bad-json',
        build_items: '{bad-json',
        build_steps: '{bad-json',
      }),
    );
  });

  it('saveBuild returns 422 when build_items name exceeds varchar limit', async () => {
    (prisma.kitchenMember.findFirst as jest.Mock).mockResolvedValue({ id: 'member-1' });

    const req = new NextRequest('http://localhost/api/builds', {
      method: 'POST',
      body: JSON.stringify({
        build_title: 'Build',
        gear_gems: [],
        build_items: [{ name: makeLongString(192), quantity: '1', unit: 'x' }],
        build_steps: ['step'],
      }),
    });

    const res = await saveBuild(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.code).toBe('build.field_too_long');
    expect(json.details).toEqual(expect.arrayContaining([
      expect.objectContaining({
        field: 'build_items.name',
        maxLength: 191,
        itemIndex: 0,
      }),
    ]));
    expect(prisma.recipe.create).not.toHaveBeenCalled();
  });

  it('saveBuild returns 422 when gear_gems name exceeds varchar limit', async () => {
    (prisma.kitchenMember.findFirst as jest.Mock).mockResolvedValue({ id: 'member-1' });

    const req = new NextRequest('http://localhost/api/builds', {
      method: 'POST',
      body: JSON.stringify({
        build_title: 'Build',
        gear_gems: [{ name: makeLongString(192), quantity: '1', unit: 'x' }],
        build_items: [],
        build_steps: ['step'],
      }),
    });

    const res = await saveBuild(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.code).toBe('build.field_too_long');
    expect(json.details).toEqual(expect.arrayContaining([
      expect.objectContaining({
        field: 'gear_gems.name',
        maxLength: 191,
        itemIndex: 0,
      }),
    ]));
    expect(prisma.recipe.create).not.toHaveBeenCalled();
  });

  it('saveBuild maps Prisma P2000 errors to 422 field-too-long payload', async () => {
    (prisma.kitchenMember.findFirst as jest.Mock).mockResolvedValue({ id: 'member-1' });
    (prisma.recipe.create as jest.Mock).mockRejectedValue({
      code: 'P2000',
      meta: { column_name: 'name' },
    });

    const req = new NextRequest('http://localhost/api/builds', {
      method: 'POST',
      body: JSON.stringify({
        build_title: 'Build',
        gear_gems: [{ name: 'Wand', quantity: '1', unit: 'x' }],
        build_items: [{ name: 'Tabula', quantity: '1', unit: 'x' }],
        build_steps: ['step'],
      }),
    });

    const res = await saveBuild(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.code).toBe('build.field_too_long');
    expect(json.details).toEqual(expect.arrayContaining([
      expect.objectContaining({
        field: 'name',
        maxLength: 191,
      }),
    ]));
  });

  it('saveBuild returns 500 on errors', async () => {
    (prisma.kitchenMember.findFirst as jest.Mock).mockRejectedValue(new Error('db'));
    const req = new NextRequest('http://localhost/api/builds', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await saveBuild(req);
    expect(res.status).toBe(500);
  });

  it('getBuildById returns 404 when build does not exist', async () => {
    (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(null);
    const req = new Request('http://localhost/api/builds/xyz');
    const res = await getBuildById(req, { params: Promise.resolve({ id: 'xyz' }) });
    expect(res.status).toBe(404);
  });

  it('getBuildById returns serialized payload with response language from query', async () => {
    (prisma.recipe.findUnique as jest.Mock).mockResolvedValue({
      id: 'r-id',
      recipe_title: 'Build',
      match_reasoning: '',
      analysis_log: '',
      meal_type: 'mapper',
      difficulty: 'cheap',
      prep_time: '10m',
      prep_time_minutes: 10,
      dishImage: null,
      step_by_step: ['a'],
      safety_badge: true,
      language: 'en',
      originalRecipeId: null,
      ingredients: [],
      shoppingItems: [],
      favoritedBy: [],
      translations: [],
    });
    const req = new NextRequest('http://localhost/api/builds/r-id?lang=pt-BR');
    const res = await getBuildById(req as unknown as Request, { params: Promise.resolve({ id: 'r-id' }) }, 'legacy');
    const json = await res.json();
    expect(json.__shape).toBe('legacy');
    expect(json.__lang).toBe('pt-BR');
  });

  it('getBuildById uses recipe translation fallback metadata when family list is absent', async () => {
    (prisma.recipe.findUnique as jest.Mock).mockResolvedValue({
      id: 'r-fallback',
      recipe_title: 'Build',
      match_reasoning: '',
      analysis_log: '',
      meal_type: 'mapper',
      difficulty: 'cheap',
      prep_time: '10m',
      prep_time_minutes: 10,
      dishImage: null,
      step_by_step: JSON.stringify(['a']),
      safety_badge: true,
      language: 'en',
      originalRecipeId: null,
      ingredients: [],
      shoppingItems: [],
      favoritedBy: [],
      translations: [{ id: 'tr-1', language: 'pt-BR', recipe_title: 'Build PT' }],
    });

    const req = new NextRequest('http://localhost/api/builds/r-fallback');
    const res = await getBuildById(req as unknown as Request, { params: Promise.resolve({ id: 'r-fallback' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.translations).toEqual([{ id: 'tr-1', language: 'pt-BR', build_title: 'Build PT' }]);
  });

  it('getBuildById returns 500 on errors', async () => {
    (prisma.recipe.findUnique as jest.Mock).mockRejectedValue(new Error('db'));
    const req = new Request('http://localhost/api/builds/r-id');
    const res = await getBuildById(req, { params: Promise.resolve({ id: 'r-id' }) });
    expect(res.status).toBe(500);
  });

  it('updateBuildById returns 404 when recipe is missing', async () => {
    (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/builds/r-id', {
      method: 'PUT',
      body: JSON.stringify({}),
    });
    const res = await updateBuildById(req, { params: Promise.resolve({ id: 'r-id' }) });
    expect(res.status).toBe(404);
  });

  it('updateBuildById rewrites relations and returns updated payload', async () => {
    (prisma.recipe.findUnique as jest.Mock).mockResolvedValue({ kitchenId: 'k1' });
    (prisma.recipe.update as jest.Mock).mockResolvedValue({
      id: 'r-id',
      recipe_title: 'Updated',
      match_reasoning: '',
      analysis_log: '',
      meal_type: 'mapper',
      difficulty: 'medium',
      prep_time: '20m',
      prep_time_minutes: 20,
      dishImage: null,
      step_by_step: ['a'],
      safety_badge: true,
      language: 'en',
      originalRecipeId: null,
      ingredients: [],
      shoppingItems: [],
      favoritedBy: [],
      translations: [],
    });

    const req = new NextRequest('http://localhost/api/builds/r-id', {
      method: 'PUT',
      body: JSON.stringify({ build_title: 'Updated', gear_gems: [], build_items: [], build_steps: [] }),
    });
    const res = await updateBuildById(req, { params: Promise.resolve({ id: 'r-id' }) });

    expect(res.status).toBe(200);
    expect(prisma.recipeIngredient.deleteMany).toHaveBeenCalledWith({ where: { recipeId: 'r-id' } });
    expect(prisma.recipeShoppingItem.deleteMany).toHaveBeenCalledWith({ where: { recipeId: 'r-id' } });
    expect(prisma.recipe.update).toHaveBeenCalled();
  });

  it('updateBuildById creates ingredient and checklist relations when build contains entries', async () => {
    (prisma.recipe.findUnique as jest.Mock).mockResolvedValue({ kitchenId: 'k1' });
    (prisma.recipe.update as jest.Mock).mockResolvedValue({
      id: 'r-with-items',
      recipe_title: 'Updated',
      match_reasoning: '',
      analysis_log: '',
      meal_type: 'mapper',
      difficulty: 'medium',
      prep_time: '20m',
      prep_time_minutes: 20,
      dishImage: null,
      step_by_step: ['a'],
      safety_badge: true,
      language: 'en',
      originalRecipeId: null,
      ingredients: [],
      shoppingItems: [],
      favoritedBy: [],
      translations: [],
    });

    const req = new NextRequest('http://localhost/api/builds/r-with-items', {
      method: 'PUT',
      body: JSON.stringify({
        build_title: 'Updated',
        gear_gems: [{ name: 'Wand', quantity: '1', unit: 'x' }],
        build_items: [{ name: 'Tabula', quantity: '1', unit: 'x' }],
        build_steps: ['a'],
      }),
    });

    const res = await updateBuildById(req, { params: Promise.resolve({ id: 'r-with-items' }) });

    expect(res.status).toBe(200);
    expect(prisma.recipe.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ingredients: expect.objectContaining({
            create: [
              expect.objectContaining({
                inPantry: true,
                quantity: '1',
                unit: 'x',
              }),
            ],
          }),
          shoppingItems: expect.objectContaining({
            create: [
              expect.objectContaining({
                shoppingItem: expect.objectContaining({
                  connectOrCreate: expect.any(Object),
                }),
              }),
            ],
          }),
        }),
      }),
    );
  });

  it('updateBuildById returns 422 when payload contains oversized fields', async () => {
    (prisma.recipe.findUnique as jest.Mock).mockResolvedValue({ kitchenId: 'k1' });

    const req = new NextRequest('http://localhost/api/builds/r-long', {
      method: 'PUT',
      body: JSON.stringify({
        build_title: 'Updated',
        gear_gems: [],
        build_items: [{ name: makeLongString(192), quantity: '1', unit: 'x' }],
        build_steps: ['a'],
      }),
    });

    const res = await updateBuildById(req, { params: Promise.resolve({ id: 'r-long' }) });
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.code).toBe('build.field_too_long');
    expect(json.details).toEqual(expect.arrayContaining([
      expect.objectContaining({
        field: 'build_items.name',
        maxLength: 191,
        itemIndex: 0,
      }),
    ]));
    expect(prisma.recipeIngredient.deleteMany).not.toHaveBeenCalled();
    expect(prisma.recipeShoppingItem.deleteMany).not.toHaveBeenCalled();
    expect(prisma.recipe.update).not.toHaveBeenCalled();
  });

  it('updateBuildById returns 500 on errors', async () => {
    (prisma.recipe.findUnique as jest.Mock).mockResolvedValue({ kitchenId: 'k1' });
    (prisma.recipeIngredient.deleteMany as jest.Mock).mockRejectedValue(new Error('db'));
    const req = new NextRequest('http://localhost/api/builds/r-id', {
      method: 'PUT',
      body: JSON.stringify({}),
    });
    const res = await updateBuildById(req, { params: Promise.resolve({ id: 'r-id' }) });
    expect(res.status).toBe(500);
  });

  it('deleteBuildById deletes and returns success payload', async () => {
    (prisma.recipe.delete as jest.Mock).mockResolvedValue({ id: 'r-del' });
    const req = new Request('http://localhost/api/builds/r-del');
    const res = await deleteBuildById(req, { params: Promise.resolve({ id: 'r-del' }) });
    const json = await res.json();
    expect(json).toEqual({ success: true });
  });

  it('deleteBuildById returns 500 on errors', async () => {
    (prisma.recipe.delete as jest.Mock).mockRejectedValue(new Error('db'));
    const req = new Request('http://localhost/api/builds/r-del');
    const res = await deleteBuildById(req, { params: Promise.resolve({ id: 'r-del' }) });
    expect(res.status).toBe(500);
  });

  it('toggleBuildFavorite handles unauthorized and member-not-found', async () => {
    (verifyToken as jest.Mock).mockResolvedValueOnce(null);
    const req1 = new NextRequest('http://localhost/api/builds/r1/favorite', { method: 'PATCH' });
    const unauthorized = await toggleBuildFavorite(req1, { params: Promise.resolve({ id: 'r1' }) });
    expect(unauthorized.status).toBe(401);

    (verifyToken as jest.Mock).mockResolvedValueOnce({ kitchenId: 'k1', userId: 'u1' });
    (prisma.kitchenMember.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const req2 = new NextRequest('http://localhost/api/builds/r2/favorite', { method: 'PATCH' });
    const notFound = await toggleBuildFavorite(req2, { params: Promise.resolve({ id: 'r2' }) });
    expect(notFound.status).toBe(404);
  });

  it('toggleBuildFavorite deletes existing favorite', async () => {
    (prisma.kitchenMember.findUnique as jest.Mock).mockResolvedValue({ id: 'member-1' });
    (prisma.favoriteRecipe.findUnique as jest.Mock).mockResolvedValue({ id: 'fav-1' });
    (prisma.favoriteRecipe.delete as jest.Mock).mockResolvedValue({ id: 'fav-1' });

    const req = new NextRequest('http://localhost/api/builds/r3/favorite', { method: 'PATCH' });
    const res = await toggleBuildFavorite(req, { params: Promise.resolve({ id: 'r3' }) });
    const json = await res.json();

    expect(json).toEqual({ isFavorite: false });
  });

  it('toggleBuildFavorite creates favorite when absent', async () => {
    (prisma.kitchenMember.findUnique as jest.Mock).mockResolvedValue({ id: 'member-1' });
    (prisma.favoriteRecipe.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.favoriteRecipe.create as jest.Mock).mockResolvedValue({ id: 'fav-2' });

    const req = new NextRequest('http://localhost/api/builds/r4/favorite', { method: 'PATCH' });
    const res = await toggleBuildFavorite(req, { params: Promise.resolve({ id: 'r4' }) });
    const json = await res.json();

    expect(json).toEqual({ isFavorite: true });
  });

  it('toggleBuildFavorite returns 500 on errors', async () => {
    (prisma.kitchenMember.findUnique as jest.Mock).mockRejectedValue(new Error('db'));
    const req = new NextRequest('http://localhost/api/builds/r5/favorite', { method: 'PATCH' });
    const res = await toggleBuildFavorite(req, { params: Promise.resolve({ id: 'r5' }) });
    expect(res.status).toBe(500);
  });

  it('translateBuildById validates input and not-found cases', async () => {
    const missingLangReq = new NextRequest('http://localhost/api/builds/r1/translate', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const missingLang = await translateBuildById(missingLangReq, { params: Promise.resolve({ id: 'r1' }) });
    expect(missingLang.status).toBe(400);

    (prisma.recipe.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const missingBuildReq = new NextRequest('http://localhost/api/builds/r1/translate', {
      method: 'POST',
      body: JSON.stringify({ targetLanguage: 'pt-BR' }),
    });
    const missingBuild = await translateBuildById(missingBuildReq, { params: Promise.resolve({ id: 'r1' }) });
    expect(missingBuild.status).toBe(404);
  });

  it('translateBuildById returns 422 when translated payload exceeds varchar limits', async () => {
    (prisma.recipe.findUnique as jest.Mock).mockResolvedValue({
      id: 'src-long',
      originalRecipeId: null,
      kitchenId: 'k1',
      language: 'en',
      recipe_title: 'Source',
      match_reasoning: 'r',
      analysis_log: 'a',
      meal_type: 'mapper',
      difficulty: 'cheap',
      prep_time: '10m',
      prep_time_minutes: 10,
      dishImage: null,
      step_by_step: ['s'],
      safety_badge: true,
      ingredients: [{ inPantry: true, ingredientId: 'ing-1', ingredient: { name: 'Wand' }, quantity: '1', unit: 'x' }],
      shoppingItems: [],
    });
    (prisma.recipe.findFirst as jest.Mock).mockResolvedValue(null);
    (translateBuild as jest.Mock).mockResolvedValue(
      canonicalBuild({
        build_title: 'Traducao',
        gear_gems: [],
        build_items: [{ name: makeLongString(192), quantity: '1', unit: 'x' }],
      }),
    );

    const req = new NextRequest('http://localhost/api/builds/src-long/translate', {
      method: 'POST',
      body: JSON.stringify({ targetLanguage: 'pt-BR' }),
    });
    const res = await translateBuildById(req, { params: Promise.resolve({ id: 'src-long' }) });
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.code).toBe('build.field_too_long');
    expect(json.details).toEqual(expect.arrayContaining([
      expect.objectContaining({
        field: 'build_items.name',
        maxLength: 191,
        itemIndex: 0,
      }),
    ]));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('translateBuildById returns existing translation when already persisted', async () => {
    (prisma.recipe.findUnique as jest.Mock).mockResolvedValue({
      id: 'src-1',
      originalRecipeId: null,
      kitchenId: 'k1',
      language: 'en',
      recipe_title: 'Source',
      match_reasoning: 'r',
      analysis_log: 'a',
      meal_type: 'mapper',
      difficulty: 'cheap',
      prep_time: '10m',
      prep_time_minutes: 10,
      dishImage: null,
      step_by_step: ['s'],
      safety_badge: true,
      ingredients: [],
      shoppingItems: [],
    });
    (prisma.recipe.findFirst as jest.Mock).mockResolvedValue({
      id: 'pt-1',
      recipe_title: 'Traducao',
      originalRecipeId: 'src-1',
      language: 'pt-BR',
      match_reasoning: 'r',
      analysis_log: 'a',
      meal_type: 'mapper',
      difficulty: 'cheap',
      prep_time: '10m',
      prep_time_minutes: 10,
      dishImage: null,
      step_by_step: ['s'],
      safety_badge: true,
      ingredients: [],
      shoppingItems: [],
      translations: [],
    });

    const req = new NextRequest('http://localhost/api/builds/src-1/translate', {
      method: 'POST',
      body: JSON.stringify({ targetLanguage: 'pt-BR' }),
    });
    const res = await translateBuildById(req, { params: Promise.resolve({ id: 'src-1' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.id).toBe('pt-1');
  });

  it('translateBuildById creates translation and falls back checklist when AI returns empty items', async () => {
    (prisma.recipe.findUnique as jest.Mock).mockResolvedValue({
      id: 'src-2',
      originalRecipeId: null,
      kitchenId: 'k1',
      language: 'en',
      recipe_title: 'Source',
      match_reasoning: 'r',
      analysis_log: 'a',
      meal_type: 'mapper',
      difficulty: 'cheap',
      prep_time: '10m',
      prep_time_minutes: 10,
      dishImage: null,
      step_by_step: ['s'],
      safety_badge: true,
      ingredients: [{ inPantry: true, ingredientId: 'ing-1', ingredient: { name: 'Wand' }, quantity: '1', unit: 'x' }],
      shoppingItems: [{ shoppingItemId: 'shop-1', shoppingItem: { name: 'Tabula', quantity: '1', unit: 'x' } }],
    });
    (prisma.recipe.findFirst as jest.Mock).mockResolvedValue(null);
    (translateBuild as jest.Mock).mockResolvedValue(
      canonicalBuild({
        build_title: 'Traducao',
        gear_gems: [{ name: 'Wand', quantity: '1', unit: 'x' }],
        build_items: [],
      }),
    );

    const tx = {
      recipe: {
        create: jest.fn().mockResolvedValue({ id: 'new-tr', kitchenId: 'k1' }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'new-tr',
          recipe_title: 'Traducao',
          match_reasoning: 'r',
          analysis_log: 'a',
          meal_type: 'mapper',
          difficulty: 'cheap',
          prep_time: '10m',
          prep_time_minutes: 10,
          dishImage: null,
          step_by_step: ['s'],
          safety_badge: true,
          language: 'pt-BR',
          originalRecipeId: 'src-2',
          ingredients: [],
          shoppingItems: [],
          translations: [],
          favoritedBy: [],
        }),
      },
      ingredient: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'new-ing' }),
      },
      recipeIngredient: {
        create: jest.fn().mockResolvedValue({}),
      },
      shoppingItem: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'new-shop' }),
        update: jest.fn().mockResolvedValue({}),
      },
      recipeShoppingItem: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => fn(tx));

    const req = new NextRequest('http://localhost/api/builds/src-2/translate', {
      method: 'POST',
      body: JSON.stringify({ targetLanguage: 'pt-BR' }),
    });
    const res = await translateBuildById(req, { params: Promise.resolve({ id: 'src-2' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(tx.shoppingItem.create).toHaveBeenCalled();
    expect(json.id).toBe('new-tr');
  });

  it('translateBuildById updates existing shopping item when translated quantity/unit are provided', async () => {
    (prisma.recipe.findUnique as jest.Mock).mockResolvedValue({
      id: 'src-update-shop',
      originalRecipeId: null,
      kitchenId: 'k1',
      language: 'en',
      recipe_title: 'Source',
      match_reasoning: 'r',
      analysis_log: 'a',
      meal_type: 'mapper',
      difficulty: 'cheap',
      prep_time: '10m',
      prep_time_minutes: 10,
      dishImage: null,
      step_by_step: ['s'],
      safety_badge: true,
      ingredients: [],
      shoppingItems: [{ shoppingItemId: 'shop-1', shoppingItem: { name: 'Tabula', quantity: '1', unit: 'x' } }],
    });
    (prisma.recipe.findFirst as jest.Mock).mockResolvedValue(null);
    (translateBuild as jest.Mock).mockResolvedValue(
      canonicalBuild({
        build_title: 'Traducao',
        gear_gems: [],
        build_items: [{ name: 'Tabula', quantity: '3', unit: 'x' }],
      }),
    );

    const tx = {
      recipe: {
        create: jest.fn().mockResolvedValue({ id: 'new-updated', kitchenId: 'k1' }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'new-updated',
          recipe_title: 'Traducao',
          match_reasoning: 'r',
          analysis_log: 'a',
          meal_type: 'mapper',
          difficulty: 'cheap',
          prep_time: '10m',
          prep_time_minutes: 10,
          dishImage: null,
          step_by_step: ['s'],
          safety_badge: true,
          language: 'pt-BR',
          originalRecipeId: 'src-update-shop',
          ingredients: [],
          shoppingItems: [],
          translations: [],
          favoritedBy: [],
        }),
      },
      ingredient: { findUnique: jest.fn(), create: jest.fn() },
      recipeIngredient: { create: jest.fn() },
      shoppingItem: {
        findUnique: jest.fn().mockResolvedValue({ id: 'existing-shop' }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'existing-shop' }),
      },
      recipeShoppingItem: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => fn(tx));

    const req = new NextRequest('http://localhost/api/builds/src-update-shop/translate', {
      method: 'POST',
      body: JSON.stringify({ targetLanguage: 'pt-BR' }),
    });

    const res = await translateBuildById(req, { params: Promise.resolve({ id: 'src-update-shop' }) });

    expect(res.status).toBe(200);
    expect(tx.shoppingItem.update).toHaveBeenCalledWith({
      where: { id: 'existing-shop' },
      data: { quantity: '3', unit: 'x' },
    });
  });

  it('translateBuildById returns fallback object when persisted recipe is missing', async () => {
    (prisma.recipe.findUnique as jest.Mock).mockResolvedValue({
      id: 'src-3',
      originalRecipeId: null,
      kitchenId: 'k1',
      language: 'en',
      recipe_title: 'Source',
      match_reasoning: 'r',
      analysis_log: 'a',
      meal_type: 'mapper',
      difficulty: 'cheap',
      prep_time: '10m',
      prep_time_minutes: 10,
      dishImage: null,
      step_by_step: ['s'],
      safety_badge: true,
      ingredients: [],
      shoppingItems: [],
    });
    (prisma.recipe.findFirst as jest.Mock).mockResolvedValue(null);
    (translateBuild as jest.Mock).mockResolvedValue(canonicalBuild({ build_title: 'Traducao', gear_gems: [], build_items: [] }));

    const tx = {
      recipe: {
        create: jest.fn().mockResolvedValue({ id: 'new-fallback', kitchenId: 'k1', language: 'pt-BR' }),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      ingredient: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      recipeIngredient: {
        create: jest.fn(),
      },
      shoppingItem: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      recipeShoppingItem: {
        create: jest.fn(),
      },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => fn(tx));

    const req = new NextRequest('http://localhost/api/builds/src-3/translate', {
      method: 'POST',
      body: JSON.stringify({ targetLanguage: 'pt-BR' }),
    });
    const res = await translateBuildById(req, { params: Promise.resolve({ id: 'src-3' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.id).toBe('new-fallback');
    expect(Array.isArray(json.ingredients)).toBe(true);
    expect(Array.isArray(json.shoppingItems)).toBe(true);
  });

  it('translateBuildById returns 500 on unexpected errors', async () => {
    (prisma.recipe.findUnique as jest.Mock).mockRejectedValue(new Error('db'));
    const req = new NextRequest('http://localhost/api/builds/src-err/translate', {
      method: 'POST',
      body: JSON.stringify({ targetLanguage: 'pt-BR' }),
    });
    const res = await translateBuildById(req, { params: Promise.resolve({ id: 'src-err' }) });
    expect(res.status).toBe(500);
  });
});
