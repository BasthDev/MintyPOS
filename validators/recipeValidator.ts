import { RecipeDefinitionCreateInput, RecipeDefinitionUpdateInput } from '../services/recipeService';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class RecipeValidator {
  /**
   * Validate recipe definition creation input
   */
  static validateCreateDefinition(input: RecipeDefinitionCreateInput): ValidationResult {
    const errors: string[] = [];

    // Name validation
    if (!input.name || input.name.trim().length === 0) {
      errors.push('Recipe name is required');
    } else if (input.name.length < 2) {
      errors.push('Recipe name must be at least 2 characters');
    } else if (input.name.length > 100) {
      errors.push('Recipe name must not exceed 100 characters');
    }

    // Description validation
    if (input.description !== undefined && input.description.length > 500) {
      errors.push('Description must not exceed 500 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate recipe definition update input
   */
  static validateUpdateDefinition(input: RecipeDefinitionUpdateInput): ValidationResult {
    const errors: string[] = [];

    // Name validation
    if (input.name !== undefined) {
      if (input.name.trim().length === 0) {
        errors.push('Recipe name cannot be empty');
      } else if (input.name.length < 2) {
        errors.push('Recipe name must be at least 2 characters');
      } else if (input.name.length > 100) {
        errors.push('Recipe name must not exceed 100 characters');
      }
    }

    // Description validation
    if (input.description !== undefined && input.description.length > 500) {
      errors.push('Description must not exceed 500 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate recipe ingredient input
   */
  static validateIngredient(
    itemId: number,
    quantityNeededBase: number,
    itemType: 'ingredient' | 'semi_product' = 'ingredient'
  ): ValidationResult {
    const errors: string[] = [];

    if (!itemId || typeof itemId !== 'number' || itemId <= 0) {
      errors.push(`Invalid ${itemType === 'semi_product' ? 'semi-product' : 'ingredient'} ID`);
    }

    if (quantityNeededBase === undefined || quantityNeededBase === null) {
      errors.push('Quantity is required');
    } else if (typeof quantityNeededBase !== 'number' || quantityNeededBase <= 0) {
      errors.push('Quantity must be a positive number');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate recipe ID
   */
  static validateId(id: number): ValidationResult {
    const errors: string[] = [];

    if (!id || typeof id !== 'number' || id <= 0) {
      errors.push('Invalid recipe ID');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate complete recipe creation (definition + ingredients)
   */
  static validateCompleteRecipe(
    definition: RecipeDefinitionCreateInput,
    ingredients: Array<{
      ingredientId?: number | null;
      semiProductId?: number | null;
      itemType?: 'ingredient' | 'semi_product';
      quantityNeededBase: number;
    }>
  ): ValidationResult {
    const errors: string[] = [];

    // Validate definition
    const definitionValidation = this.validateCreateDefinition(definition);
    if (!definitionValidation.isValid) {
      errors.push(...definitionValidation.errors);
    }

    // Validate ingredients
    if (!ingredients || ingredients.length === 0) {
      errors.push('Recipe must have at least one ingredient or semi-product component');
    } else {
      ingredients.forEach((ing, index) => {
        const itemType = ing.itemType || (ing.semiProductId ? 'semi_product' : 'ingredient');
        const itemId = itemType === 'semi_product' ? (ing.semiProductId || 0) : (ing.ingredientId || 0);
        const ingValidation = this.validateIngredient(itemId, ing.quantityNeededBase, itemType);
        if (!ingValidation.isValid) {
          errors.push(`Item ${index + 1}: ${ingValidation.errors.join(', ')}`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}