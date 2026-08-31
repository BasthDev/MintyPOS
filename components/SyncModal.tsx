import { DripProgressBar } from '@/components/Progressbar';
import { useTheme } from '@/constants/colorTheme';
import { Cloud, Loader2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SyncProgress {
  entity: string;
  entityLabel: string;
  pushed: number;
  pulled: number;
  total: number;
  status: 'pending' | 'pushing' | 'pulling' | 'completed' | 'error';
  error?: string;
}

interface SyncModalProps {
  visible: boolean;
  onClose: () => void;
  syncFunction: (onProgress: (progress: SyncProgress) => void) => Promise<any>;
}

const ENTITY_LABELS: Record<string, string> = {
  unit: 'Units',
  supplier: 'Suppliers',
  category: 'Categories',
  payment_method: 'Payment Methods',
  tax_config: 'Tax Configs',
  discount: 'Discounts',
  crm_config: 'CRM Configs',
  customer: 'Customers',
  ingredient: 'Ingredients',
  ingredient_unit: 'Ingredient Units',
  inventory_batch: 'Inventory Batches',
  semi_product: 'Semi Products',
  semi_product_recipe: 'Semi Product Recipes',
  semi_product_batch: 'Semi Product Batches',
  recipe_definition: 'Recipes',
  recipe_ingredient: 'Recipe Ingredients',
  product: 'Products',
  purchase_order: 'Purchase Orders',
  purchase_order_item: 'Purchase Order Items',
  order: 'Orders',
  order_item: 'Order Items',
  order_split: 'Order Splits',
  loyalty_transaction: 'Loyalty Transactions',
  balance_transaction: 'Balance Transactions',
  activity_log: 'Activity Logs',
};

export const SyncModal: React.FC<SyncModalProps> = ({
  visible,
  onClose,
  syncFunction,
}) => {
  const { theme } = useTheme();
  const [syncProgress, setSyncProgress] = useState<SyncProgress[]>([]);
  const [currentPhase, setCurrentPhase] = useState<'push' | 'pull' | 'complete' | 'error'>('push');
  const [isComplete, setIsComplete] = useState(false);
  const [totalPushed, setTotalPushed] = useState(0);
  const [totalPulled, setTotalPulled] = useState(0);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    if (visible) {
      resetSyncState();
      startSync();
    }
  }, [visible]);

  const resetSyncState = () => {
    setSyncProgress([]);
    setCurrentPhase('push');
    setIsComplete(false);
    setTotalPushed(0);
    setTotalPulled(0);
    setCanClose(false);
  };

  const startSync = async () => {
    try {
      await syncFunction((progress) => {
        setSyncProgress((prev) => {
          const existingIndex = prev.findIndex((p) => p.entity === progress.entity);
          const updatedProgress = { ...progress, entityLabel: ENTITY_LABELS[progress.entity] || progress.entity };
          
          if (existingIndex >= 0) {
            const newProgress = [...prev];
            newProgress[existingIndex] = updatedProgress;
            return newProgress;
          } else {
            return [...prev, updatedProgress];
          }
        });

        // Update phase based on status
        if (progress.status === 'pushing') {
          setCurrentPhase('push');
        } else if (progress.status === 'pulling') {
          setCurrentPhase('pull');
        }

        // Update totals
        if (progress.status === 'completed') {
          setTotalPushed((prev) => prev + progress.pushed);
          setTotalPulled((prev) => prev + progress.pulled);
        }
      });

      setCurrentPhase('complete');
      setIsComplete(true);
      setCanClose(true);
    } catch (error) {
      setCurrentPhase('error');
      setCanClose(true);
    }
  };

  const getOverallProgress = () => {
    const totalEntities = syncProgress.length;
    const completedEntities = syncProgress.filter((p) => p.status === 'completed').length;
    return totalEntities > 0 ? completedEntities : 0;
  };

  const getStatusColor = (status: SyncProgress['status']) => {
    switch (status) {
      case 'pending':
        return theme.textSecondary;
      case 'pushing':
        return theme.primary;
      case 'pulling':
        return '#3B82F6';
      case 'completed':
        return '#10B981';
      case 'error':
        return '#EF4444';
      default:
        return theme.textSecondary;
    }
  };

  const getStatusText = (status: SyncProgress['status']) => {
    switch (status) {
      case 'pending':
        return 'Waiting...';
      case 'pushing':
        return 'Pushing to cloud';
      case 'pulling':
        return 'Pulling from cloud';
      case 'completed':
        return 'Synced';
      case 'error':
        return 'Failed';
      default:
        return '';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={canClose ? onClose : undefined}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[styles.modal, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <Cloud size={24} color={theme.primary} />
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: theme.text }]}>Cloud Synchronization</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  {currentPhase === 'push' && 'Pushing local changes to cloud...'}
                  {currentPhase === 'pull' && 'Pulling latest data from cloud...'}
                  {currentPhase === 'complete' && 'Synchronization complete!'}
                  {currentPhase === 'error' && 'Synchronization failed'}
                </Text>
              </View>
            </View>
            {canClose && (
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: theme.input }]}
                onPress={onClose}
              >
                <X size={20} color={theme.text} />
              </TouchableOpacity>
            )}
          </View>

          {/* Overall Progress */}
          <View style={[styles.overallProgress, { backgroundColor: theme.input, borderColor: theme.border }]}>
            <View style={styles.overallInfo}>
              <Text style={[styles.overallLabel, { color: theme.text }]}>
                Progress: {getOverallProgress()} / {syncProgress.length} tables
              </Text>
              <Text style={[styles.overallStats, { color: theme.textSecondary }]}>
                Pushed: {totalPushed} | Pulled: {totalPulled}
              </Text>
            </View>
            {!isComplete && (
              <Loader2 size={20} color={theme.primary} style={styles.spinner} />
            )}
          </View>

          {/* Entity Progress List */}
          <ScrollView style={styles.entityList} showsVerticalScrollIndicator={false}>
            {syncProgress.map((progress, index) => (
              <View
                key={progress.entity}
                style={[
                  styles.entityCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={styles.entityHeader}>
                  <Text style={[styles.entityName, { color: theme.text }]}>
                    {progress.entityLabel}
                  </Text>
                  <Text style={[styles.entityStatus, { color: getStatusColor(progress.status) }]}>
                    {getStatusText(progress.status)}
                  </Text>
                </View>

                {/* Push Progress - Always show if status is pushing or has pushed data */}
                {(progress.status === 'pushing' || progress.pushed > 0) && (
                  <View style={styles.progressRow}>
                    <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
                      Push: {progress.pushed} records
                    </Text>
                    <DripProgressBar
                      current={progress.pushed}
                      max={progress.total || Math.max(progress.pushed, 1)}
                      showValues={false}
                      style={styles.progressBar}
                    />
                  </View>
                )}

                {/* Pull Progress - Always show if status is pulling or has pulled data */}
                {(progress.status === 'pulling' || progress.pulled > 0) && (
                  <View style={styles.progressRow}>
                    <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
                      Pull: {progress.pulled} records
                    </Text>
                    <DripProgressBar
                      current={progress.pulled}
                      max={progress.total || Math.max(progress.pulled, 1)}
                      showValues={false}
                      style={styles.progressBar}
                    />
                  </View>
                )}

                {progress.error && (
                  <Text style={[styles.errorText, { color: theme.error }]}>
                    {progress.error}
                  </Text>
                )}
              </View>
            ))}

            {syncProgress.length === 0 && !isComplete && (
              <View style={styles.emptyState}>
                <Loader2 size={32} color={theme.primary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Initializing sync...
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          {isComplete && (
            <View style={[styles.footer, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.footerButton, { backgroundColor: theme.primary }]}
                onPress={onClose}
              >
                <Text style={styles.footerButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overallProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  overallInfo: {
    flex: 1,
  },
  overallLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  overallStats: {
    fontSize: 12,
    marginTop: 2,
  },
  spinner: {
    marginLeft: 8,
  },
  entityList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  entityCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  entityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entityName: {
    fontSize: 14,
    fontWeight: '600',
  },
  entityStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBar: {
    marginTop: 4,
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  progressLabel: {
    fontSize: 11,
    minWidth: 60,
  },
  errorText: {
    fontSize: 11,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
  },
  footerButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  footerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});