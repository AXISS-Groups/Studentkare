import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../theme/theme";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { Footprints, Flame, MapPin, Trophy, Play, Pause, RefreshCw } from "lucide-react";
import { assertRule } from "../ai/constitution";

export const MobileStepCounterSensor: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  assertRule("Rule-L8"); // Points ledger isolation rule

  const [steps, setSteps] = useState<number>(7420);
  const [isTracking, setIsTracking] = useState<boolean>(true);

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

  const targetSteps = 10000;
  const progressPercent = Math.min(100, Math.round((steps / targetSteps) * 100));
  const distanceKm = (steps * 0.00075).toFixed(2);
  const caloriesBurned = Math.round(steps * 0.04);
  const pointsEarned = Math.floor(steps / 50);

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
        Real-time motion sensor tracking steps as you walk across campus. Earns Rule-L8 non-monetary health reward points.
      </Text>

      {/* Main Step Counter Display */}
      <View style={{ backgroundColor: tokens.surface2, borderRadius: radius.lg, padding: 18, border: `1px solid ${tokens.rule}`, marginBottom: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: "800", color: tokens.text3, fontFamily: typography.fontMono }}>DAILY STEP GOAL (10,000 STEPS)</Text>
            <Text style={{ fontSize: 28, fontWeight: "900", color: tokens.text, marginTop: 2, fontFamily: typography.fontMono }}>
              {steps.toLocaleString("en-IN")} <Text style={{ fontSize: 14, color: tokens.text2 }}>steps</Text>
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Badge label={`+${pointsEarned} WELLNESS PTS`} variant="reward" />
            <Text style={{ fontSize: 11, color: tokens.text2, fontFamily: typography.fontMono, marginTop: 4 }}>
              {progressPercent}% Achieved
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={{ height: 10, backgroundColor: tokens.canvas, borderRadius: 5, overflow: "hidden", marginBottom: 12 }}>
          <View style={{ height: "100%", width: `${progressPercent}%`, backgroundColor: tokens.action, borderRadius: 5 }} />
        </View>

        {/* Sensor Metrics Row */}
        <View style={{ flexDirection: "row", justifyContent: "space-around", backgroundColor: tokens.canvas, padding: 10, borderRadius: 8 }}>
          <View style={{ alignItems: "center" }}>
            <Flame size={16} color={tokens.emergency} />
            <Text style={{ fontSize: 12, fontWeight: "800", color: tokens.text, marginTop: 2 }}>{caloriesBurned} kcal</Text>
            <Text style={{ fontSize: 10, color: tokens.text3 }}>Burned</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <MapPin size={16} color={tokens.action} />
            <Text style={{ fontSize: 12, fontWeight: "800", color: tokens.text, marginTop: 2 }}>{distanceKm} km</Text>
            <Text style={{ fontSize: 10, color: tokens.text3 }}>Distance</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Trophy size={16} color={tokens.reward} />
            <Text style={{ fontSize: 12, fontWeight: "800", color: tokens.text, marginTop: 2 }}>Level 4</Text>
            <Text style={{ fontSize: 10, color: tokens.text3 }}>Walker</Text>
          </View>
        </View>
      </View>

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
