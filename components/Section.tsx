import { DripBackButton } from '@/components/BackButton';
import { useTheme } from '@/constants/colorTheme';
import React, { ReactNode, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View, ViewStyle } from 'react-native';

export interface DripSectionProps {
  /** Content for the left panel on tablet, or main screen on mobile */
  leftPanel: ReactNode;

  /** Content for the right panel on tablet, or secondary/next screen on mobile */
  rightPanel: ReactNode;

  /** Controlled state for displaying the secondary/next screen on mobile */
  showNextScreen?: boolean;

  /** Default initial screen for mobile in uncontrolled mode */
  defaultShowNextScreen?: boolean;

  /** Callback when the BackButton is pressed on mobile next screen or tablet right panel */
  onBack?: () => void;

  /** Custom title for the BackButton (defaults to 'Go Back') */
  backButtonTitle?: string;

  /** Whether to show the BackButton on the tablet right panel header */
  showTabletBackButton?: boolean;

  /** Flex ratio for tablet left panel (defaults to 1) */
  leftPanelFlex?: number;

  /** Flex ratio for tablet right panel (defaults to 1.5) */
  rightPanelFlex?: number;

  /** Breakpoint width for tablet layout in pixels (defaults to 768) */
  breakpoint?: number;

  /** Optional header title for the left panel */
  leftPanelTitle?: string;

  /** Optional header title for the right panel */
  rightPanelTitle?: string;

  /** Optional inner padding for children content */
  childrenPadding?: number;

  /** Custom root container style */
  style?: ViewStyle;

  /** Custom content container style */
  contentContainerStyle?: ViewStyle;
}

export const DripSection: React.FC<DripSectionProps> = ({
  leftPanel,
  rightPanel,
  showNextScreen,
  defaultShowNextScreen = false,
  onBack,
  backButtonTitle = 'Go Back',
  showTabletBackButton = false,
  leftPanelFlex = 1,
  rightPanelFlex = 1.5,
  breakpoint = 768,
  leftPanelTitle,
  rightPanelTitle,
  childrenPadding = 0,
  style,
  contentContainerStyle,
}) => {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const [internalNextScreen, setInternalNextScreen] = useState<boolean>(defaultShowNextScreen);

  const isTablet = width >= breakpoint;
  const isNextScreenActive = showNextScreen !== undefined ? showNextScreen : internalNextScreen;

  const handleBack = () => {
    if (showNextScreen === undefined) {
      setInternalNextScreen(false);
    }
    if (onBack) {
      onBack();
    }
  };

  const shouldShowBackButtonTablet = showTabletBackButton || (isNextScreenActive && !!onBack);

  if (isTablet) {
    return (
      <View style={[styles.tabletContainer, { backgroundColor: theme.background }, style]}>
        {/* Left Panel */}
        <View
          style={[
            styles.leftPanel,
            { flex: leftPanelFlex, borderColor: theme.border },
          ]}
        >
          {leftPanelTitle && (
            <View style={[styles.panelHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.panelHeaderTitle, { color: theme.text }]}>
                {leftPanelTitle}
              </Text>
            </View>
          )}
          <View style={[{ padding: childrenPadding, flex: 1 }, contentContainerStyle]}>
            {leftPanel}
          </View>
        </View>

        {/* Right Panel */}
        <View style={[styles.rightPanel, { flex: rightPanelFlex }]}>
          {shouldShowBackButtonTablet && (
            <DripBackButton title={backButtonTitle} onPress={handleBack} />
          )}
          {rightPanelTitle && !shouldShowBackButtonTablet && (
            <View style={[styles.panelHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.panelHeaderTitle, { color: theme.text }]}>
                {rightPanelTitle}
              </Text>
            </View>
          )}
          <View style={[{ padding: childrenPadding, flex: 1 }, contentContainerStyle]}>
            {rightPanel}
          </View>
        </View>
      </View>
    );
  }

  // --- MOBILE LAYOUT ---
  return (
    <View style={[styles.mobileContainer, { backgroundColor: theme.background }, style]}>
      {!isNextScreenActive ? (
        // Main Screen (Left Panel)
        <View style={styles.screenWrapper}>
          {leftPanelTitle && (
            <View style={[styles.panelHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.panelHeaderTitle, { color: theme.text }]}>
                {leftPanelTitle}
              </Text>
            </View>
          )}
          <View style={[{ padding: childrenPadding, flex: 1 }, contentContainerStyle]}>
            {leftPanel}
          </View>
        </View>
      ) : (
        // Next Screen (Right Panel with Back Button)
        <View style={styles.screenWrapper}>
          <DripBackButton title={backButtonTitle} onPress={handleBack} />
          {rightPanelTitle && (
            <View style={[styles.panelHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.panelHeaderTitle, { color: theme.text }]}>
                {rightPanelTitle}
              </Text>
            </View>
          )}
          <View style={[{ padding: childrenPadding, flex: 1 }, contentContainerStyle]}>
            {rightPanel}
          </View>
        </View>
      )}
    </View>
  );
};

// Also export as Section alias
export const Section = DripSection;
export default DripSection;

const styles = StyleSheet.create({
  tabletContainer: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    height: '100%',
  },
  leftPanel: {
    borderRightWidth: 1,
    height: '100%',
  },
  rightPanel: {
    height: '100%',
    marginBottom: 40,
  },
  mobileContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  screenWrapper: {
    flex: 1,
  },
  panelHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  panelHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
});
