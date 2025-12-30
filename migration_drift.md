# Database Drift Detected
**Timestamp:** 2025-12-30

During the migration `init_orchestrator`, the following drift was detected in the database schema vs migration history:

```
[*] Changed the `Ingredient` table
  [+] Added column `originalIngredientId`
  [+] Added index on columns (originalIngredientId)
  [+] Added foreign key on columns (originalIngredientId)

[*] Changed the `Recipe` table
  [+] Added column `originalRecipeId`
  [+] Added index on columns (originalRecipeId)
  [+] Added foreign key on columns (originalRecipeId)

[*] Changed the `ShoppingItem` table
  [+] Added column `originalShoppingItemId`
  [+] Added index on columns (originalShoppingItemId)
  [+] Added foreign key on columns (originalShoppingItemId)

[*] Changed the `User` table
  [+] Added column `language`
```

**Action Taken:** The database was reset to apply the new schema cleanly.
