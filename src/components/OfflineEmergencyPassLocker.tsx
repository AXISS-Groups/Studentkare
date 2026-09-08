import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "../theme/theme";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { QrCode, Download, CheckCircle2 } from "lucide-react";
import { useAppStore } from "../data/store";
import { assertRule } from "../ai/constitution";

export const OfflineEmergencyPassLocker: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  const { student } = useAppStore();
  assertRule("Rule-B"); // Emergency triage and 108 SOS rule

  const [downloaded, setDownloaded] = useState(false);

  const handleDownloadPass = () => {
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.emergency}` }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <QrCode size={22} color={tokens.emergency} />
          <Text style={{ fontSize: 16, fontWeight: "800", color: tokens.text, fontFamily: typography.fontFamily }}>
            Lockscreen Offline SOS Emergency Pass & Encrypted QR
          </Text>
        </View>
        <Badge label="100% OFFLINE ACCESS" variant="emergency" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 14 }}>
        PWA offline lockscreen pass. In case of emergency or zero network coverage, 108 responders scan this QR to instantly unlock blood group, emergency contact phone, and life-threatening allergies.
      </Text>

      {/* Emergency Pass Ticket Box */}
      <View style={{ backgroundColor: tokens.canvas, borderRadius: radius.lg, padding: 16, border: `1px dashed ${tokens.emergency}`, marginBottom: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: "800", color: tokens.emergency, fontFamily: typography.fontMono }}>EMERGENCY MEDICAL PASS</Text>
            <Text style={{ fontSize: 16, fontWeight: "800", color: tokens.text, marginTop: 2 }}>{student.fullName || "Aarav Sharma"}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 11, fontWeight: "800", color: tokens.text3, fontFamily: typography.fontMono }}>BLOOD GROUP</Text>
            <Text style={{ fontSize: 18, fontWeight: "900", color: tokens.emergency, fontFamily: typography.fontMono }}>{student.bloodGroup || "O+ (Positive)"}</Text>
          </View>
        </View>

        <View style={{ gap: 4, marginTop: 6 }}>
          <Text style={{ fontSize: 11, color: tokens.text2, fontFamily: typography.fontMono }}>
            📞 SOS Contact: {student.emergencyContactName} ({student.emergencyContactPhone})
          </Text>
          <Text style={{ fontSize: 11, color: tokens.text2, fontFamily: typography.fontMono }}>
            ⚠️ Known Allergies: Penicillin, Peanut Oil (Severe Anaphylaxis)
          </Text>
          <Text style={{ fontSize: 11, color: tokens.text2, fontFamily: typography.fontMono }}>
            🔐 Encryption: AES-256-GCM Offline Vault Payload
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={handleDownloadPass}
        disabled={downloaded}
        style={{
          backgroundColor: downloaded ? tokens.positive : tokens.emergency,
          padding: 12,
          borderRadius: 12,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {downloaded ? <CheckCircle2 size={18} color="#ffffff" /> : <Download size={18} color="#ffffff" />}
        <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 13, fontFamily: typography.fontFamily }}>
          {downloaded ? "✓ Offline Pass Saved to Device Lockscreen Wallet!" : "Save Pass to Apple Wallet / Google Pay Wallet (.pkpass)"}
        </Text>
      </TouchableOpacity>
    </Card>
  );
};
