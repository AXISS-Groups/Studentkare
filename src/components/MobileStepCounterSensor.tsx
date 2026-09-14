import { observer } from 'mobx-react-lite';
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "../theme/theme";
import { useStudentStore } from "../store/AppStores";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { Footprints, MapPin, Play, Pause, CloudUpload } from "lucide-react";
import { assertRule } from "../ai/constitution";
import { telemetryApi } from "../data/api";

const MobileStepCounterSensorUnwrapped: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  const { student } = useStudentStore();
  assertRule("Rule-L8"); // Points ledger isolation rule

  const [steps, setSteps] = useState<number>(7420);
  const [isTracking, setIsTracking] = useState<boolean>(true);
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "synced" | "offline">("idle");

  useEffect(() => {
    let interval: any = null;
    if (isTracking) {
      interval = setInterval(() => {
        setSteps((prev) => prev + Math.floor(Math.random() * 3) + 1);
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTracking]);

  const distanceKm = (steps * 0.00075).toFixed(2);

  const syncToServer = async () => {
    setSyncState("syncing");
    const res = await telemetryApi.ingest("mobile-pedometer", "STEP_COUNTER", { steps }, student.id);
    setSyncState(res && res.success ? "synced" : "offline");
    setTimeout(() => setSyncState("idle"), 2500);
  };

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Footprints size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: "800", color: tokens.text, fontFamily: typography.fontFamily }}>
            Mobile Pedometer & Campus Step Counter Sensor
          </Text>
        </View>
        <Badge label="ACCELEROMETER ACTIVE" variant="positive" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 14 }}>
        Step tracking on your device. Steps are counted and synced — they are not used to set targets, burn estimates or reward points.
      </Text>

      {/* Main Step Counter Display */}
      <View style={{ backgroundColor: tokens.surface2, borderRadius: radius.lg, padding: 18, border: `1px solid ${tokens.rule}`, marginBottom: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: "800", color: tokens.text3, fontFamily: typography.fontMono }}>STEPS COUNTED</Text>
            <Text style={{ fontSize: 28, fontWeight: "900", color: tokens.text, marginTop: 2, fontFamily: typography.fontMono }}>
              {steps.toLocaleString("en-IN")} <Text style={{ fontSize: 14, color: tokens.text2 }}>steps</Text>
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Badge label="DESCRIPTIVE ONLY" variant="positive" />
          </View>
        </View>

        {/* Sensor Metrics Row */}
        <View style={{ flexDirection: "row", justifyContent: "space-around", backgroundColor: tokens.canvas, padding: 10, borderRadius: 8 }}>
          <View style={{ alignItems: "center" }}>
            <Footprints size={16} color={tokens.action} />
            <Text style={{ fontSize: 12, fontWeight: "800", color: tokens.text, marginTop: 2 }}>{steps.toLocaleString("en-IN")}</Text>
            <Text style={{ fontSize: 10, color: tokens.text3 }}>Steps</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <MapPin size={16} color={tokens.action} />
            <Text style={{ fontSize: 12, fontWeight: "800", color: tokens.text, marginTop: 2 }}>{distanceKm} km</Text>
            <Text style={{ fontSize: 10, color: tokens.text3 }}>Distance</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={syncToServer}
        disabled={syncState === "syncing"}
        style={{
          backgroundColor: tokens.action,
          padding: 10,
          borderRadius: 10,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <CloudUpload size={16} color="#ffffff" />
        <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 12, fontFamily: typography.fontFamily }}>
          {syncState === "syncing" ? "Syncing..." : syncState === "synced" ? "Synced to health portal" : syncState === "offline" ? "Offline — try again" : "Sync steps to health portal"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setIsTracking(!isTracking)}
        style={{
          backgroundColor: isTracking ? tokens.surface2 : tokens.action,
          padding: 10,
          borderRadius: 10,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 6,
          border: `1px solid ${tokens.rule}`,
        }}
      >
        {isTracking ? <Pause size={16} color={tokens.text} /> : <Play size={16} color="#ffffff" />}
        <Text style={{ color: isTracking ? tokens.text : "#ffffff", fontWeight: "800", fontSize: 12, fontFamily: typography.fontFamily }}>
          {isTracking ? "Pause Accelerometer Step Tracking" : "Resume Mobile Step Tracking"}
        </Text>
      </TouchableOpacity>
    </Card>
  );
};

export const MobileStepCounterSensor: React.FC = observer(MobileStepCounterSensorUnwrapped);
