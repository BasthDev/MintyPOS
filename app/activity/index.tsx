import { Header } from '@/components/Header';
import { Section } from '@/components/Section';
import { useTheme } from '@/constants/colorTheme';
import { dbOperations, getDatabase } from '@/lib/database';
import { Activity, ArrowDown, ArrowUp, Package, ShoppingCart } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type ActivityType = 'stock_add' | 'stock_deduct' | 'order' | 'restock';

interface ActivityLog {
  id: number;
  type: ActivityType;
  entity_type: 'ingredient' | 'product' | 'order';
  entity_id: number;
  entity_name: string;
  quantity: number;
  unit: string;
  description: string;
  created_at: string;
}

export default function ActivityScreen() {
  const { theme } = useTheme();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [filter, setFilter] = useState<ActivityType | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);

  useEffect(() => {
    loadActivities();
  }, [filter]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      let logs;
      if (filter === 'all') {
        logs = await dbOperations.getAllActivityLogs(db, 100);
      } else {
        logs = await dbOperations.getActivityLogsByType(db, filter, 100);
      }
      setActivities(logs);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'stock_add':
        return <ArrowDown size={18} color={theme.success} />;
      case 'stock_deduct':
        return <ArrowUp size={18} color={theme.error} />;
      case 'order':
        return <ShoppingCart size={18} color={theme.primary} />;
      case 'restock':
        return <Package size={18} color={theme.warning} />;
      default:
        return <Activity size={18} color={theme.textSecondary} />;
    }
  };

  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case 'stock_add':
        return theme.success;
      case 'stock_deduct':
        return theme.error;
      case 'order':
        return theme.primary;
      case 'restock':
        return theme.warning;
      default:
        return theme.textSecondary;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // --- LEFT PANEL (Main Screen: Filters & Activity Log List) ---
  const leftPanel = (
    <View style={styles.leftPanelContainer}>
      <Text style={[styles.title, { color: theme.text }]}>Activity Log</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Track all stock movements and orders
      </Text>

      <View style={styles.filterContainer}>
        {(['all', 'stock_add', 'stock_deduct', 'order', 'restock'] as const).map((type) => {
          const isActive = filter === type;
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterButton,
                { borderColor: theme.border, backgroundColor: theme.card },
                isActive && { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}
              onPress={() => setFilter(type)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  { color: theme.textSecondary },
                  isActive && { color: '#FFFFFF' },
                ]}
              >
                {type === 'all' ? 'All' : type.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : activities.length === 0 ? (
        <View style={styles.emptyListContainer}>
          <Activity size={48} color={theme.textTertiary || '#888'} />
          <Text style={[styles.emptyListText, { color: theme.text }]}>No activities logged</Text>
        </View>
      ) : (
        <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
          {activities.map((item) => {
            const isSelected = selectedActivity?.id === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                style={[
                  styles.activityCard,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.card,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setSelectedActivity(item)}
              >
                <View style={styles.cardMain}>
                  <View style={[styles.iconBadge, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : theme.input }]}>
                    {getActivityIcon(item.type)}
                  </View>
                  <View style={styles.cardInfo}>
                    <Text
                      style={[
                        styles.cardName,
                        { color: isSelected ? '#FFFFFF' : theme.text },
                      ]}
                      numberOfLines={1}
                    >
                      {item.entity_name}
                    </Text>
                    <Text
                      style={[
                        styles.cardDesc,
                        { color: isSelected ? '#E0F2FE' : theme.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {item.description}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.cardTime,
                      { color: isSelected ? '#CBD5E1' : theme.textTertiary },
                    ]}
                  >
                    {formatDateTime(item.created_at)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  // --- RIGHT PANEL (Activity Details View) ---
  const rightPanel = selectedActivity ? (
    <View style={styles.detailsContainer}>
      <View style={[styles.detailsHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.detailsTitleRow}>
          <View style={[styles.detailsIconBadge, { backgroundColor: theme.input }]}>
            {getActivityIcon(selectedActivity.type)}
          </View>
          <View style={styles.detailsHeaderMeta}>
            <Text style={[styles.detailsTitle, { color: theme.text }]}>
              {selectedActivity.entity_name}
            </Text>
            <Text style={[styles.detailsSubtitle, { color: getActivityColor(selectedActivity.type) }]}>
              {selectedActivity.type.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.infoCardTitle, { color: theme.text }]}>Log Information</Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Target Item:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{selectedActivity.entity_name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Event Type:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{selectedActivity.type}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Description:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{selectedActivity.description}</Text>
          </View>

          {selectedActivity.quantity && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Quantity Change:</Text>
              <Text style={[styles.infoValue, { color: getActivityColor(selectedActivity.type), fontWeight: '700' }]}>
                {selectedActivity.type === 'stock_deduct' ? '-' : '+'}{selectedActivity.quantity} {selectedActivity.unit}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Timestamp:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{formatDateTime(selectedActivity.created_at)}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  ) : (
    <View style={styles.emptyDetailsState}>
      <Activity size={64} color={theme.textTertiary || '#888'} />
      <Text style={[styles.emptyDetailsTitle, { color: theme.text }]}>No Activity Selected</Text>
      <Text style={[styles.emptyDetailsSubtext, { color: theme.textSecondary }]}>
        Select an activity item from the list to view its complete audit details.
      </Text>
    </View>
  );

  return (
    <>
      <Header title="Activity" />
      <Section
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showNextScreen={!!selectedActivity}
        onBack={() => setSelectedActivity(null)}
        backButtonTitle="Back to Activity Logs"
        childrenPadding={16}
      />
    </>
  );
}

const styles = StyleSheet.create({
  leftPanelContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyListText: {
    marginTop: 12,
    fontSize: 14,
  },
  listScroll: {
    flex: 1,
  },
  activityCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  cardTime: {
    fontSize: 11,
  },
  detailsContainer: {
    flex: 1,
  },
  detailsHeader: {
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  detailsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailsIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsHeaderMeta: {
    flex: 1,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  detailsSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  detailsScroll: {
    flex: 1,
    marginTop: 16,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyDetailsState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyDetailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 6,
  },
  emptyDetailsSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
