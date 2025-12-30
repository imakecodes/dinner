# RecipeIngredient Usage Analysis

## Question
Why is the `RecipeIngredient` table seemingly never used?

## Analysis
The `RecipeIngredient` table **IS** active and used as the Many-to-Many link between `Recipe` and `Ingredient`.

### 1. Creation (`POST /api/recipes`)
When a recipe is saved, the API writes to the `ingredients` relation on the `Recipe` model.
```typescript
// app/api/recipes/route.ts
ingredients: {
  create: pantryIngredients.map((item) => ({
    inPantry: true,
    quantity: item.quantity,
    unit: item.unit,
    ingredient: { ... } // Connects or Creates Ingredient
  }))
}
```
This Prisma syntax (`ingredients: { create: ... }`) automatically creates records in the `RecipeIngredient` table.

### 2. Reading (`GET /api/recipes`)
When fetching recipes, the API includes this relation:
```typescript
// app/api/recipes/route.ts
include: {
  ingredients: { // This refers to RecipeIngredient
    include: {
      ingredient: true // This refers to the actual Ingredient definition
    }
  }
}
```
The frontend then maps this data to `ingredients_from_pantry`.

### Conclusion
The table is critical for linking recipes to specific ingredients while storing recipe-specific metadata like `quantity`, `unit`, and `amount` for that specific dish.
