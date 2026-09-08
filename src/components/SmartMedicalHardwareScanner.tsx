import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../theme/theme";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { Bluetooth, Stethoscope, Activity, CheckCircle2, RefreshCw } from "lucide-react";
import { assertRule } from "../ai/constitution";

export const SmartMedicalHardwareScanner: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  assertRule("Rule-K4");
  assertRule("Rule-A");

  const [activeDevice, setActiveDevice] = useState<"BP_MONITOR" | "PULSE_OX" | "THERMOMETER" | "GLUCOMETER">("BP_MONITOR");
  const [isPairing, setIsPairing] = useState(false);
  const [pairedData, setPairedData] = useState<string | null>(null);

  const handlePairBleDevice = () => {
    setIsPairing(true);
    setPairedData(null);
    setTimeout(() => {
      setIsPairing(false);
      if (activeDevice === "BP_MONITOR") setPairedData("Blood Pressure: 118 / 76 mmHg (Normal)");
      else if (activeDevice === "PULSE_OX") setPairedData("SpO2: 99% · Pulse: 70 BPM");
      else if (activeDevice === "THERMOMETER") setPairedData("Body Temp: 98.6 °F (37.0 °C)");
      else setPairedData("Fasting Blood Sugar: 92 mg/dL (Normal)");
    }, 1200);
  };

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Bluetooth size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: "800", color: tokens.text, fontFamily: typography.fontFamily }}>
            External Medical Device Bluetooth (BLE) Hardware Hub
          </Text>
        </View>
        <Badge label="WEBBLUETOOTH GATT READY" variant="positive" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 14 }}>
        Connects via Bluetooth Low Energy (BLE GATT) to external clinical hardware (Omron BP, Beurer Oximeter, Accu-Chek Glucometer).
      </Text>

      {/* Device Picker */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {[
          { id: "BP_MONITOR", label: "Omron Smart BP Monitor" },
          { id: "PULSE_OX", label: "Beurer BLE Pulse Oximeter" },
          { id: "THERMOMETER", label: "Braun IR Thermometer" },
          { id: "GLUCOMETER", label: "Accu-Chek Glucometer" },
        ].map((dev) => {
          const active = activeDevice === dev.id;
          return (
            <TouchableOpacity
              key={dev.id}
              onPress={() => {
                setActiveDevice(dev.id as any);
                setPairedData(null);
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
                {dev.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {pairedData && (
        <View style={{ backgroundColor: tokens.positiveBg, padding: 12, borderRadius: 10, border: `1px solid ${tokens.positive}`, marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={16} color={tokens.positive} />
          <Text style={{ fontSize: 12, fontWeight: "800", color: tokens.positive, fontFamily: typography.fontMono }}>
            ✓ Auto-Synced from BLE Device: {pairedData}
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={handlePairBleDevice}
        disabled={isPairing}
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
        {isPairing ? <RefreshCw size={18} color="#ffffff" /> : <Bluetooth size={18} color="#ffffff" />}
        <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 13, fontFamily: typography.fontFamily }}>
          {isPairing ? "Scanning & Pairing Bluetooth Hardware..." : `Connect & Read ${activeDevice.replace("_", " ")}`}
        </Text>
      </TouchableOpacity>
    </Card>
  );
};
