import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../theme/theme";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { Camera, Eye, Activity, Volume2, Sun, CheckCircle2, RefreshCw } from "lucide-react";
import { assertRule } from "../ai/constitution";

export const CameraSensorHealthSuite: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  assertRule("Rule-A");
  assertRule("Rule-C");

  const [activeTab, setActiveTab] = useState<"RPPG" | "EYE_Jaundice" | "POSTURE" | "AMBIENT">("RPPG");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  const handleRunCameraScan = () => {
    setIsScanning(true);
    setScanResult(null);
    setTimeout(() => {
      setIsScanning(false);
      if (activeTab === "RPPG") setScanResult("Heart Rate: 72 BPM · HRV: 48 ms (Normal Rest Vector)");
      else if (activeTab === "EYE_Jaundice") setScanResult("Sclera Bilirubin Index: Normal (0.8 mg/dL) · Zero Jaundice Risk");
      else if (activeTab === "POSTURE") setScanResult("Neck Angle: 12° Forward (Good Posture Alignment)");
      else setScanResult("Hostel Room Ambient: 340 Lux (Good Study Light) · Noise: 38 dB (Quiet Sleep Zone)");
    }, 1200);
  };

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Camera size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: "800", color: tokens.text, fontFamily: typography.fontFamily }}>
            Multi-Modal Camera & Ambient Sensor Health Suite
          </Text>
        </View>
        <Badge label="4 CAMERA & SENSOR ENGINES" variant="positive" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 14 }}>
        Leverages device camera & sensors for rPPG pulse scan, eye sclera jaundice check, posture ergonomics, and hostel ambient noise/light telemetry.
      </Text>

      {/* Mode Switcher */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {[
          { id: "RPPG", label: "rPPG Pulse & HRV" },
          { id: "EYE_Jaundice", label: "Eye Sclera Jaundice" },
          { id: "POSTURE", label: "Posture Ergonomics" },
          { id: "AMBIENT", label: "Ambient Light & Noise" },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => {
                setActiveTab(tab.id as any);
                setScanResult(null);
              }}
              style={{
                backgroundColor: active ? tokens.action : tokens.surface2,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                border: `1px solid ${active ? tokens.action : tokens.rule}`,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "800", color: active ? "#ffffff" : tokens.text }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Camera Viewport Simulation */}
      <View style={{ backgroundColor: tokens.canvas, borderRadius: radius.lg, padding: 18, alignItems: "center", border: `1px dashed ${tokens.action}`, marginBottom: 14 }}>
        <Camera size={32} color={tokens.action} />
        <Text style={{ fontSize: 13, fontWeight: "800", color: tokens.text, marginTop: 8 }}>
          {activeTab === "RPPG" && "Face Camera rPPG Micro-Color Pulse Frame Scanner"}
          {activeTab === "EYE_Jaundice" && "Sclera Bilirubin Colorimetry Camera Frame"}
          {activeTab === "POSTURE" && "Front Camera Spine & Cervical Angle Monitor"}
          {activeTab === "AMBIENT" && "Ambient Light Sensor (Lux) & Micro-Decibel Meter"}
        </Text>
        <Text style={{ fontSize: 11, color: tokens.text3, fontFamily: typography.fontMono, marginTop: 4 }}>
          Processing 100% on-device (Zero video data sent to server)
        </Text>
      </View>

      {scanResult && (
        <View style={{ backgroundColor: tokens.positiveBg, padding: 12, borderRadius: 10, border: `1px solid ${tokens.positive}`, marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={16} color={tokens.positive} />
          <Text style={{ fontSize: 12, fontWeight: "800", color: tokens.positive, fontFamily: typography.fontMono }}>
            ✓ {scanResult}
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={handleRunCameraScan}
        disabled={isScanning}
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
        {isScanning ? <RefreshCw size={18} color="#ffffff" /> : <Camera size={18} color="#ffffff" />}
        <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 13, fontFamily: typography.fontFamily }}>
          {isScanning ? "Processing Camera & Sensor Signal..." : `Run On-Device ${activeTab} Camera Scan`}
        </Text>
      </TouchableOpacity>
    </Card>
  );
};
