import { Header } from '@/components/Header';
import { Section } from '@/components/Section';
import { useTheme } from '@/constants/colorTheme';
import { CRMConfigItem, getDatabase } from '@/lib/database';
import { formatCurrency } from '@/lib/utils';
import { CRMProcess } from '@/processes/crmProcess';
import { useStore } from '@/store/useStore';
import { Award, Check, Coins, Percent, Save, Settings, ShieldAlert, Sparkles } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function CRMLoyaltyScreen() {
  const { theme } = useTheme();
  const currency = useStore((state) => state.currency);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form State
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);
  const [pointsPerCurrency, setPointsPerCurrency] = useState('0.01');
  const [minTransactionForPoints, setMinTransactionForPoints] = useState('0');
  const [tierUpgradeEnabled, setTierUpgradeEnabled] = useState(true);
  const [bronzeThreshold, setBronzeThreshold] = useState('1000000');
  const [silverThreshold, setSilverThreshold] = useState('5000000');
  const [goldThreshold, setGoldThreshold] = useState('10000000');
  const [redemptionEnabled, setRedemptionEnabled] = useState(true);
  const [pointsToCurrencyRatio, setPointsToCurrencyRatio] = useState('0.01');
  const [minPointsToRedeem, setMinPointsToRedeem] = useState('100');
  const [maxRedemptionPct, setMaxRedemptionPct] = useState('50');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      const res = await CRMProcess.getConfig(db);
      if (res.success && res.data) {
        const c = res.data;
        setLoyaltyEnabled(c.loyalty_enabled === 1);
        setPointsPerCurrency(String(c.points_per_currency ?? 0.01));
        setMinTransactionForPoints(String(c.min_transaction_for_points ?? 0));
        setTierUpgradeEnabled(c.tier_upgrade_enabled === 1);
        setBronzeThreshold(String(c.bronze_threshold ?? 1000000));
        setSilverThreshold(String(c.silver_threshold ?? 5000000));
        setGoldThreshold(String(c.gold_threshold ?? 10000000));
        setRedemptionEnabled(c.redemption_enabled === 1);
        setPointsToCurrencyRatio(String(c.points_to_currency_ratio ?? 0.01));
        setMinPointsToRedeem(String(c.min_points_to_redeem ?? 100));
        setMaxRedemptionPct(String(c.max_redemption_pct ?? 50));
      }
    } catch (err) {
      console.error('Failed to load CRM config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const db = await getDatabase();
      const res = await CRMProcess.updateConfig(db, {
        loyaltyEnabled,
        pointsPerCurrency: parseFloat(pointsPerCurrency) || 0.01,
        minTransactionForPoints: parseFloat(minTransactionForPoints) || 0,
        tierUpgradeEnabled,
        bronzeThreshold: parseFloat(bronzeThreshold) || 1000000,
        silverThreshold: parseFloat(silverThreshold) || 5000000,
        goldThreshold: parseFloat(goldThreshold) || 10000000,
        redemptionEnabled,
        pointsToCurrencyRatio: parseFloat(pointsToCurrencyRatio) || 0.01,
        minPointsToRedeem: parseInt(minPointsToRedeem) || 100,
        maxRedemptionPct: parseFloat(maxRedemptionPct) || 50,
      });

      if (!res.success) {
        Alert.alert('Error', res.error || (res.errors && res.errors[0]) || 'Failed to save configuration');
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update CRM settings');
    } finally {
      setSaving(false);
    }
  };

  const leftPanel = (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <View style={styles.formContainer}>
          {/* Card 1: Earning Rules */}
          <View style={[styles.configCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <Coins size={20} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Loyalty Points Earning</Text>
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Enable Loyalty Points</Text>
                <Text style={[styles.switchSub, { color: theme.textSecondary }]}>
                  Customers earn points on completed checkout
                </Text>
              </View>
              <Switch
                value={loyaltyEnabled}
                onValueChange={setLoyaltyEnabled}
                trackColor={{ false: '#D1D5DB', true: theme.primary }}
              />
            </View>

            {loyaltyEnabled && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    Points Earned Per 1 {currency?.symbol || '$'} Spent
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
                    keyboardType="numeric"
                    value={pointsPerCurrency}
                    onChangeText={setPointsPerCurrency}
                  />
                  <Text style={[styles.inputNote, { color: theme.textTertiary }]}>
                    e.g. 0.01 = 1 Point per {formatCurrency(100)} spent
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    Minimum Order Spend to Earn Points ({currency?.symbol || '$'})
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
                    keyboardType="numeric"
                    value={minTransactionForPoints}
                    onChangeText={setMinTransactionForPoints}
                  />
                </View>
              </>
            )}
          </View>

          {/* Card 2: Point Redemption */}
          <View style={[styles.configCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <Sparkles size={20} color={theme.warning} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Point Redemption</Text>
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Enable Point Redemption</Text>
                <Text style={[styles.switchSub, { color: theme.textSecondary }]}>
                  Allow customers to redeem points as discounts during payment
                </Text>
              </View>
              <Switch
                value={redemptionEnabled}
                onValueChange={setRedemptionEnabled}
                trackColor={{ false: '#D1D5DB', true: theme.primary }}
              />
            </View>

            {redemptionEnabled && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    Value per 1 Point ({currency?.symbol || '$'})
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
                    keyboardType="numeric"
                    value={pointsToCurrencyRatio}
                    onChangeText={setPointsToCurrencyRatio}
                  />
                  <Text style={[styles.inputNote, { color: theme.textTertiary }]}>
                    e.g. 0.01 = 100 Points = {formatCurrency(1)} discount
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    Minimum Points to Redeem
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
                    keyboardType="numeric"
                    value={minPointsToRedeem}
                    onChangeText={setMinPointsToRedeem}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    Max Redemption Cap (% of Order Subtotal)
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
                    keyboardType="numeric"
                    value={maxRedemptionPct}
                    onChangeText={setMaxRedemptionPct}
                  />
                </View>
              </>
            )}
          </View>

          {/* Card 3: Membership Tiers */}
          <View style={[styles.configCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <Award size={20} color="#D97706" />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Membership Tiers</Text>
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Enable Tier Upgrades</Text>
                <Text style={[styles.switchSub, { color: theme.textSecondary }]}>
                  Automatically upgrade tier based on total lifetime spend
                </Text>
              </View>
              <Switch
                value={tierUpgradeEnabled}
                onValueChange={setTierUpgradeEnabled}
                trackColor={{ false: '#D1D5DB', true: theme.primary }}
              />
            </View>

            {tierUpgradeEnabled && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    Bronze Tier Minimum Spend ({currency?.symbol || '$'})
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
                    keyboardType="numeric"
                    value={bronzeThreshold}
                    onChangeText={setBronzeThreshold}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    Silver Tier Minimum Spend ({currency?.symbol || '$'})
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
                    keyboardType="numeric"
                    value={silverThreshold}
                    onChangeText={setSilverThreshold}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    Gold Tier Minimum Spend ({currency?.symbol || '$'})
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
                    keyboardType="numeric"
                    value={goldThreshold}
                    onChangeText={setGoldThreshold}
                  />
                </View>
              </>
            )}
          </View>

          {/* Save Action Button */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: saved ? theme.success : theme.primary },
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : saved ? (
              <>
                <Check size={18} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Settings Saved!</Text>
              </>
            ) : (
              <>
                <Save size={18} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Save CRM Configuration</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  const rightPanel = (
    <View style={styles.sideInfoContainer}>
      <View style={[styles.infoBanner, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Sparkles size={28} color={theme.primary} />
        <Text style={[styles.infoBannerTitle, { color: theme.text }]}>CRM & Loyalty Benefits</Text>
        <Text style={[styles.infoBannerBody, { color: theme.textSecondary }]}>
          Build customer retention by allowing loyal customers to earn points on every purchase and redeem points for discounts during checkout.
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="CRM & Loyalty Settings" />
      <Section leftPanel={leftPanel} rightPanel={rightPanel} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  centered: {
    padding: 40,
    alignItems: 'center',
  },
  formContainer: {
    gap: 16,
    paddingBottom: 40,
  },
  configCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  switchSub: {
    fontSize: 12,
    marginTop: 2,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  inputNote: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  saveBtn: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  sideInfoContainer: {
    flex: 1,
    padding: 16,
  },
  infoBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  infoBannerBody: {
    fontSize: 13,
    lineHeight: 20,
  },
});
