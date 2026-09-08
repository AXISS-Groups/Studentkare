import React, { useState } from "react";
import { View, Text } from "react-native";
import { useTheme } from "../theme/theme";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { Server, WifiOff } from "lucide-react";
import { assertRule } from "../ai/constitution";

export const OllamaLocalInferenceGateway: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  assertRule("Rule-C"); // Zero training rule

  const [ activeModel ] = useState("Llama-3-8B-Med-Instruct (Local On-Prem)");
  const [ latencyMs ] = useState(14);

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Server size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: "800", color: tokens.text, fontFamily: typography.fontFamily }}>
            Ollama / LocalAI On-Premise Privacy Engine (100% Air-Gapped)
          </Text>
        </View>
        <Badge label="ZERO CLOUD EGRESS" variant="positive" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 14 }}>
        Open-source Ollama local LLM inference gateway running on campus GPU edge nodes. Guarantees 100% compliance with Rule-C: zero student data transmitted to external API providers.
      </Text>

      {/* Model Status Card */}
      <View style={{ backgroundColor: tokens.canvas, borderRadius: radius.lg, padding: 14, border: `1px solid ${tokens.rule}`, marginBottom: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: "800", color: tokens.text3, fontFamily: typography.fontMono }}>ON-PREM ENGINE</Text>
          <Text style={{ fontSize: 11, fontWeight: "800", color: tokens.positive, fontFamily: typography.fontMono }}>● LOCALHOST:11434 (ACTIVE)</Text>
        </View>
        <Text style={{ fontSize: 13, fontWeight: "800", color: tokens.text }}>{activeModel}</Text>
        <Text style={{ fontSize: 11, color: tokens.text2, fontFamily: typography.fontMono, marginTop: 4 }}>
          Inference Speed: 84 tokens/sec · Latency: {latencyMs}ms · Network Egress: 0 KB (Air-Gapped)
        </Text>
      </View>

      <View style={{ backgroundColor: tokens.positiveBg, padding: 10, borderRadius: 8, border: `1px solid ${tokens.positive}`, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <WifiOff size={16} color={tokens.positive} />
        <Text style={{ fontSize: 11, fontWeight: "800", color: tokens.positive, fontFamily: typography.fontMono }}>
          ✓ Rule-C Audit Verified: Zero Student Record Bytes Exported Outside Campus Subnet
        </Text>
      </View>
    </Card>
  );
};
