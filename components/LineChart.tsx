import { useTheme } from '@/constants/colorTheme';
import React, { useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

export type LineChartItem = {
  label: string;
  value: number;
};

type DripLineChartProps = {
  data: LineChartItem[];
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
  scrollable?: boolean;
  pointSpacing?: number;
  showArea?: boolean;
  showPoints?: boolean;
  showLabels?: boolean;
  adaptive?: boolean;
};

const PAD = {
  left: 12,
  right: 12,
  top: 32,
  bottom: 8,
};

export const DripLineChart: React.FC<DripLineChartProps> = ({
  data,
  height = 220,
  color,
  formatValue = (v) => v.toLocaleString(),
  scrollable = false,
  pointSpacing = 44,
  showArea = true,
  showPoints = true,
  showLabels = true,
  adaptive = true,
}) => {
  const { theme } = useTheme();
  const [layoutWidth, setLayoutWidth] = useState(300);
  const chartColor = color || theme.primary;

  const plotH = height - 40;
  const innerH = plotH - PAD.top - PAD.bottom;

  // Adaptive spacing based on data length
  const adaptiveSpacing = adaptive
    ? data.length > 25
      ? 90
      : data.length > 15
        ? 75
        : data.length > 10
          ? 60
          : pointSpacing
    : pointSpacing;

  const chartWidth = scrollable
    ? Math.max(data.length * adaptiveSpacing + PAD.left + PAD.right, 320)
    : layoutWidth;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (!scrollable && w > 0) {
      setLayoutWidth(w);
    }
  };

  const formatLabel = (label: string) => {
    // YYYY-MM-DD -> YY/MM/DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
      const [year, month, day] = label.split('-');
      return `${year.slice(2)}/${month}/${day}`;
    }
    // YYYY-MM -> YY/MM
    if (/^\d{4}-\d{2}$/.test(label)) {
      const [year, month] = label.split('-');
      return `${year.slice(2)}/${month}`;
    }
    // HH:MM -> HH:MM
    if (/^\d{2}:\d{2}$/.test(label)) {
      return label;
    }
    return label;
  };

  // Adaptive label interval to prevent overcrowding
  const visibleLabelInterval = adaptive
    ? data.length > 25
      ? 5
      : data.length > 15
        ? 3
        : data.length > 8
          ? 2
          : 1
    : 1;

  const { linePath, areaPath, points } = useMemo(() => {
    if (data.length === 0) {
      return { linePath: '', areaPath: '', points: [] };
    }

    const buildSmoothPath = (pts: { x: number; y: number }[]) => {
      if (pts.length < 2) return '';
      let d = `M ${pts[0].x} ${pts[0].y}`;

      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] || p2;

        // Adaptive smoothing based on data volatility
        const smoothing = 0.2;

        const cp1x = p1.x + (p2.x - p0.x) * smoothing;
        const cp1y = p1.y + (p2.y - p0.y) * smoothing;

        const cp2x = p2.x - (p3.x - p1.x) * smoothing;
        const cp2y = p2.y - (p3.y - p1.y) * smoothing;

        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
      }

      return d;
    };

    const max = Math.max(...data.map((d) => d.value), 1);
    const min = Math.min(...data.map((d) => d.value), 0);
    const range = max - min || 1;

    const innerW = chartWidth - PAD.left - PAD.right;
    const step = data.length > 1 ? innerW / (data.length - 1) : 0;

    const pts = data.map((d, i) => ({
      x:
        PAD.left +
        (scrollable
          ? i * adaptiveSpacing
          : data.length === 1
            ? innerW / 2
            : i * step),
      y: PAD.top + innerH - ((d.value - min) / range) * innerH,
      value: d.value,
      label: d.label,
    }));

    const line = buildSmoothPath(pts);

    const area =
      showArea && pts.length > 0
        ? `${line}
           L ${pts[pts.length - 1].x} ${PAD.top + innerH}
           L ${pts[0].x} ${PAD.top + innerH}
           Z`
        : '';

    return {
      linePath: line,
      areaPath: area,
      points: pts,
    };
  }, [data, chartWidth, innerH, scrollable, adaptiveSpacing, showArea]);

  const chartInner = (
    <View
      style={{
        width: chartWidth,
        height: plotH,
      }}
    >
      <Svg width={chartWidth} height={plotH}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={chartColor} stopOpacity="0.35" />
            <Stop offset="1" stopColor={chartColor} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {showArea && areaPath ? <Path d={areaPath} fill="url(#areaGrad)" /> : null}

        {linePath ? (
          <Path
            d={linePath}
            fill="none"
            stroke={chartColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {showPoints &&
          points.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={4}
              fill={chartColor}
              stroke={theme.background}
              strokeWidth={2}
            />
          ))}
      </Svg>

      {showLabels &&
        points.map((p, i) =>
          p.value > 0 ? (
            <Text
              key={`val-${i}`}
              style={[
                styles.pointValue,
                {
                  left: p.x - 24,
                  top: p.y - 22,
                  width: 48,
                  color: theme.textSecondary,
                },
              ]}
              numberOfLines={1}
            >
              {formatValue(p.value)}
            </Text>
          ) : null,
        )}

      {showLabels && (
        <View
          style={[
            styles.labelsRow,
            {
              width: chartWidth,
              height: 24,
            },
          ]}
        >
          {points.map((p, i) => (
            <Text
              key={`lbl-${i}`}
              style={[
                styles.label,
                {
                  color: theme.textSecondary,
                },
                scrollable
                  ? {
                      position: 'absolute',
                      left: p.x - 30,
                      width: 60,
                    }
                  : {
                      flex: 1,
                    },
              ]}
              numberOfLines={1}
            >
              {i % visibleLabelInterval === 0 ? formatLabel(p.label) : ''}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  if (data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          No data available
        </Text>
      </View>
    );
  }

  return (
    <View style={{ height }} onLayout={onLayout}>
      {scrollable ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {chartInner}
        </ScrollView>
      ) : (
        chartInner
      )}
    </View>
  );
};

// Also export as LineChart alias
export const LineChart = DripLineChart;
export default DripLineChart;

const styles = StyleSheet.create({
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  pointValue: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  labelsRow: {
    position: 'relative',
    flexDirection: 'row',
    marginTop: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});