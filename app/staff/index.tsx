import { DripContainer } from '../../components/Container';
import { Header } from '../../components/Header';
import { DripButton } from '../../components/Button';
import { Users, Plus } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function StaffScreen() {
  const leftPanel = (
    <View style={styles.content}>
      <Text style={styles.title}>Staff Management</Text>
      <Text style={styles.subtitle}>Manage team members and permissions</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Total Staff</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Active Now</Text>
        </View>
      </View>

      <DripButton
        title="Add Staff Member"
        icon={<Plus size={20} color="white" />}
        onPress={() => console.log('Add staff')}
        style={styles.addButton}
      />
    </View>
  );

  const rightPanel = (
    <View style={styles.staffList}>
      <Text style={styles.listTitle}>Team Members</Text>
      <View style={styles.emptyState}>
        <Users size={48} color="#888" />
        <Text style={styles.emptyText}>No staff members</Text>
        <Text style={styles.emptySubtext}>Add team members to manage access</Text>
      </View>
    </View>
  );

  return (
    <>
      <Header title="Staff" />
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
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  addButton: {
    marginTop: 8,
  },
  staffList: {
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
});