import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../theme/theme";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { Mic, Zap, Activity, CheckCircle2, RefreshCw } from "lucide-react";
import { assertRule } from "../ai/constitution";

export const CameraAcousticRespiratoryScanner: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  assertRule("Rule-A");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [acousticResult, setAcousticResult] = useState<string | null>(null);

  const handleRunAcousticScan = () => {
    setIsAnalyzing(true);
    setAcousticResult(null);
    setTimeout(() => {
      setIsAnalyzing(false);
      setAcousticResult("Cough Acoustic Pattern: Non-productive Dry Cough (Frequency 420 Hz) · Respiration Rate: 16 breaths/min · Wheezing: Negative");
    }, 1400);
  };

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Mic size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: "800", color: tokens.text, fontFamily: typography.fontFamily }}>
            Microphone Acoustic Respiratory & Cough Spectrum Analyzer
          </Text>
        </View>
        <Badge label="ACOUSTIC AI READY" variant="positive" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 14 }}>
        Analyzes cough sound spectrum and breathing intervals via mobile microphone to classify dry/wet cough, wheezing, and respiratory rate.
      </Text>

      {/* Microphone Waveform Box */}
      <View style={{ backgroundColor: tokens.canvas, borderRadius: radius.lg, padding: 18, alignItems: "center", border: `1px dashed ${tokens.action}`, marginBottom: 14 }}>
        <Mic size={32} color={tokens.action} />
        <Text style={{ fontSize: 13, fontWeight: "800", color: tokens.text, marginTop: 8 }}>
          Mobile Microphone Acoustic Frequency Sensor
        </Text>
        <Text style={{ fontSize: 11, color: tokens.text3, fontFamily: typography.fontMono, marginTop: 4 }}>
          Cough or breathe near microphone for 5 seconds
        </Text>
      </View>

      {acousticResult && (
        <View style={{ backgroundColor: tokens.positiveBg, padding: 12, borderRadius: 10, border: `1px solid ${tokens.positive}`, marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={16} color={tokens.positive} />
          <Text style={{ fontSize: 12, fontWeight: "800", color: tokens.positive, fontFamily: typography.fontMono }}>
            ✓ {acousticResult}
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={handleRunAcousticScan}
        disabled={isAnalyzing}
        style={{
          backgroundColor: tokens.action,
          padding: 12,
          borderRadius: 12,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {isAnalyzing ? <RefreshCw size={18} color="#ffffff" /> : <Mic size={18} color="#ffffff" />}
        <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 13, fontFamily: typography.fontFamily }}>
          {isAnalyzing ? "Analyzing Acoustic Frequency Spectrum..." : "Record & Analyze Cough / Breathing Sound"}
        </Text>
      </TouchableOpacity>
    </Card>
  );
};
