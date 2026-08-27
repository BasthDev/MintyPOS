export interface CRMConfigInput {
  loyaltyEnabled: boolean;
  pointsPerCurrency: number;
  minTransactionForPoints: number;
  tierUpgradeEnabled: boolean;
  bronzeThreshold: number;
  silverThreshold: number;
  goldThreshold: number;
  redemptionEnabled: boolean;
  pointsToCurrencyRatio: number;
  minPointsToRedeem: number;
  maxRedemptionPct: number;
}

export interface CRMValidationResult {
  isValid: boolean;
  errors: string[];
}

export class CRMValidator {
  static validate(input: CRMConfigInput): CRMValidationResult {
    const errors: string[] = [];

    if (input.pointsPerCurrency < 0) {
      errors.push('Points per currency ratio must be non-negative');
    }
    if (input.minTransactionForPoints < 0) {
      errors.push('Minimum transaction for points must be non-negative');
    }
    if (input.bronzeThreshold < 0 || input.silverThreshold < 0 || input.goldThreshold < 0) {
      errors.push('Tier thresholds must be non-negative');
    }
    if (input.pointsToCurrencyRatio < 0) {
      errors.push('Points redemption ratio must be non-negative');
    }
    if (input.minPointsToRedeem < 0) {
      errors.push('Minimum points to redeem must be non-negative');
    }
    if (input.maxRedemptionPct < 0 || input.maxRedemptionPct > 100) {
      errors.push('Maximum redemption percentage must be between 0 and 100');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
