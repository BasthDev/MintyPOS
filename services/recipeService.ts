import * as SQLite from 'expo-sqlite';
import { dbOperations } from '../lib/database';

export interface RecipeDefinitionCreateInput {
  name: string;
  description?: string;
}

export interface RecipeDefinitionUpdateInput {
  name?: string;
  description?: string;
}

export interface RecipeIngredientCreateInput {
  recipeId: number;
  ingredientId?: number | null;
  semiProductId?: number | null;
  itemType?: 'ingredient' | 'semi_product';
  quantityNeededBase: number;
}

export interface RecipeIngredientUpdateInput {
  quantityNeededBase: number;
}

export class RecipeService {
  /**
   * Get all recipe definitions
   */
  static async getAllDefinitions(db: SQLite.SQLiteDatabase) {
    return await dbOperations.getAllRecipeDefinitions(db);
  }

  /**
   * Get recipe definition by ID
   */
  static async getDefinitionById(db: SQLite.SQLiteDatabase, id: number) {
    return await dbOperations.getRecipeDefinitionById(db, id);
  }

  /**
   * Create new recipe definition
   */
  static async createDefinition(db: SQLite.SQLiteDatabase, input: RecipeDefinitionCreateInput) {
    const recipeId = await dbOperations.createRecipeDefinition(db, input.name, input.description);
    return await this.getDefinitionById(db, recipeId);
  }

  /**
   * Update recipe definition
   */
  static async updateDefinition(db: SQLite.SQLiteDatabase, id: number, input: RecipeDefinitionUpdateInput) {
    await dbOperations.updateRecipeDefinition(db, id, input);
    return await this.getDefinitionById(db, id);
  }

  /**
   * Delete recipe definition
   */
  static async deleteDefinition(db: SQLite.SQLiteDatabase, id: number) {
    await dbOperations.deleteRecipeDefinition(db, id);
  }

  /**
   * Get recipe ingredients
   */
  static async getIngredients(db: SQLite.SQLiteDatabase, recipeId: number) {
    return await dbOperations.getRecipeIngredients(db, recipeId);
  }

  /**
   * Add ingredient or semi-product to recipe
   */
  static async addIngredient(db: SQLite.SQLiteDatabase, input: RecipeIngredientCreateInput) {
    const itemType = input.itemType || (input.semiProductId ? 'semi_product' : 'ingredient');
    const itemId = itemType === 'semi_product' ? input.semiProductId! : input.ingredientId!;

    await dbOperations.addRecipeIngredient(
      db,
      input.recipeId,
      itemId,
      input.quantityNeededBase,
      itemType
    );
    return await this.getIngredients(db, input.recipeId);
  }

  /**
   * Update recipe ingredient
   */
  static async updateIngredient(db: SQLite.SQLiteDatabase, id: number, input: RecipeIngredientUpdateInput) {
    await dbOperations.updateRecipeIngredient(db, id, input.quantityNeededBase);
    const dbResult = await db.getAllAsync(
      `SELECT ri.*, ri.recipe_id as recipeId FROM recipe_ingredients ri WHERE ri.id = ?`,
      [id]
    );
    return dbResult[0];
  }

  /**
   * Remove ingredient from recipe
   */
  static async removeIngredient(db: SQLite.SQLiteDatabase, id: number) {
    await dbOperations.removeRecipeIngredient(db, id);
  }

  /**
   * Create complete recipe with hybrid ingredients
   */
  static async createCompleteRecipe(
    db: SQLite.SQLiteDatabase,
    definition: RecipeDefinitionCreateInput,
    ingredients: Array<{
      ingredientId?: number | null;
      semiProductId?: number | null;
      itemType?: 'ingredient' | 'semi_product';
      quantityNeededBase: number;
    }>
  ) {
    const recipe = await this.createDefinition(db, definition);
    
    if (!recipe) {
      throw new Error('Failed to create recipe definition');
    }
    
    for (const ingredient of ingredients) {
      await this.addIngredient(db, {
        ...ingredient,
        recipeId: recipe.id,
      });
    }
    
    return recipe;
  }

  /**
   * Update complete recipe with ingredients
   */
  static async updateCompleteRecipe(
    db: SQLite.SQLiteDatabase,
    id: number,
    definition: RecipeDefinitionUpdateInput,
    ingredients: Array<{
      ingredientId?: number | null;
      semiProductId?: number | null;
      itemType?: 'ingredient' | 'semi_product';
      quantityNeededBase: number;
    }>
  ) {
    await this.updateDefinition(db, id, definition);

    // Delete existing recipe ingredients and re-insert updated ones
    await db.runAsync('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [id]);

    for (const ingredient of ingredients) {
      await this.addIngredient(db, {
        recipeId: id,
        ingredientId: ingredient.ingredientId,
        semiProductId: ingredient.semiProductId,
        itemType: ingredient.itemType,
        quantityNeededBase: ingredient.quantityNeededBase,
      });
    }

    return await this.getDefinitionById(db, id);
  }

  /**
   * Search recipe definitions
   */
  static async searchDefinitions(db: SQLite.SQLiteDatabase, query: string) {
    return await db.getAllAsync(
      'SELECT * FROM recipe_definitions WHERE name LIKE ? ORDER BY name',
      [`%${query}%`]
    );
  }
}