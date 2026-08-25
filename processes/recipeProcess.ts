import * as SQLite from 'expo-sqlite';
import { RecipeDefinitionCreateInput, RecipeDefinitionUpdateInput, RecipeService } from '../services/recipeService';
import { RecipeValidator } from '../validators/recipeValidator';

export interface ProcessResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export class RecipeProcess {
  /**
   * Create recipe definition with validation
   */
  static async createDefinition(
    db: SQLite.SQLiteDatabase,
    input: RecipeDefinitionCreateInput
  ): Promise<ProcessResult<any>> {
    const validation = RecipeValidator.validateCreateDefinition(input);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    try {
      const recipe = await RecipeService.createDefinition(db, input);
      return {
        success: true,
        data: recipe,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create recipe',
      };
    }
  }

  /**
   * Create complete recipe with ingredients
   */
  static async createCompleteRecipe(
    db: SQLite.SQLiteDatabase,
    definition: RecipeDefinitionCreateInput,
    ingredients: Array<{ ingredientId: number; quantityNeededBase: number }>
  ): Promise<ProcessResult<any>> {
    const validation = RecipeValidator.validateCompleteRecipe(definition, ingredients);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    try {
      const recipe = await RecipeService.createDefinition(db, definition);
      
      if (!recipe) {
        return {
          success: false,
          error: 'Failed to create recipe definition',
        };
      }
      
      // Add ingredients with recipeId
      for (const ingredient of ingredients) {
        await RecipeService.addIngredient(db, {
          recipeId: recipe.id,
          ingredientId: ingredient.ingredientId,
          quantityNeededBase: ingredient.quantityNeededBase,
        });
      }
      
      return {
        success: true,
        data: recipe,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create recipe',
      };
    }
  }

  /**
   * Update complete recipe with ingredients
   */
  static async updateCompleteRecipe(
    db: SQLite.SQLiteDatabase,
    id: number,
    definition: RecipeDefinitionUpdateInput,
    ingredients: Array<{ ingredientId: number; quantityNeededBase: number }>
  ): Promise<ProcessResult<any>> {
    const idValidation = RecipeValidator.validateId(id);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    if (!definition.name || definition.name.trim().length === 0) {
      return {
        success: false,
        errors: ['Recipe name is required'],
      };
    }

    if (!ingredients || ingredients.length === 0) {
      return {
        success: false,
        errors: ['At least one ingredient is required'],
      };
    }

    try {
      const recipe = await RecipeService.updateCompleteRecipe(db, id, definition, ingredients);
      return {
        success: true,
        data: recipe,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update recipe',
      };
    }
  }

  /**
   * Update recipe definition with validation
   */
  static async updateDefinition(
    db: SQLite.SQLiteDatabase,
    id: number,
    input: RecipeDefinitionUpdateInput
  ): Promise<ProcessResult<any>> {
    const idValidation = RecipeValidator.validateId(id);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    const validation = RecipeValidator.validateUpdateDefinition(input);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    try {
      const recipe = await RecipeService.updateDefinition(db, id, input);
      if (!recipe) {
        return {
          success: false,
          error: 'Recipe not found',
        };
      }
      return {
        success: true,
        data: recipe,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update recipe',
      };
    }
  }

  /**
   * Delete recipe definition with validation
   */
  static async deleteDefinition(
    db: SQLite.SQLiteDatabase,
    id: number
  ): Promise<ProcessResult<void>> {
    const idValidation = RecipeValidator.validateId(id);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    try {
      await RecipeService.deleteDefinition(db, id);
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete recipe',
      };
    }
  }

  /**
   * Get all recipe definitions
   */
  static async getAllDefinitions(db: SQLite.SQLiteDatabase): Promise<ProcessResult<any[]>> {
    try {
      const recipes = await RecipeService.getAllDefinitions(db);
      return {
        success: true,
        data: recipes,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch recipes',
      };
    }
  }

  /**
   * Get recipe definition by ID
   */
  static async getDefinitionById(db: SQLite.SQLiteDatabase, id: number): Promise<ProcessResult<any>> {
    const idValidation = RecipeValidator.validateId(id);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    try {
      const recipe = await RecipeService.getDefinitionById(db, id);
      if (!recipe) {
        return {
          success: false,
          error: 'Recipe not found',
        };
      }
      return {
        success: true,
        data: recipe,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch recipe',
      };
    }
  }

  /**
   * Get recipe ingredients
   */
  static async getIngredients(db: SQLite.SQLiteDatabase, recipeId: number): Promise<ProcessResult<any[]>> {
    const idValidation = RecipeValidator.validateId(recipeId);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    try {
      const ingredients = await RecipeService.getIngredients(db, recipeId);
      return {
        success: true,
        data: ingredients,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch recipe ingredients',
      };
    }
  }

  /**
   * Add ingredient to recipe
   */
  static async addIngredient(
    db: SQLite.SQLiteDatabase,
    recipeId: number,
    ingredientId: number,
    quantityNeededBase: number
  ): Promise<ProcessResult<any[]>> {
    const idValidation = RecipeValidator.validateId(recipeId);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    const ingredientValidation = RecipeValidator.validateIngredient(ingredientId, quantityNeededBase);
    if (!ingredientValidation.isValid) {
      return {
        success: false,
        errors: ingredientValidation.errors,
      };
    }

    try {
      const ingredients = await RecipeService.addIngredient(db, {
        recipeId,
        ingredientId,
        quantityNeededBase,
      });
      return {
        success: true,
        data: ingredients,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add ingredient to recipe',
      };
    }
  }

  /**
   * Remove ingredient from recipe
   */
  static async removeIngredient(
    db: SQLite.SQLiteDatabase,
    ingredientId: number
  ): Promise<ProcessResult<void>> {
    try {
      await RecipeService.removeIngredient(db, ingredientId);
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove ingredient from recipe',
      };
    }
  }

  /**
   * Search recipe definitions
   */
  static async searchDefinitions(db: SQLite.SQLiteDatabase, query: string): Promise<ProcessResult<any[]>> {
    if (!query || query.trim().length === 0) {
      return {
        success: false,
        errors: ['Search query is required'],
      };
    }

    try {
      const recipes = await RecipeService.searchDefinitions(db, query);
      return {
        success: true,
        data: recipes,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search recipes',
      };
    }
  }
}