import { useTheme } from '@/constants/colorTheme';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { QrCode, ScanLine } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface InlineScannerProps {
  onScanSuccess: (data: string) => void;
}

export const InlineScanner: React.FC<InlineScannerProps> = ({
  onScanSuccess,
}) => {
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanMode, setScanMode] = useState<'barcode' | 'qr'>('barcode');
  const [scanned, setScanned] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const isSquare = scanMode === 'qr';
  const frameHeight = isSquare ? 200 : 140;

  if (!permission?.granted) {
    return (
      <View style={[styles.container, { borderColor: theme.border }]}>
        <TouchableOpacity onPress={requestPermission} style={styles.permissionRequest}>
          <Text style={[styles.permissionText, { color: theme.text }]}>
            Grant Camera Permission to Scan
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = (scanningResult: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScanSuccess(scanningResult.data);
    setTimeout(() => {
      setScanned(false);
    }, 500);
  };

  return (
    <View style={[styles.container, { borderColor: theme.border }]}>
      <View style={styles.scannerContainer}>
        <CameraView
          style={[styles.camera, { height: frameHeight }]}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: scanMode === 'qr' ? ['qr'] : ['code128', 'code39', 'ean13', 'upc_a', 'upc_e'],
          }}
        >
          <View style={styles.overlay}>
            <View
              style={[
                styles.targetFrame,
                scanMode === 'qr' ? styles.squareFrame : styles.rectFrame,
                { borderColor: theme.primary },
              ]}
            >
              <View style={[styles.cornerTL, { borderColor: theme.primary }]} />
              <View style={[styles.cornerTR, { borderColor: theme.primary }]} />
              <View style={[styles.cornerBL, { borderColor: theme.primary }]} />
              <View style={[styles.cornerBR, { borderColor: theme.primary }]} />
            </View>
          </View>
        </CameraView>

        <View style={styles.modeSwitcher}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              scanMode === 'barcode' && { backgroundColor: theme.primary },
            ]}
            onPress={() => setScanMode('barcode')}
          >
            <ScanLine size={16} color={scanMode === 'barcode' ? theme.background : theme.textSecondary} />
            <Text style={[styles.modeText, { color: scanMode === 'barcode' ? theme.background : theme.textSecondary }]}>
              Barcode
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              scanMode === 'qr' && { backgroundColor: theme.primary },
            ]}
            onPress={() => setScanMode('qr')}
          >
            <QrCode size={16} color={scanMode === 'qr' ? theme.background : theme.textSecondary} />
            <Text style={[styles.modeText, { color: scanMode === 'qr' ? theme.background : theme.textSecondary }]}>
              QR Code
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    marginVertical: 16,
    overflow: 'hidden',
  },
  scannerContainer: {
    backgroundColor: '#000',
  },
  camera: {
    width: '100%',
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetFrame: {
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  rectFrame: {
    width: '80%',
    height: 100,
  },
  squareFrame: {
    width: 180,
    height: 180,
  },
  modeSwitcher: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#000',
    gap: 8,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    justifyContent: 'center',
  },
  modeText: {
    fontWeight: '600',
    fontSize: 12,
  },
  permissionRequest: {
    padding: 16,
    alignItems: 'center',
  },
  permissionText: {
    fontSize: 14,
    textAlign: 'center',
  },
  cornerTL: { position: 'absolute', top: -2, left: -2, width: 16, height: 16, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
  cornerTR: { position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
  cornerBL: { position: 'absolute', bottom: -2, left: -2, width: 16, height: 16, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
  cornerBR: { position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },
});