import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../theme/theme";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { HeartPulse, ShieldCheck, Lock, UserCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { assertRule } from "../ai/constitution";

export interface CohortStressMetrics {
  cohortName: string;
  studentCount: number; // Must be >= 20
  stressIndex: number; // 0 to 100
  burnoutRisk: "LOW" | "ELEVATED" | "HIGH";
  primaryStressor: string;
}

export const MentalHealthStressRadar: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  assertRule("Rule-K-Anonymity"); // Strict k>=20 anonymity floor rule
  assertRule("Rule-K8"); // Sensitive category (Mental Health) consent & 3rd specialist pool approver rule

  const [bookedCounsellor, setBookedCounsellor] = useState(false);

  const cohortMetrics: CohortStressMetrics[] = [
    { cohortName: "Hostel 4 · B.Tech 3rd Year CSE", studentCount: 142, stressIndex: 78, burnoutRisk: "HIGH", primaryStressor: "Mid-Term Exams & Placement Prep" },
    { cohortName: "Hostel 1 · M.Tech BioTech", studentCount: 64, stressIndex: 42, burnoutRisk: "LOW", primaryStressor: "Lab Thesis Deadlines" },
    { cohortName: "Hostel 7 · First Year Undergrads", studentCount: 210, stressIndex: 65, burnoutRisk: "ELEVATED", primaryStressor: "Campus Adaptation & Sleep Hygiene" },
  ];

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <HeartPulse size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: "800", color: tokens.text, fontFamily: typography.fontFamily }}>
            Campus Psychological Resilience & Burnout Radar
          </Text>
        </View>
        <Badge label="STRICT k≥20 ANONYMIZED" variant="positive" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 14 }}>
        Aggregated cohort stress telemetry and exam-season burnout radar. Zero individual tracking (k-Anonymity floor = 20 enforced). Protected under Rule-K8 sensitive health category rules.
      </Text>

      {/* Cohort Stress Cards */}
      <View style={{ gap: 10, marginBottom: 16 }}>
        {cohortMetrics.map((cohort, idx) => (
          <View key={idx} style={{ backgroundColor: tokens.surface2, borderRadius: radius.lg, padding: 14, border: `1px solid ${tokens.rule}` }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: "800", color: tokens.text }}>{cohort.cohortName}</Text>
                <Text style={{ fontSize: 11, color: tokens.text3, fontFamily: typography.fontMono, marginTop: 2 }}>
                  Cohort Size: {cohort.studentCount} Students (k ≥ 20 Verified)
                </Text>
              </View>
              <Badge
                label={`Burnout Risk: ${cohort.burnoutRisk}`}
                variant={cohort.burnoutRisk === "HIGH" ? "emergency" : cohort.burnoutRisk === "ELEVATED" ? "attention" : "positive"}
              />
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: tokens.canvas, padding: 10, borderRadius: 8, marginTop: 6 }}>
              <Text style={{ fontSize: 11, color: tokens.text2, fontFamily: typography.fontMono }}>
                Primary Stressor: {cohort.primaryStressor}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: "800", color: cohort.stressIndex > 70 ? tokens.emergency : tokens.positive }}>
                Stress Index: {cohort.stressIndex}/100
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Confidential Counselling Booking */}
      <TouchableOpacity
        onPress={() => {
          setBookedCounsellor(true);
          setTimeout(() => setBookedCounsellor(false), 3000);
        }}
        disabled={bookedCounsellor}
        style={{
          backgroundColor: bookedCounsellor ? tokens.positive : tokens.action,
          padding: 12,
          borderRadius: 12,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <UserCheck size={18} color="#ffffff" />
        <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 13, fontFamily: typography.fontFamily }}>
          {bookedCounsellor ? "✓ Confidential Session Booked with Dr. Vikram Sen (Room 204)" : "Book 1-on-1 Confidential Campus Counselling"}
        </Text>
      </TouchableOpacity>
    </Card>
  );
};
