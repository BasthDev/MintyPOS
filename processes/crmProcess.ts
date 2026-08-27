import { CRMConfigItem } from '@/lib/database';
import { CRMService } from '@/services/crmService';
import { CRMConfigInput, CRMValidator } from '@/validators/crmValidator';
import * as SQLite from 'expo-sqlite';

export class CRMProcess {
  static async getConfig(db: SQLite.SQLiteDatabase): Promise<{ success: boolean; data?: CRMConfigItem | null; error?: string }> {
    try {
      const data = await CRMService.getConfig(db);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch CRM config' };
    }
  }

  static async updateConfig(
    db: SQLite.SQLiteDatabase,
    input: CRMConfigInput
  ): Promise<{ success: boolean; error?: string; errors?: string[] }> {
    const validation = CRMValidator.validate(input);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors, error: validation.errors[0] };
    }

    try {
      await CRMService.updateConfig(db, {
        loyalty_enabled: input.loyaltyEnabled ? 1 : 0,
        points_per_currency: input.pointsPerCurrency,
        min_transaction_for_points: input.minTransactionForPoints,
        tier_upgrade_enabled: input.tierUpgradeEnabled ? 1 : 0,
        bronze_threshold: input.bronzeThreshold,
        silver_threshold: input.silverThreshold,
        gold_threshold: input.goldThreshold,
        redemption_enabled: input.redemptionEnabled ? 1 : 0,
        points_to_currency_ratio: input.pointsToCurrencyRatio,
        min_points_to_redeem: input.minPointsToRedeem,
        max_redemption_pct: input.maxRedemptionPct,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update CRM config' };
    }
  }
}
