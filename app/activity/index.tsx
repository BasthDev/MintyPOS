import { Activity, ArrowDown, ArrowUp, Package, ShoppingCart } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DripContainer } from '../../components/Container';
import { Header } from '../../components/Header';
import { useTheme } from '../../constants/colorTheme';
import { dbOperations, getDatabase } from '../../lib/database';

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

  useEffect(() => {
    loadActivities();
  }, [filter]);

  const loadActivities = async () => {
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
        return <ArrowDown size={16} color={theme.success} />;
      case 'stock_deduct':
        return <ArrowUp size={16} color={theme.error} />;
      case 'order':
        return <ShoppingCart size={16} color={theme.primary} />;
      case 'restock':
        return <Package size={16} color={theme.warning} />;
      default:
        return <Activity size={16} color={theme.textSecondary} />;
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

  const leftPanel = (
    <View style={styles.content}>
      <Text style={styles.title}>Activity Log</Text>
      <Text style={styles.subtitle}>Track all stock movements and orders</Text>
      
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && { backgroundColor: theme.primary }]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterButtonText, filter === 'all' && { color: theme.background }]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'restock' && { backgroundColor: theme.warning }]}
          onPress={() => setFilter('restock')}
        >
          <Text style={[styles.filterButtonText, filter === 'restock' && { color: theme.background }]}>
            Restock
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'stock_deduct' && { backgroundColor: theme.error }]}
          onPress={() => setFilter('stock_deduct')}
        >
          <Text style={[styles.filterButtonText, filter === 'stock_deduct' && { color: theme.background }]}>
            Deduct
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'order' && { backgroundColor: theme.primary }]}
          onPress={() => setFilter('order')}
        >
          <Text style={[styles.filterButtonText, filter === 'order' && { color: theme.background }]}>
            Orders
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const rightPanel = (
    <View style={styles.activitiesList}>
      <Text style={styles.listTitle}>Recent Activities</Text>
      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      ) : activities.length === 0 ? (
        <View style={styles.emptyState}>
          <Activity size={48} color="#888" />
          <Text style={styles.emptyText}>No activities yet</Text>
          <Text style={styles.emptySubtext}>Activities will appear here as you use the system</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer}>
          {activities.map((activity) => (
            <View key={activity.id} style={[styles.activityItem, { borderColor: theme.border }]}>
              <View style={styles.activityIconContainer}>
                {getActivityIcon(activity.type)}
              </View>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityEntity, { color: theme.text }]}>
                  {activity.entity_name}
                </Text>
                <Text style={[styles.activityDescription, { color: theme.textSecondary }]}>
                  {activity.description}
                </Text>
                {activity.quantity && (
                  <Text style={[styles.activityQuantity, { color: getActivityColor(activity.type) }]}>
                    {activity.type === 'stock_deduct' ? '-' : '+'}{activity.quantity} {activity.unit}
                  </Text>
                )}
              </View>
              <View style={styles.activityMeta}>
                <Text style={[styles.activityTime, { color: theme.textTertiary }]}>
                  {formatDateTime(activity.created_at)}
                </Text>
                <View style={[styles.activityTypeBadge, { backgroundColor: getActivityColor(activity.type) + '20' }]}>
                  <Text style={[styles.activityTypeText, { color: getActivityColor(activity.type) }]}>
                    {activity.type.replace('_', ' ')}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <>
      <Header title="Activity" />
      <DripContainer
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showSecondaryMobile={false}
        childrenPadding={16}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activitiesList: {
    flex: 1,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
  },
  scrollContainer: {
    flex: 1,
  },
  activityItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    alignItems: 'center',
  },
  activityIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityEntity: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 12,
    marginBottom: 2,
  },
  activityQuantity: {
    fontSize: 13,
    fontWeight: '600',
  },
  activityMeta: {
    alignItems: 'flex-end',
  },
  activityTime: {
    fontSize: 11,
    marginBottom: 4,
  },
  activityTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activityTypeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
