
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

if (!global.Request) {
    global.Request = class Request {
        constructor(input, init) {
            this.input = input;
            this.init = init;
            this.headers = new Headers(init?.headers);
        }
        async json() {
            return JSON.parse(this.init?.body || '{}');
        }
    };
}
if (!global.Response) {
    global.Response = class Response {
        constructor(body, init) {
            this.body = body;
            this.status = init?.status || 200;
            this.ok = this.status >= 200 && this.status < 300;
            this.headers = new Headers(init?.headers);
        }
        async json() {
            return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
        }
        static json(data, init) {
            return new Response(JSON.stringify(data), init);
        }
    };
}
if (!global.Headers) {
    global.Headers = class Headers {
        constructor(init) {
            this.map = new Map(Object.entries(init || {}));
        }
        get(name) { return this.map.get(name); }
        set(name, value) { this.map.set(name, value); }
    };
}

const translations = {
  en: {
    common: {
      delete: 'Delete',
      edit: 'Edit',
      save: 'Save',
      cancel: 'Cancel',
      back: 'Back',
      loading: 'Loading...',
      slogan: 'Smart & Safe Culinary Intelligence'
    },
    nav: {
      home: 'Home',
      pantry: 'Pantry',
      recipes: 'Recipes',
      history: 'History',
      shopping: 'Shopping',
      members: 'Members',
      kitchens: 'Manage Kitchens',
      settings: 'Settings',
      account: 'Account',
      logout: 'Log Out',
      switchKitchen: 'Switch Kitchen',
      newKitchen: 'New Kitchen'
    },
    home: {
      welcome: 'Welcome back',
      generateRecipe: 'Generate Recipe',
      pantry: 'Pantry',
      activeKitchen: 'Active Kitchen',
      quickActions: 'Quick Actions',
      joinKitchen: 'Join Kitchen',
      createKitchen: 'Create Kitchen'
    },
    shopping: {
      addItem: 'Add item...',
      title: 'Shopping List',
      loading: 'Loading List...',
      empty: 'All caught up!',
      readOnly: 'Shopping List is generic for the Kitchen (Read Only)',
      fromPantry: 'From Pantry',
      forRecipes: 'For {n} Recipe(s)'
    },
    recipes: {
      view: 'View Recipe',
      delete: 'Delete',
      deleteTitle: 'Delete Recipe?',
      deleteDesc: 'This action cannot be undone. Are you sure you want to delete this recipe?',
      searchPlaceholder: 'Search by title or ingredient...',
      noResults: 'No recipes found',
      noResultsSearch: 'No results for "{term}". Try another keyword!',
      empty: 'You haven\'t saved any recipes yet. Generate one to get started!'
    },
    recipeForm: {
      titleCreate: 'Create Recipe',
      titleEdit: 'Edit Recipe',
      recipeTitle: 'Recipe Title',
      recipeTitlePlaceholder: "Recipe Title (e.g. Mom's Lasagna)",
      mealType: 'Meal Type',
      mainCourse: 'Main Course',
      appetizer: 'Appetizer',
      dessert: 'Dessert',
      snack: 'Snack',
      difficulty: 'Difficulty',
      easy: 'Easy',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      chefMode: 'Chef Mode',
      prepTime: 'Prep Time',
      prepTimePlaceholder: 'Prep Time (e.g. 45 mins)',
      recipeIdeaPlaceholder: 'e.g. Pasta with tomato sauce',
      ingredients: 'Ingredients (Pantry/Kitchen)',
      qty: 'Qty',
      unit: 'Unit',
      ingredientName: 'Ingredient Name',
      add: 'Add',
      shoppingList: 'Shopping List (To Buy)',
      itemName: 'Item Name',
      instructions: 'Instructions',
      stepPlaceholder: 'Step {n} instructions...',
      addStep: 'Add Step',
      saveRecipe: 'Save Recipe',
      saving: 'Saving...'
    },
    recipeCard: {
      todaysSuggestion: 'Today\'s Suggestion',
      chef: 'CHEF',
      time: 'Time',
      difficulty: 'Difficulty',
      calories: 'Calories',
      ingredients: 'Ingredients',
      instructions: 'Instructions',
      addToShoppingList: 'Add to Shopping List',
      favorite: 'Favorite',
      unfavorite: 'Unfavorite',
      translate: 'Translate Recipe',
      showOriginal: 'Show Original',
      translating: 'Translating...',
      fromPantry: 'From Pantry',
      toBuy: 'To Buy',
      stepByStep: 'Step by Step',
      addToListTitle: 'Add "{item}" to List?',
      trackItem: 'Select how to track this item',
      alwaysReplenish: 'Always Replenish',
      oneShot: 'One Shot',
      justTrack: 'Just Track',
      cancel: 'Cancel',
      copyClipboard: 'Copy to Clipboard',
      copied: 'Copied!'
    },
    generate: {
      specialRequestsPlaceholder: 'e.g. I have 20 minutes, use the oven...',
      title: 'New Recipe',
      whoIsEating: 'Who is eating?',
      mealType: 'Meal Type',
      difficulty: 'Difficulty',
      specialRequests: 'Any special requests?',
      generateBtn: 'Generate Recipe'
    },
    members: {
      title: 'Kitchen Members',
      addMember: 'Add Guest / Member',
      editMember: 'Edit Member',
      invite: 'Invite Member',
      role: 'Role',
      likes: 'Likes',
      likesPlaceholder: 'e.g. Italian, Spicy',
      dislikes: 'Dislikes',
      restrictions: 'Dietary Restrictions',
      guestViewTitle: 'You are viewing this kitchen as a Guest.',
      guestViewDesc: 'Select your profile below to update your preferences.',
      none: 'None',
      safe: 'Safe',
      member: 'Member',
      linked: 'Linked',
      name: 'Name',
      namePlaceholder: 'e.g. Grandma, Mike',
      emailOptional: 'Email (Optional)',
      emailPlaceholder: 'invite@example.com'
    },
    pantry: {
      title: 'Pantry & Fridge',
      addItem: 'Add Item',
      search: 'Search pantry...',
      empty: 'No ingredients found.',
      subtitle: 'What do we have today? The AI will prioritize these items.'
    },
    actions: {
      generateTitle: 'Generate Recipe',
      generateDesc: 'Use AI to create meals with your pantry.',
      pantryTitle: 'Pantry',
      pantryDesc: 'Update ingredients.',
      kitchenTitle: 'Kitchen Management',
      kitchenDesc: 'Manage members and settings.',
      haveCode: 'Have an invite code?',
      joinCode: 'Join Kitchen',
      deleteDesc: 'This action cannot be undone. Are you sure you want to delete this recipe?',
      recent: 'Recent Recipes',
      failedJoin: 'Failed to join kitchen. Please check the code.'
    },
    kitchens: {
      title: 'Manage Kitchens',
      loading: 'Loading Kitchens...',
      yourKitchens: 'Your Kitchens',
      inviteCode: 'Invite Code',
      createTitle: 'Create New Kitchen',
      createPlaceholder: 'e.g. MasterChef Villa',
      create: 'Create'
    },
    recipeDetails: {
      backToRecipes: 'Back to Recipes'
    },
    settings: {
      title: 'Settings',
      subtitle: 'Manage your profile and preferences.',
      profile: 'Profile',
      preferences: 'Preferences',
      security: 'Security'
    }
  }
};

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => {
    const lang = 'en';
    const t = (key) => {
        const keys = key.split('.');
        let value = translations['en'];
        for (const k of keys) {
            if (value && value[k]) {
                value = value[k];
            } else {
                return key;
            }
        }
        return value || key;
    };
    return { t, lang };
  }
}));

