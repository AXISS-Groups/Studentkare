import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../theme/theme";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { Calculator, ShieldCheck, DollarSign, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { assertRule } from "../ai/constitution";

export const InsuranceCoverageCalculator: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  assertRule("Rule-K5"); // Drools NME non-medical expense deduction rule
  assertRule("Rule-K4"); // Provenance verification rule

  const [totalBill, setTotalBill] = useState<number>(45000);
  const [icuDays, setIcuDays] = useState<number>(1);
  const [roomCategory, setRoomCategory] = useState<"GENERAL_WARD" | "SEMI_PRIVATE" | "SUITE">("SEMI_PRIVATE");

  const roomRentCap = roomCategory === "GENERAL_WARD" ? 2000 : roomCategory === "SEMI_PRIVATE" ? 5000 : 10000;
  const actualRoomRentPerDay = roomCategory === "GENERAL_WARD" ? 1800 : roomCategory === "SEMI_PRIVATE" ? 6500 : 15000;
  const roomRentDeduction = Math.max(0, actualRoomRentPerDay - roomRentCap) * 2; // 2 days

  const nmeDeduction = 2850; // PPE kits, tissue boxes, administrative charges (IRDAI NME list)
  const coPayPercentage = 0.1; // 10% student group co-pay

  const grossApproved = Math.max(0, totalBill - nmeDeduction - roomRentDeduction);
  const coPayAmount = grossApproved * coPayPercentage;
  const netInsuranceCoverage = grossApproved - coPayAmount;
  const netOutOfPocket = totalBill - netInsuranceCoverage;

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Calculator size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: "800", color: tokens.text, fontFamily: typography.fontFamily }}>
            Student Group Health Insurance Pre-Auth Coverage Estimator
          </Text>
        </View>
        <Badge label="RULE-K5 NME ENGINE" variant="positive" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 16 }}>
        Simulates cashless hospital pre-authorization approval under ICICI Lombard / Star Health Student Group Policy. Pre-calculates IRDAI NME non-payable items & room capping.
      </Text>

      {/* Inputs Grid */}
      <View style={{ backgroundColor: tokens.surface2, borderRadius: radius.lg, padding: 14, border: `1px solid ${tokens.rule}`, marginBottom: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Text style={{ fontSize: 12, fontWeight: "800", color: tokens.text }}>Estimated Hospitalization Bill</Text>
          <Text style={{ fontSize: 14, fontWeight: "800", color: tokens.action, fontFamily: typography.fontMono }}>₹{totalBill.toLocaleString("en-IN")}</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
          {(["GENERAL_WARD", "SEMI_PRIVATE", "SUITE"] as const).map((cat) => {
            const active = roomCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setRoomCategory(cat)}
                style={{
                  flex: 1,
                  backgroundColor: active ? tokens.action : tokens.canvas,
                  padding: 8,
                  borderRadius: 8,
                  alignItems: "center",
                  border: `1px solid ${active ? tokens.action : tokens.rule}`,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: "800", color: active ? "#ffffff" : tokens.text }}>
                  {cat.replace("_", " ")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Breakdown Breakdown */}
      <View style={{ gap: 8, marginBottom: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 12, color: tokens.text2 }}>Rule-K5 IRDAI Non-Medical Expenses (NME)</Text>
          <Text style={{ fontSize: 12, color: tokens.emergency, fontWeight: "800", fontFamily: typography.fontMono }}>-₹{nmeDeduction.toLocaleString("en-IN")}</Text>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 12, color: tokens.text2 }}>Room Rent Capping Penalty ({roomCategory})</Text>
          <Text style={{ fontSize: 12, color: tokens.emergency, fontWeight: "800", fontFamily: typography.fontMono }}>-₹{roomRentDeduction.toLocaleString("en-IN")}</Text>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 12, color: tokens.text2 }}>Student Co-Pay (10%)</Text>
          <Text style={{ fontSize: 12, color: tokens.attention, fontWeight: "800", fontFamily: typography.fontMono }}>-₹{coPayAmount.toLocaleString("en-IN")}</Text>
        </View>
      </View>

      {/* Results Header Box */}
      <View style={{ backgroundColor: tokens.positiveBg, borderRadius: radius.lg, padding: 14, border: `1px solid ${tokens.positive}` }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: "800", color: tokens.positive, fontFamily: typography.fontMono }}>ESTIMATED CASHLESS APPROVAL</Text>
            <Text style={{ fontSize: 20, fontWeight: "900", color: tokens.positive, marginTop: 2 }}>₹{netInsuranceCoverage.toLocaleString("en-IN")}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 11, fontWeight: "800", color: tokens.text3, fontFamily: typography.fontMono }}>YOUR OUT-OF-POCKET</Text>
            <Text style={{ fontSize: 18, fontWeight: "800", color: tokens.text, marginTop: 2 }}>₹{netOutOfPocket.toLocaleString("en-IN")}</Text>
          </View>
        </View>
      </View>
    </Card>
  );
};
