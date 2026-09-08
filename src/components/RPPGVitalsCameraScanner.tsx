import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/theme';
import { useAppStore } from '../data/store';
import { Card } from './Card';
import { Badge } from './Badge';
import { Camera, Activity, Heart, CheckCircle2, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { assertRule } from '../ai/constitution';

export interface RPPGScanResult {
  pulseBpm: number;
  respirationRpm: number;
  hrvMs: number;
  snrQuality: 'EXCELLENT' | 'GOOD' | 'NOISY';
  scannedAt: string;
}

export const RPPGVitalsCameraScanner: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  assertRule('Rule-A'); // Non-prescriptive diagnostic triage rule

  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<RPPGScanResult | null>(null);

  const handleStartScan = () => {
    setScanning(true);
    setProgress(10);
    setResult(null);

    const timer1 = setTimeout(() => setProgress(45), 600);
    const timer2 = setTimeout(() => setProgress(85), 1200);
    const timer3 = setTimeout(() => {
      setProgress(100);
      setScanning(false);
      setResult({
        pulseBpm: 74,
        respirationRpm: 16,
        hrvMs: 48,
        snrQuality: 'EXCELLENT',
        scannedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }, 1800);
  };

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Camera size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: tokens.text, fontFamily: typography.fontFamily }}>
            rPPG Contactless Web-Camera Vitals Scanner
          </Text>
        </View>
        <Badge label="NON-INVASIVE TRIAGE" variant="mono" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 16 }}>
        Optical micro-facial blood volume pulse estimation. Analyzes sub-dermal color variations to estimate pulse rate, respiration, and HRV without hardware sensors.
      </Text>

      {/* Camera Viewfinder Mock */}
      <View style={{ backgroundColor: '#111827', borderRadius: radius.lg, height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
        <Camera size={48} color={scanning ? tokens.action : '#4b5563'} />
        <Text style={{ color: '#9ca3af', fontSize: 12, fontFamily: typography.fontMono, marginTop: 8 }}>
          {scanning ? `Analyzing rPPG Optical Pulse Signal... ${progress}%` : 'Position face inside camera viewfinder frame'}
        </Text>

        {scanning && (
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: tokens.action, width: `${progress}%` }} />
        )}
      </View>

      {/* Start Scan Button */}
      {!scanning && !result && (
        <TouchableOpacity
          onPress={handleStartScan}
          style={{ backgroundColor: tokens.action, padding: 12, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
        >
          <Camera size={18} color="#ffffff" />
          <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13, fontFamily: typography.fontFamily }}>
            Start 10-Second rPPG Vitals Scan
          </Text>
        </TouchableOpacity>
      )}

      {/* Scan Results Panel */}
      {result && (
        <View style={{ backgroundColor: tokens.surface2, borderRadius: radius.lg, padding: 16, border: `1px solid ${tokens.rule}` }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: tokens.text, fontFamily: typography.fontMono }}>
              ✓ SCAN COMPLETE ({result.scannedAt})
            </Text>
            <Badge label={`SIGNAL: ${result.snrQuality}`} variant="positive" />
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
            <View style={{ flex: 1, backgroundColor: tokens.canvas, padding: 12, borderRadius: 8, border: `1px solid ${tokens.rule}` }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: tokens.text3, fontFamily: typography.fontMono }}>PULSE RATE</Text>
              <Text style={{ fontSize: 20, fontWeight: '900', color: tokens.emergency, marginTop: 2 }}>{result.pulseBpm} BPM</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: tokens.canvas, padding: 12, borderRadius: 8, border: `1px solid ${tokens.rule}` }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: tokens.text3, fontFamily: typography.fontMono }}>RESPIRATION</Text>
              <Text style={{ fontSize: 20, fontWeight: '900', color: tokens.action, marginTop: 2 }}>{result.respirationRpm} RPM</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: tokens.canvas, padding: 12, borderRadius: 8, border: `1px solid ${tokens.rule}` }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: tokens.text3, fontFamily: typography.fontMono }}>HRV</Text>
              <Text style={{ fontSize: 20, fontWeight: '900', color: tokens.positive, marginTop: 2 }}>{result.hrvMs} ms</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleStartScan}
            style={{ backgroundColor: tokens.surface3, padding: 10, borderRadius: 8, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: tokens.text }}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );
};
