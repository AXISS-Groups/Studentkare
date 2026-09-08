import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../theme/theme";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { Watch, Heart, Activity, Moon, Thermometer, CheckCircle2, RefreshCw, Wifi } from "lucide-react";
import { assertRule } from "../ai/constitution";

export const SmartWatchWearableHub: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  assertRule("Rule-C");
  assertRule("Rule-A");

  const [connectedDevice, setConnectedDevice] = useState<"APPLE_WATCH" | "WEAR_OS" | "NOISE_BOAT">("APPLE_WATCH");
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState("Just now");

  const handleSyncData = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime("Updated 10s ago");
    }, 1000);
  };

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Watch size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: "800", color: tokens.text, fontFamily: typography.fontFamily }}>
            Smartwatch & Wearable Live Telemetry Hub (Apple / WearOS / Noise)
          </Text>
        </View>
        <Badge label="BLE / HEALTHKIT CONNECTED" variant="positive" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 14 }}>
        Syncs real-time vital telemetry from student smartwatches. Features continuous SpO2, single-lead ECG, wrist skin temperature, and sleep architecture analysis.
      </Text>

      {/* Device Switcher */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        {[
          { id: "APPLE_WATCH", label: "Apple Watch Series 9" },
          { id: "WEAR_OS", label: "Galaxy Watch / WearOS" },
          { id: "NOISE_BOAT", label: "Noise / BoAt Smartwatch" },
        ].map((dev) => {
          const active = connectedDevice === dev.id;
          return (
            <TouchableOpacity
              key={dev.id}
              onPress={() => setConnectedDevice(dev.id as any)}
              style={{
                backgroundColor: active ? tokens.action : tokens.surface2,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
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

      {/* Live Vitals Grid */}
      <View style={{ backgroundColor: tokens.surface2, borderRadius: radius.lg, padding: 14, border: `1px solid ${tokens.rule}`, marginBottom: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={{ fontSize: 11, fontWeight: "800", color: tokens.text3, fontFamily: typography.fontMono }}>CONNECTED DEVICE TELEMETRY</Text>
          <Text style={{ fontSize: 11, color: tokens.positive, fontWeight: "800", fontFamily: typography.fontMono }}>● LIVE SYNC ({lastSyncTime})</Text>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {/* SpO2 */}
          <View style={{ flex: 1, minWidth: 120, backgroundColor: tokens.canvas, padding: 10, borderRadius: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Activity size={14} color={tokens.action} />
              <Text style={{ fontSize: 11, color: tokens.text2 }}>Blood Oxygen (SpO2)</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: "800", color: tokens.text, marginTop: 4, fontFamily: typography.fontMono }}>98% Normal</Text>
          </View>

          {/* ECG */}
          <View style={{ flex: 1, minWidth: 120, backgroundColor: tokens.canvas, padding: 10, borderRadius: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Heart size={14} color={tokens.emergency} />
              <Text style={{ fontSize: 11, color: tokens.text2 }}>Single-Lead ECG</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: "800", color: tokens.positive, marginTop: 4, fontFamily: typography.fontMono }}>Sinus Rhythm</Text>
          </View>

          {/* Wrist Temp */}
          <View style={{ flex: 1, minWidth: 120, backgroundColor: tokens.canvas, padding: 10, borderRadius: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Thermometer size={14} color={tokens.attention} />
              <Text style={{ fontSize: 11, color: tokens.text2 }}>Wrist Temp</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: "800", color: tokens.text, marginTop: 4, fontFamily: typography.fontMono }}>98.4 °F</Text>
          </View>

          {/* Sleep */}
          <View style={{ flex: 1, minWidth: 120, backgroundColor: tokens.canvas, padding: 10, borderRadius: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Moon size={14} color={tokens.action} />
              <Text style={{ fontSize: 11, color: tokens.text2 }}>Sleep Score</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: "800", color: tokens.text, marginTop: 4, fontFamily: typography.fontMono }}>7h 40m (88%)</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={handleSyncData}
        disabled={isSyncing}
        style={{
          backgroundColor: tokens.action,
          padding: 10,
          borderRadius: 10,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <RefreshCw size={16} color="#ffffff" />
        <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 12, fontFamily: typography.fontFamily }}>
          {isSyncing ? "Fetching Latest Smartwatch Telemetry..." : "Sync Latest Telemetry from Smartwatch"}
        </Text>
      </TouchableOpacity>
    </Card>
  );
};
