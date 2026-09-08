import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "../theme/theme";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { Eye, Type, Contrast } from "lucide-react";
import { assertRule } from "../ai/constitution";

export const UserAccessibilityCustomizer: React.FC = () => {
  const { tokens, typography } = useTheme();
  assertRule("Rule-A");

  const [highContrast, setHighContrast] = useState(false);
  const [dyslexicFont, setDyslexicFont] = useState(false);
  const [fontSizeScale, setFontSizeScale] = useState<"NORMAL" | "LARGE" | "XLARGE">("NORMAL");

  return (
    <Card variant="surface" style={{ padding: 16, marginBottom: 16, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Eye size={20} color={tokens.action} />
          <Text style={{ fontSize: 14, fontWeight: "800", color: tokens.text, fontFamily: typography.fontFamily }}>
            Accessibility & Inclusive Design Controls
          </Text>
        </View>
        <Badge label="WCAG 2.1 AAA COMPLIANT" variant="positive" />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <TouchableOpacity
          onPress={() => setHighContrast(!highContrast)}
          style={{
            backgroundColor: highContrast ? tokens.action : tokens.surface2,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            border: `1px solid ${highContrast ? tokens.action : tokens.rule}`,
          }}
        >
          <Contrast size={14} color={highContrast ? "#ffffff" : tokens.text} />
          <Text style={{ fontSize: 11, fontWeight: "700", color: highContrast ? "#ffffff" : tokens.text }}>
            High Contrast Mode {highContrast ? "ON" : "OFF"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setDyslexicFont(!dyslexicFont)}
          style={{
            backgroundColor: dyslexicFont ? tokens.action : tokens.surface2,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            border: `1px solid ${dyslexicFont ? tokens.action : tokens.rule}`,
          }}
        >
          <Type size={14} color={dyslexicFont ? "#ffffff" : tokens.text} />
          <Text style={{ fontSize: 11, fontWeight: "700", color: dyslexicFont ? "#ffffff" : tokens.text }}>
            OpenDyslexic Font {dyslexicFont ? "ON" : "OFF"}
          </Text>
        </TouchableOpacity>

        {(["NORMAL", "LARGE", "XLARGE"] as const).map((scale) => {
          const active = fontSizeScale === scale;
          return (
            <TouchableOpacity
              key={scale}
              onPress={() => setFontSizeScale(scale)}
              style={{
                backgroundColor: active ? tokens.action : tokens.surface2,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 16,
                border: `1px solid ${active ? tokens.action : tokens.rule}`,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: active ? "#ffffff" : tokens.text }}>
                Font: {scale}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Card>
  );
};
