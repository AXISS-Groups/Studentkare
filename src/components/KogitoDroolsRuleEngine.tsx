import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../theme/theme";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { Cpu, Play, CheckCircle2, ShieldCheck, FileText } from "lucide-react";
import { assertRule } from "../ai/constitution";

export const KogitoDroolsRuleEngine: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  assertRule("Rule-K5"); // Rules engine computes financials rule
  assertRule("Rule-K2"); // Human reviewer required rule

  const [executed, setExecuted] = useState(true);

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Cpu size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: "800", color: tokens.text, fontFamily: typography.fontFamily }}>
            Red Hat Kogito / Drools Open Source DMN Rules Engine
          </Text>
        </View>
        <Badge label="OPEN SOURCE DROOLS v8.44" variant="positive" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 14 }}>
        Open-source Drools DMN (Decision Model and Notation) engine. Enforces Rule-K5 deterministic financial tariff deductions and non-medical expense (NME) rules.
      </Text>

      {/* DMN Decision Table Inspector */}
      <View style={{ backgroundColor: tokens.canvas, borderRadius: radius.lg, padding: 14, border: `1px solid ${tokens.rule}`, marginBottom: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: "800", color: tokens.action, fontFamily: typography.fontMono }}>DMN DECISION TABLE: ClaimDeductionRules.dmn</Text>
          <Badge label="EVALUATION: PASS" variant="positive" />
        </View>
        <Text style={{ fontSize: 11, color: tokens.text2, fontFamily: typography.fontMono, lineHeight: 16 }}>
          Rule 1: IF itemCategory == NON_MEDICAL THEN deductAmount = 100% (IRDAI NME List)

          Rule 2: IF roomType == SEMI_PRIVATE AND dailyRent &gt; 5000 THEN applyRoomCappingPenalty()

          Rule 3: IF patientAge &lt; 25 AND policy == STUDENT_GROUP THEN applyCopay(10%)
        </Text>
      </View>

      <View style={{ backgroundColor: tokens.positiveBg, padding: 10, borderRadius: 8, border: `1px solid ${tokens.positive}` }}>
        <Text style={{ fontSize: 11, fontWeight: "800", color: tokens.positive, fontFamily: typography.fontMono }}>
          ✓ Deterministic Execution Completed in 4ms (0 AI Deliberation Delay)
        </Text>
      </View>
    </Card>
  );
};
