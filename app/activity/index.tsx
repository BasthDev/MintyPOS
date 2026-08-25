import { Header } from '@/components/Header';
import { DripSearchBar } from '@/components/SearchBar';
import { Section } from '@/components/Section';
import { useTheme } from '@/constants/colorTheme';
import { dbOperations, getDatabase } from '@/lib/database';
import { Activity, ArrowDown, ArrowUp, Clock, Package, RefreshCw, ShoppingCart } from 'lucide-react-native';
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
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);

  // Summary statistics
  const [stats, setStats] = useState({
    total: 0,
    additions: 0,
    deductions: 0,
    orders: 0,
  });

  useEffect(() => {
    loadActivities();
  }, [filter]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      let logs: ActivityLog[];
      if (filter === 'all') {
        logs = await dbOperations.getAllActivityLogs(db, 150);
      } else {
        logs = await dbOperations.getActivityLogsByType(db, filter, 150);
      }
      setActivities(logs);

      // Compute statistics
      const total = logs.length;
      const additions = logs.filter((l) => l.type === 'stock_add' || l.type === 'restock').length;
      const deductions = logs.filter((l) => l.type === 'stock_deduct').length;
      const orders = logs.filter((l) => l.type === 'order').length;

      setStats({ total, additions, deductions, orders });

      if (selectedActivity) {
        const updated = logs.find((l) => l.id === selectedActivity.id);
        setSelectedActivity(updated || null);
      }
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
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredActivities = activities.filter((a) => {
    const query = search.toLowerCase();
    return (
      a.entity_name?.toLowerCase().includes(query) ||
      a.description?.toLowerCase().includes(query) ||
      a.type?.toLowerCase().includes(query)
    );
  });

  // --- LEFT PANEL (Main Screen: Stats + Search + Filter Pills + Audit Stream) ---
  const leftPanel = (
    <View style={styles.leftPanelContainer}>
      <Text style={[styles.title, { color: theme.text }]}>Activity Audit Stream</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Real-time audit tracking for inventory & orders
      </Text>

      {/* Stats Summary Bar */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={[styles.statNum, { color: theme.text }]}>{stats.total}</Text>
          <Text style={[styles.statLbl, { color: theme.textSecondary }]}>Total Logs</Text>
        </View>
        <View style={[styles.statBox, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={[styles.statNum, { color: theme.success }]}>{stats.additions}</Text>
          <Text style={[styles.statLbl, { color: theme.textSecondary }]}>Restocks</Text>
        </View>
        <View style={[styles.statBox, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={[styles.statNum, { color: theme.error }]}>{stats.deductions}</Text>
          <Text style={[styles.statLbl, { color: theme.textSecondary }]}>Deductions</Text>
        </View>
        <View style={[styles.statBox, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={[styles.statNum, { color: theme.primary }]}>{stats.orders}</Text>
          <Text style={[styles.statLbl, { color: theme.textSecondary }]}>Orders</Text>
        </View>
      </View>

      <DripSearchBar
        placeholder="Filter logs by name or description..."
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        style={styles.searchBar}
      />

      {/* Filter Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {(
          [
            { id: 'all', label: 'All Activity' },
            { id: 'stock_add', label: 'Stock Added' },
            { id: 'stock_deduct', label: 'Stock Deducted' },
            { id: 'order', label: 'Orders' },
            { id: 'restock', label: 'Restocks' },
          ] as const
        ).map((item) => {
          const isActive = filter === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              style={[
                styles.filterPill,
                { borderColor: theme.border, backgroundColor: theme.card },
                isActive && { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}
              onPress={() => setFilter(item.id)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: theme.textSecondary },
                  isActive && { color: '#FFFFFF' },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredActivities.length === 0 ? (
        <View style={styles.emptyListContainer}>
          <Activity size={48} color={theme.textTertiary || '#888'} />
          <Text style={[styles.emptyListText, { color: theme.text }]}>
            {search ? 'No audit records match your search' : 'No audit records found'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
          {filteredActivities.map((item) => {
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
                    <View style={styles.cardTitleRow}>
                      <Text
                        style={[
                          styles.cardName,
                          { color: isSelected ? '#FFFFFF' : theme.text },
                        ]}
                        numberOfLines={1}
                      >
                        {item.entity_name}
                      </Text>
                      {item.quantity ? (
                        <Text
                          style={[
                            styles.quantityBadge,
                            {
                              color: isSelected
                                ? '#FFFFFF'
                                : getActivityColor(item.type),
                            },
                          ]}
                        >
                          {item.type === 'stock_deduct' ? '-' : '+'}{item.quantity} {item.unit || ''}
                        </Text>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.cardDesc,
                        { color: isSelected ? '#E0F2FE' : theme.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {item.description}
                    </Text>
                    <View style={styles.cardTimeRow}>
                      <Clock size={11} color={isSelected ? '#CBD5E1' : theme.textTertiary} style={{ marginRight: 4 }} />
                      <Text
                        style={[
                          styles.cardTime,
                          { color: isSelected ? '#CBD5E1' : theme.textTertiary },
                        ]}
                      >
                        {formatDateTime(item.created_at)}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  // --- RIGHT PANEL (Detailed Audit Record View) ---
  const rightPanel = selectedActivity ? (
    <View style={styles.detailsContainer}>
      <View style={[styles.detailsHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.detailsTitleRow}>
          <View style={[styles.detailsIconBadge, { backgroundColor: theme.input }]}>
            {getActivityIcon(selectedActivity.type)}
          </View>
          <View style={styles.detailsHeaderMeta}>
            <Text style={[styles.detailsTitle, { color: theme.text }]} numberOfLines={1}>
              {selectedActivity.entity_name}
            </Text>
            <View style={[styles.badgePill, { backgroundColor: getActivityColor(selectedActivity.type) + '20' }]}>
              <Text style={[styles.badgePillText, { color: getActivityColor(selectedActivity.type) }]}>
                {selectedActivity.type.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.infoCardTitle, { color: theme.text }]}>Audit Log Details</Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Record ID:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>#{selectedActivity.id}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Entity Name:</Text>
            <Text style={[styles.infoValue, { color: theme.text, fontWeight: '700' }]}>
              {selectedActivity.entity_name}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Entity Category:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {selectedActivity.entity_type ? selectedActivity.entity_type.toUpperCase() : 'GENERAL'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Event Description:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{selectedActivity.description}</Text>
          </View>

          {selectedActivity.quantity ? (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Quantity Impact:</Text>
              <Text style={[styles.infoValue, { color: getActivityColor(selectedActivity.type), fontWeight: '700' }]}>
                {selectedActivity.type === 'stock_deduct' ? '-' : '+'}{selectedActivity.quantity} {selectedActivity.unit || ''}
              </Text>
            </View>
          ) : null}

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Timestamp:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {formatDateTime(selectedActivity.created_at)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  ) : (
    <View style={styles.emptyDetailsState}>
      <Activity size={64} color={theme.textTertiary || '#888'} />
      <Text style={[styles.emptyDetailsTitle, { color: theme.text }]}>No Audit Log Selected</Text>
      <Text style={[styles.emptyDetailsSubtext, { color: theme.textSecondary }]}>
        Select an activity log from the list to view its complete audit trace.
      </Text>
    </View>
  );

  return (
    <>
      <Header title="Activity Log" />
      <Section
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showNextScreen={!!selectedActivity}
        onBack={() => setSelectedActivity(null)}
        backButtonTitle="Back to Audit Stream"
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
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLbl: {
    fontSize: 10,
    marginTop: 2,
  },
  searchBar: {
    marginBottom: 10,
  },
  filterScroll: {
    maxHeight: 38,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillText: {
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
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  quantityBadge: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 12,
    marginVertical: 2,
  },
  cardTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  badgePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
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
