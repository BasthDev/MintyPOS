import { DripButton } from '@/components/Button';
import { Header } from '@/components/Header';
import { DripSearchBar } from '@/components/SearchBar';
import { Section } from '@/components/Section';
import { useTheme } from '@/constants/colorTheme';
import { Plus, Users } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function StaffScreen() {
  const { theme } = useTheme();

  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [search, setSearch] = useState('');

  const filteredStaff = staffList.filter(
    (s) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.role?.toLowerCase().includes(search.toLowerCase())
  );

  // --- LEFT PANEL (Main Screen: Staff List + Search + FAB) ---
  const leftPanel = (
    <View style={styles.leftPanelContainer}>
      <DripSearchBar
        placeholder="Search staff members..."
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        style={styles.searchBar}
      />

      {filteredStaff.length === 0 ? (
        <View style={styles.emptyListContainer}>
          <Users size={48} color={theme.textTertiary || '#888'} />
          <Text style={[styles.emptyListText, { color: theme.text }]}>No staff members found</Text>
          <Text style={[styles.emptyListSubtext, { color: theme.textSecondary }]}>
            Add team members to manage access permissions
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
          {filteredStaff.map((s) => {
            const isSelected = selectedStaff?.id === s.id;

            return (
              <TouchableOpacity
                key={s.id}
                activeOpacity={0.7}
                style={[
                  styles.staffCard,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.card,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setSelectedStaff(s)}
              >
                <View style={styles.cardMain}>
                  <View style={styles.cardHeaderInfo}>
                    <Text
                      style={[
                        styles.cardName,
                        { color: isSelected ? '#FFFFFF' : theme.text },
                      ]}
                      numberOfLines={1}
                    >
                      {s.name}
                    </Text>
                    <Text
                      style={[
                        styles.cardSubText,
                        { color: isSelected ? '#E0F2FE' : theme.textSecondary },
                      ]}
                    >
                      Role: {s.role || 'Staff'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.fabButton, { backgroundColor: theme.primary }]}
        onPress={() => console.log('Add staff member')}
      >
        <Plus size={22} color="#FFFFFF" />
        <Text style={styles.fabText}>Add Member</Text>
      </TouchableOpacity>
    </View>
  );

  // --- RIGHT PANEL (Staff Details View) ---
  const rightPanel = selectedStaff ? (
    <View style={styles.detailsContainer}>
      <View style={[styles.detailsHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.detailsTitleRow}>
          <View style={[styles.detailsIconBadge, { backgroundColor: theme.input }]}>
            <Users size={28} color={theme.primary} />
          </View>
          <View style={styles.detailsHeaderMeta}>
            <Text style={[styles.detailsTitle, { color: theme.text }]} numberOfLines={1}>
              {selectedStaff.name}
            </Text>
            <Text style={[styles.detailsSubtitle, { color: theme.primary }]}>
              {selectedStaff.role || 'Staff Member'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.infoCardTitle, { color: theme.text }]}>Member Details</Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Full Name:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{selectedStaff.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Role:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{selectedStaff.role}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  ) : (
    <View style={styles.emptyDetailsState}>
      <Users size={64} color={theme.textTertiary || '#888'} />
      <Text style={[styles.emptyDetailsTitle, { color: theme.text }]}>No Staff Selected</Text>
      <Text style={[styles.emptyDetailsSubtext, { color: theme.textSecondary }]}>
        Select a team member from the list to view their permissions and profile details.
      </Text>
    </View>
  );

  return (
    <>
      <Header title="Staff" />
      <Section
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showNextScreen={!!selectedStaff}
        onBack={() => setSelectedStaff(null)}
        backButtonTitle="Back to Staff"
        childrenPadding={16}
      />
    </>
  );
}

const styles = StyleSheet.create({
  leftPanelContainer: {
    flex: 1,
    position: 'relative',
  },
  searchBar: {
    marginBottom: 12,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyListText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyListSubtext: {
    marginTop: 4,
    fontSize: 14,
  },
  listScroll: {
    flex: 1,
  },
  staffCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardSubText: {
    fontSize: 12,
  },

  // FAB
  fabButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    gap: 8,
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // Details
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
    fontSize: 14,
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