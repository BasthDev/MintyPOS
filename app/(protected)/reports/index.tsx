import { Header } from '@/components/Header';
import { Section } from '@/components/Section';
import { useTheme } from '@/constants/colorTheme';
import { getDatabase } from '@/lib/database';
import { formatCurrency } from '@/lib/utils';
import { ReportService, type CRMReportData, type InventoryReportData, type ProfitReportData, type SalesReportData } from '@/services/reportService';
import {
  ArrowDown,
  ArrowUp,
  Award,
  BarChart3,
  Calendar,
  DollarSign,
  Package,
  Percent,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ReportsScreen() {
  const { theme } = useTheme();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState<SalesReportData | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryReportData | null>(null);
  const [profitData, setProfitData] = useState<ProfitReportData | null>(null);
  const [crmData, setCrmData] = useState<CRMReportData | null>(null);

  const reportTypes = [
    { id: 'sales', name: 'Sales Report', desc: 'Daily, weekly, monthly sales breakdown', icon: BarChart3 },
    { id: 'inventory', name: 'Inventory Report', desc: 'Stock levels, movements, and usage', icon: Package },
    { id: 'profit', name: 'Profit & Margin Report', desc: 'Margins, COGS analysis, and profit', icon: DollarSign },
    { id: 'crm', name: 'CRM & Loyalty Report', desc: 'Customer tiers, points, and loyalty activity', icon: Users },
  ];

  const timeFilters = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All Time' },
  ];

  // Get date range based on filter
  const getDateRange = () => {
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    let startDate = endDate;

    switch (timeFilter) {
      case 'today':
        startDate = endDate;
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        startDate = monthAgo.toISOString().split('T')[0];
        break;
      case 'all':
        startDate = '2020-01-01'; // Far past date
        break;
    }

    return { startDate, endDate };
  };

  // Load report data
  const loadReportData = async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      const { startDate, endDate } = getDateRange();

      // Load sales data
      const sales = await ReportService.getSalesReport(db, startDate, endDate);
      setSalesData(sales);

      // Load inventory data
      const inventory = await ReportService.getInventoryReport(db);
      setInventoryData(inventory);

      // Load profit data
      const profit = await ReportService.getProfitReport(db, startDate, endDate);
      setProfitData(profit);

      // Load CRM data
      const crm = await ReportService.getCRMReport(db);
      setCrmData(crm);
    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [timeFilter]);

  // --- LEFT PANEL (Main Screen) ---
  const leftPanel = (
    <View style={styles.leftPanelContainer}>
      <Text style={[styles.title, { color: theme.text }]}>Reports & Analytics</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        View business performance metrics
      </Text>

      {/* Time Filter */}
      <View style={[styles.filterContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Calendar size={16} color={theme.textSecondary} />
        <View style={styles.filterButtons}>
          {timeFilters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterButton,
                {
                  backgroundColor: timeFilter === filter.id ? theme.primary : theme.input,
                  borderColor: timeFilter === filter.id ? theme.primary : theme.inputBorder,
                },
              ]}
              onPress={() => setTimeFilter(filter.id as any)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  { color: timeFilter === filter.id ? '#FFFFFF' : theme.text },
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Stats Grid */}
      {loading ? (
        <View style={styles.statsGrid}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.primary + '15' }]}>
              <DollarSign size={20} color={theme.primary} />
            </View>
            <Text style={[styles.statNumber, { color: theme.primary }]}>
              {formatCurrency(salesData?.totalRevenue || 0)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Revenue</Text>
            <View style={styles.statChange}>
              <ArrowUp size={12} color="#22C55E" />
              <Text style={[styles.statChangeText, { color: '#22C55E' }]}>+0%</Text>
            </View>
          </View>

          <View style={[styles.statCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.secondary + '15' }]}>
              <ShoppingCart size={20} color={theme.secondary} />
            </View>
            <Text style={[styles.statNumber, { color: theme.text }]}>
              {salesData?.totalOrders || 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Orders</Text>
            <View style={styles.statChange}>
              <ArrowUp size={12} color="#22C55E" />
              <Text style={[styles.statChangeText, { color: '#22C55E' }]}>+0%</Text>
            </View>
          </View>

          <View style={[styles.statCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <View style={[styles.statIcon, { backgroundColor: '#F59E0B' + '15' }]}>
              <TrendingUp size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.statNumber, { color: theme.text }]}>
              {formatCurrency(salesData?.averageOrderValue || 0)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Avg. Order Value</Text>
            <View style={styles.statChange}>
              <ArrowDown size={12} color="#EF4444" />
              <Text style={[styles.statChangeText, { color: '#EF4444' }]}>-0%</Text>
            </View>
          </View>

          <View style={[styles.statCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <View style={[styles.statIcon, { backgroundColor: '#8B5CF6' + '15' }]}>
              <Percent size={20} color="#8B5CF6" />
            </View>
            <Text style={[styles.statNumber, { color: theme.text }]}>
              {profitData?.profitMargin.toFixed(1) || 0}%
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Profit Margin</Text>
            <View style={styles.statChange}>
              <ArrowUp size={12} color="#22C55E" />
              <Text style={[styles.statChangeText, { color: '#22C55E' }]}>+0%</Text>
            </View>
          </View>
        </View>
      )}

      {/* Report Types */}
      <View style={styles.reportTypes}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Available Reports</Text>
        {reportTypes.map((report) => {
          const isSelected = selectedReport === report.id;
          const IconComp = report.icon;
          return (
            <TouchableOpacity
              key={report.id}
              activeOpacity={0.7}
              style={[
                styles.reportItem,
                {
                  backgroundColor: isSelected ? theme.primary : theme.card,
                  borderColor: isSelected ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setSelectedReport(report.id)}
            >
              <View style={styles.reportItemLeft}>
                <View
                  style={[
                    styles.reportIconBadge,
                    {
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : theme.input,
                    },
                  ]}
                >
                  <IconComp size={20} color={isSelected ? '#FFFFFF' : theme.primary} />
                </View>
                <View style={styles.reportItemText}>
                  <Text
                    style={[
                      styles.reportName,
                      { color: isSelected ? '#FFFFFF' : theme.text },
                    ]}
                  >
                    {report.name}
                  </Text>
                  <Text
                    style={[
                      styles.reportDesc,
                      { color: isSelected ? '#CBD5E1' : theme.textSecondary },
                    ]}
                  >
                    {report.desc}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // --- RIGHT PANEL (Report Details Preview) ---
  const currentReportObj = reportTypes.find((r) => r.id === selectedReport);
  const IconComp = currentReportObj?.icon;

  const rightPanel = selectedReport ? (
    <View style={styles.detailsContainer}>
      <View style={[styles.detailsHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.detailsTitleRow}>
          <View style={[styles.detailsIconBadge, { backgroundColor: theme.primary + '15' }]}>
            {IconComp && <IconComp size={28} color={theme.primary} />}
          </View>
          <View style={styles.detailsHeaderMeta}>
            <Text style={[styles.detailsTitle, { color: theme.text }]}>{currentReportObj?.name}</Text>
            <Text style={[styles.detailsSubtitle, { color: theme.textSecondary }]}>
              {currentReportObj?.desc}
            </Text>
          </View>
        </View>
        <View style={styles.timeFilterBadge}>
          <Calendar size={14} color={theme.primary} />
          <Text style={[styles.timeFilterText, { color: theme.primary }]}>
            {timeFilters.find((f) => f.id === timeFilter)?.label}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : selectedReport === 'sales' ? (
          <>
            {/* Summary Stats */}
            <View style={styles.detailsStatsGrid}>
              <View style={[styles.detailStatCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.detailStatLabel, { color: theme.textSecondary }]}>Gross Sales</Text>
                <Text style={[styles.detailStatValue, { color: theme.text }]}>
                  {formatCurrency(salesData?.totalRevenue || 0)}
                </Text>
              </View>
              <View style={[styles.detailStatCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.detailStatLabel, { color: theme.textSecondary }]}>Net Sales</Text>
                <Text style={[styles.detailStatValue, { color: theme.text }]}>
                  {formatCurrency(salesData?.totalRevenue || 0)}
                </Text>
              </View>
              <View style={[styles.detailStatCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.detailStatLabel, { color: theme.textSecondary }]}>Total Orders</Text>
                <Text style={[styles.detailStatValue, { color: theme.text }]}>
                  {salesData?.totalOrders || 0}
                </Text>
              </View>
              <View style={[styles.detailStatCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.detailStatLabel, { color: theme.textSecondary }]}>Avg Order</Text>
                <Text style={[styles.detailStatValue, { color: theme.text }]}>
                  {formatCurrency(salesData?.averageOrderValue || 0)}
                </Text>
              </View>
            </View>

            {/* Chart Placeholder */}
            <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.chartTitle, { color: theme.text }]}>Sales Trend</Text>
              <View style={styles.chartPlaceholder}>
                <BarChart3 size={48} color={theme.textTertiary} />
                <Text style={[styles.chartPlaceholderText, { color: theme.textSecondary }]}>
                  Chart visualization will appear here
                </Text>
              </View>
            </View>

            {/* Data Table - Top Products */}
            <View style={[styles.tableCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.tableTitle, { color: theme.text }]}>Top Selling Products</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary }]}>Product</Text>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary }]}>Qty</Text>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary }]}>Revenue</Text>
              </View>
              {salesData?.topSellingProducts && salesData.topSellingProducts.length > 0 ? (
                salesData.topSellingProducts.slice(0, 5).map((product, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.tableCellText, { color: theme.text, flex: 1 }]}>{product.productName}</Text>
                    <Text style={[styles.tableCellText, { color: theme.text }]}>{product.quantity}</Text>
                    <Text style={[styles.tableCellText, { color: theme.text }]}>{formatCurrency(product.revenue)}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCellText, { color: theme.textSecondary, flex: 1 }]}>No sales data yet</Text>
                </View>
              )}
            </View>

            {/* Payment Method Breakdown */}
            <View style={[styles.tableCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.tableTitle, { color: theme.text }]}>Payment Methods</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary }]}>Method</Text>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary }]}>Amount</Text>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary }]}>%</Text>
              </View>
              {salesData?.paymentMethodBreakdown && salesData.paymentMethodBreakdown.length > 0 ? (
                salesData.paymentMethodBreakdown.map((method, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.tableCellText, { color: theme.text, flex: 1 }]}>{method.method}</Text>
                    <Text style={[styles.tableCellText, { color: theme.text }]}>{formatCurrency(method.amount)}</Text>
                    <Text style={[styles.tableCellText, { color: theme.text }]}>{method.percentage.toFixed(1)}%</Text>
                  </View>
                ))
              ) : (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCellText, { color: theme.textSecondary, flex: 1 }]}>No payment data yet</Text>
                </View>
              )}
            </View>

            {/* Insights */}
            <View style={[styles.insightsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.insightsTitle, { color: theme.text }]}>Key Insights</Text>
              <View style={styles.insightItem}>
                <View style={[styles.insightDot, { backgroundColor: theme.primary }]} />
                <Text style={[styles.insightText, { color: theme.textSecondary }]}>
                  Total revenue of {formatCurrency(salesData?.totalRevenue || 0)} from {salesData?.totalOrders || 0} orders.
                </Text>
              </View>
              <View style={styles.insightItem}>
                <View style={[styles.insightDot, { backgroundColor: theme.secondary }]} />
                <Text style={[styles.insightText, { color: theme.textSecondary }]}>
                  Average order value is {formatCurrency(salesData?.averageOrderValue || 0)}.
                </Text>
              </View>
            </View>
          </>
        ) : selectedReport === 'inventory' ? (
          <>
            {/* Summary Stats */}
            <View style={styles.detailsStatsGrid}>
              <View style={[styles.detailStatCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.detailStatLabel, { color: theme.textSecondary }]}>Total Items</Text>
                <Text style={[styles.detailStatValue, { color: theme.text }]}>{inventoryData?.totalItems || 0}</Text>
              </View>
              <View style={[styles.detailStatCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.detailStatLabel, { color: theme.textSecondary }]}>Total Value</Text>
                <Text style={[styles.detailStatValue, { color: theme.text }]}>
                  {formatCurrency(inventoryData?.totalValue || 0)}
                </Text>
              </View>
              <View style={[styles.detailStatCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.detailStatLabel, { color: theme.textSecondary }]}>Low Stock</Text>
                <Text style={[styles.detailStatValue, { color: theme.error }]}>
                  {inventoryData?.lowStockItems.length || 0}
                </Text>
              </View>
              <View style={[styles.detailStatCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.detailStatLabel, { color: theme.textSecondary }]}>Expiring Soon</Text>
                <Text style={[styles.detailStatValue, { color: theme.warning }]}>
                  {inventoryData?.expiringSoon.length || 0}
                </Text>
              </View>
            </View>

            {/* Low Stock Items */}
            <View style={[styles.tableCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.tableTitle, { color: theme.text }]}>Low Stock Items</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary }]}>Item</Text>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary }]}>Current</Text>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary }]}>Minimum</Text>
              </View>
              {inventoryData?.lowStockItems && inventoryData.lowStockItems.length > 0 ? (
                inventoryData.lowStockItems.slice(0, 5).map((item, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.tableCellText, { color: theme.text, flex: 1 }]}>{item.itemName}</Text>
                    <Text style={[styles.tableCellText, { color: theme.error }]}>{item.currentStock}</Text>
                    <Text style={[styles.tableCellText, { color: theme.textSecondary }]}>{item.minimumStock}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCellText, { color: theme.textSecondary, flex: 1 }]}>All items in stock</Text>
                </View>
              )}
            </View>

            {/* Category Breakdown */}
            <View style={[styles.tableCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.tableTitle, { color: theme.text }]}>Category Breakdown</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary }]}>Category</Text>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary }]}>Items</Text>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary }]}>Value</Text>
              </View>
              {inventoryData?.categoryBreakdown && inventoryData.categoryBreakdown.length > 0 ? (
                inventoryData.categoryBreakdown.map((category, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.tableCellText, { color: theme.text, flex: 1 }]}>{category.category}</Text>
                    <Text style={[styles.tableCellText, { color: theme.text }]}>{category.itemCount}</Text>
                    <Text style={[styles.tableCellText, { color: theme.text }]}>{formatCurrency(category.totalValue)}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCellText, { color: theme.textSecondary, flex: 1 }]}>No categories</Text>
                </View>
              )}
            </View>

            {/* Insights */}
            <View style={[styles.insightsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.insightsTitle, { color: theme.text }]}>Key Insights</Text>
              <View style={styles.insightItem}>
                <View style={[styles.insightDot, { backgroundColor: theme.primary }]} />
                <Text style={[styles.insightText, { color: theme.textSecondary }]}>
                  Total inventory value: {formatCurrency(inventoryData?.totalValue || 0)} across {inventoryData?.totalItems || 0} items.
                </Text>
              </View>
              {inventoryData?.lowStockItems && inventoryData.lowStockItems.length > 0 && (
                <View style={styles.insightItem}>
                  <View style={[styles.insightDot, { backgroundColor: theme.error }]} />
                  <Text style={[styles.insightText, { color: theme.textSecondary }]}>
                    {inventoryData.lowStockItems.length} items are below minimum stock level.
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : selectedReport === 'profit' ? (
          <>
            {/* Summary Stats */}
            <View style={styles.detailsStatsGrid}>
              <View style={[styles.detailStatCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.detailStatLabel, { color: theme.textSecondary }]}>Total Revenue</Text>
                <Text style={[styles.detailStatValue, { color: theme.text }]}>
                  {formatCurrency(profitData?.totalRevenue || 0)}
                </Text>
              </View>
              <View style={[styles.detailStatCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.detailStatLabel, { color: theme.textSecondary }]}>Total COGS</Text>
                <Text style={[styles.detailStatValue, { color: theme.error }]}>
                  {formatCurrency(profitData?.totalCOGS || 0)}
                </Text>
              </View>
              <View style={[styles.detailStatCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.detailStatLabel, { color: theme.textSecondary }]}>Gross Profit</Text>
                <Text style={[styles.detailStatValue, { color: theme.success }]}>
                  {formatCurrency(profitData?.grossProfit || 0)}
                </Text>
              </View>
              <View style={[styles.detailStatCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.detailStatLabel, { color: theme.textSecondary }]}>Profit Margin</Text>
                <Text style={[styles.detailStatValue, { color: theme.text }]}>
                  {profitData?.profitMargin.toFixed(1) || 0}%
                </Text>
              </View>
            </View>

            {/* Product Profitability */}
            <View style={[styles.tableCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.tableTitle, { color: theme.text }]}>Product Profitability</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary }]}>Product</Text>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary }]}>Revenue</Text>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary }]}>Margin</Text>
              </View>
              {profitData?.productProfitability && profitData.productProfitability.length > 0 ? (
                profitData.productProfitability.slice(0, 5).map((product, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.tableCellText, { color: theme.text, flex: 1 }]}>{product.productName}</Text>
                    <Text style={[styles.tableCellText, { color: theme.text }]}>{formatCurrency(product.revenue)}</Text>
                    <Text style={[styles.tableCellText, { color: product.margin >= 0 ? theme.success : theme.error }]}>
                      {product.margin.toFixed(1)}%
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCellText, { color: theme.textSecondary, flex: 1 }]}>No profit data yet</Text>
                </View>
              )}
            </View>

            {/* Cost Breakdown */}
            <View style={[styles.tableCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.tableTitle, { color: theme.text }]}>Cost Breakdown</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary }]}>Category</Text>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary }]}>Cost</Text>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary }]}>%</Text>
              </View>
              {profitData?.costBreakdown && profitData.costBreakdown.length > 0 ? (
                profitData.costBreakdown.map((cost, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.tableCellText, { color: theme.text, flex: 1 }]}>{cost.category}</Text>
                    <Text style={[styles.tableCellText, { color: theme.text }]}>{formatCurrency(cost.cost)}</Text>
                    <Text style={[styles.tableCellText, { color: theme.text }]}>{cost.percentage.toFixed(0)}%</Text>
                  </View>
                ))
              ) : (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCellText, { color: theme.textSecondary, flex: 1 }]}>No cost data</Text>
                </View>
              )}
            </View>

            {/* Insights */}
            <View style={[styles.insightsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.insightsTitle, { color: theme.text }]}>Key Insights</Text>
              <View style={styles.insightItem}>
                <View style={[styles.insightDot, { backgroundColor: theme.primary }]} />
                <Text style={[styles.insightText, { color: theme.textSecondary }]}>
                  Overall profit margin: {profitData?.profitMargin.toFixed(1) || 0}%.
                </Text>
              </View>
              <View style={styles.insightItem}>
                <View style={[styles.insightDot, { backgroundColor: (profitData?.profitMargin ?? 0) >= 0 ? theme.success : theme.error }]} />
                <Text style={[styles.insightText, { color: theme.textSecondary }]}>
                  Gross profit: {formatCurrency(profitData?.grossProfit || 0)}.
                </Text>
              </View>
            </View>
          </>
        ) : selectedReport === 'crm' ? (
          <>
            {/* CRM Summary Cards */}
            <View style={styles.detailsStatsGrid}>
              <View style={[styles.detailStatCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.detailStatLabel, { color: theme.textSecondary }]}>Total Customers</Text>
                <Text style={[styles.detailStatValue, { color: theme.text }]}>{crmData?.totalCustomers || 0}</Text>
              </View>
              <View style={[styles.detailStatCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.detailStatLabel, { color: theme.textSecondary }]}>Points Issued</Text>
                <Text style={[styles.detailStatValue, { color: theme.success }]}>{crmData?.totalPointsIssued || 0}</Text>
              </View>
              <View style={[styles.detailStatCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.detailStatLabel, { color: theme.textSecondary }]}>Points Redeemed</Text>
                <Text style={[styles.detailStatValue, { color: theme.warning || '#F59E0B' }]}>{crmData?.totalPointsRedeemed || 0}</Text>
              </View>
              <View style={[styles.detailStatCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.detailStatLabel, { color: theme.textSecondary }]}>Store Credit</Text>
                <Text style={[styles.detailStatValue, { color: theme.primary }]}>{formatCurrency(crmData?.totalStoreCredit || 0)}</Text>
              </View>
            </View>

            {/* Tier Breakdown */}
            <View style={[styles.tableCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.tableTitle, { color: theme.text }]}>Customer Tier Breakdown</Text>
              {(crmData?.tierBreakdown || []).map((tier, index) => (
                <View key={index} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Award size={14} color={
                      tier.tier === 'GOLD' ? '#F59E0B' :
                      tier.tier === 'SILVER' ? '#6B7280' :
                      tier.tier === 'BRONZE' ? '#92400E' : theme.textSecondary
                    } />
                    <Text style={[styles.tableCell, { color: theme.text, fontWeight: '600' }]}>{tier.tier}</Text>
                  </View>
                  <Text style={[styles.tableCell, { color: theme.textSecondary }]}>{tier.count} customers</Text>
                  <Text style={[styles.tableValue, { color: theme.primary }]}>{Math.round(tier.percentage)}%</Text>
                </View>
              ))}
              {(!crmData?.tierBreakdown || crmData.tierBreakdown.length === 0) && (
                <Text style={[styles.emptyTableText, { color: theme.textSecondary }]}>No customer data yet</Text>
              )}
            </View>

            {/* Top Customers */}
            <View style={[styles.tableCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.tableTitle, { color: theme.text }]}>Top Customers by Spending</Text>
              {(crmData?.topCustomers || []).slice(0, 8).map((customer, index) => (
                <View key={index} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tableCell, { color: theme.text, fontWeight: '600' }]} numberOfLines={1}>{customer.name}</Text>
                    <Text style={[styles.tableSubCell || styles.tableCell, { color: theme.textSecondary, fontSize: 11 }]}>{customer.tier} • {customer.loyaltyPoints} pts</Text>
                  </View>
                  <Text style={[styles.tableValue, { color: theme.primary }]}>{formatCurrency(customer.totalSpent)}</Text>
                </View>
              ))}
              {(!crmData?.topCustomers || crmData.topCustomers.length === 0) && (
                <Text style={[styles.emptyTableText, { color: theme.textSecondary }]}>No customer transactions yet</Text>
              )}
            </View>

            {/* Recent Loyalty Activity */}
            <View style={[styles.tableCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.tableTitle, { color: theme.text }]}>Recent Loyalty Activity</Text>
              {(crmData?.recentLoyaltyActivity || []).map((activity, index) => (
                <View key={index} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tableCell, { color: theme.text }]} numberOfLines={1}>{activity.customerName}</Text>
                    <Text style={[styles.tableCell, { color: theme.textSecondary, fontSize: 11 }]}>{activity.date}</Text>
                  </View>
                  <Text style={[styles.tableCell, {
                    color: activity.type === 'Earned' ? theme.success : activity.type === 'Redeemed' ? theme.error : theme.primary,
                    fontWeight: '700',
                  }]}>
                    {activity.type === 'Earned' ? '+' : activity.type === 'Redeemed' ? '-' : ''}{Math.abs(activity.points)} pts
                  </Text>
                </View>
              ))}
              {(!crmData?.recentLoyaltyActivity || crmData.recentLoyaltyActivity.length === 0) && (
                <Text style={[styles.emptyTableText, { color: theme.textSecondary }]}>No loyalty activity yet</Text>
              )}
            </View>
          </>
        ) : (
          <View style={styles.emptyDetailsState}>
            <BarChart3 size={64} color={theme.textTertiary || '#888'} />
            <Text style={[styles.emptyDetailsTitle, { color: theme.text }]}>No Report Selected</Text>
            <Text style={[styles.emptyDetailsSubtext, { color: theme.textSecondary }]}>
              Select a report type from the list to preview metrics and analytics.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  ) : (
    <View style={styles.emptyDetailsState}>
      <BarChart3 size={64} color={theme.textTertiary || '#888'} />
      <Text style={[styles.emptyDetailsTitle, { color: theme.text }]}>No Report Selected</Text>
      <Text style={[styles.emptyDetailsSubtext, { color: theme.textSecondary }]}>
        Select a report type from the list to preview metrics and analytics.
      </Text>
    </View>
  );

  return (
    <>
      <Header title="Reports" />
      <Section
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showNextScreen={!!selectedReport}
        onBack={() => setSelectedReport(null)}
        backButtonTitle="Back to Reports"
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
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 6,
  },
  statChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statChangeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reportTypes: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  reportItem: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  reportItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reportIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportItemText: {
    flex: 1,
  },
  reportName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  reportDesc: {
    fontSize: 12,
  },
  detailsContainer: {
    flex: 1,
  },
  detailsHeader: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
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
    fontSize: 12,
    marginTop: 2,
  },
  timeFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(6, 95, 70, 0.1)',
  },
  timeFilterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailsScroll: {
    flex: 1,
    marginTop: 16,
  },
  detailsStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  detailStatCard: {
    width: '48%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  detailStatLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  detailStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  chartCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  chartPlaceholder: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  chartPlaceholderText: {
    fontSize: 13,
  },
  tableCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  tableTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  tableCell: {
    fontSize: 13,
  },
  tableCellText: {
    fontSize: 13,
  },
  tableSubCell: {
    fontSize: 11,
  },
  tableValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyTableText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  insightsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  insightsTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  insightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
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