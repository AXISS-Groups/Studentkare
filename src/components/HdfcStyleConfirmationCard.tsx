import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Check, CheckCircle2, Info } from "lucide-react";

interface HdfcStyleConfirmationCardProps {
  title?: string;
  subtitle?: string;
  payeeName?: string;
  accountNumber?: string;
  accountName?: string;
  bankDetails?: string;
  ifscCode?: string;
  confirmationNotice?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  onTertiaryAction?: () => void;
}

export const HdfcStyleConfirmationCard: React.FC<HdfcStyleConfirmationCardProps> = ({
  title = "Payee Added",
  subtitle = "You can transfer funds to this payee after 30 minutes.",
  payeeName = "Nikita Naresh",
  accountNumber = "**** **** 4292",
  accountName = "NIKITA NARESH KHANNA",
  bankDetails = "ICICI BANK LIMITED",
  ifscCode = "ICIC0004374",
  confirmationNotice = "You'll receive a confirmation shortly via WhatsApp, SMS, and email.",
  onPrimaryAction,
  onSecondaryAction,
  onTertiaryAction,
}) => {


  return (
    <View style={styles.cardContainer}>
      {/* Top Confetti & Success Badge Area */}
      <View style={styles.headerConfettiArea}>
        {/* Subtle Confetti Dots Simulation */}
        <div style={{ position: "absolute", top: 10, left: 30, color: "#fca5a5", fontSize: 16 }}>✦</div>
        <div style={{ position: "absolute", top: 25, left: 100, color: "#86efac", fontSize: 14 }}>~</div>
        <div style={{ position: "absolute", top: 15, right: 80, color: "#cbd5e1", fontSize: 18 }}>▲</div>
        <div style={{ position: "absolute", top: 35, right: 30, color: "#fde047", fontSize: 14 }}>▪</div>

        <View style={styles.successCheckBadge}>
          <Check size={22} color="#ffffff" strokeWidth={3} />
        </View>

        <Text style={styles.cardTitleText}>{title}</Text>
        <Text style={styles.cardSubtitleText}>{subtitle}</Text>
      </View>

      {/* Structured Details Box */}
      <View style={styles.detailsOuterBox}>
        <Text style={styles.detailsSectionHeading}>Payee Details</Text>

        <View style={{ marginBottom: 16 }}>
          <Text style={styles.fieldLabel}>Payee Nickname</Text>
          <Text style={styles.fieldValueBold}>{payeeName}</Text>
        </View>

        <View style={styles.dividerLine} />

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
          <View>
            <Text style={styles.fieldLabel}>Account Number</Text>
            <Text style={styles.fieldValueBold}>{accountNumber}</Text>
            <Text style={styles.fieldSubValue}>Savings</Text>
          </View>

          <View>
            <Text style={styles.fieldLabel}>Name as per Account</Text>
            <Text style={styles.fieldValueBold}>{accountName}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
              <CheckCircle2 size={13} color="#16a34a" />
              <Text style={{ fontSize: 11, color: "#16a34a", fontWeight: "700" }}>Payee Validated</Text>
            </View>
          </View>
        </View>

        <View>
          <Text style={styles.fieldLabel}>Bank Details</Text>
          <Text style={styles.fieldValueBold}>{bankDetails}</Text>
          <Text style={styles.fieldSubValue}>IFSC - {ifscCode}</Text>
        </View>
      </View>

      {/* Blue Confirmation Callout Banner */}
      <View style={styles.infoCalloutBanner}>
        <Info size={18} color="#0052cc" />
        <Text style={styles.infoCalloutText}>{confirmationNotice}</Text>
      </View>

      {/* Action Buttons Row */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity onPress={onTertiaryAction} style={styles.textActionBtn}>
          <Text style={styles.textActionBtnText}>Go to Send Money</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity onPress={onSecondaryAction} style={styles.outlineActionBtn}>
            <Text style={styles.outlineActionBtnText}>Add Another Payee</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onPrimaryAction} style={styles.solidPrimaryBtn}>
            <Text style={styles.solidPrimaryBtnText}>View All Payees</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 32,
    boxShadow: "0 20px 40px rgba(0, 32, 91, 0.08)",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  headerConfettiArea: {
    alignItems: "center",
    marginBottom: 28,
    position: "relative",
    paddingTop: 8,
  },
  successCheckBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    boxShadow: "0 4px 12px rgba(22, 163, 74, 0.3)",
  },
  cardTitleText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  cardSubtitleText: {
    fontSize: 13,
    color: "#64748b",
  },
  detailsOuterBox: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    backgroundColor: "#ffffff",
  },
  detailsSectionHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 2,
  },
  fieldValueBold: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  fieldSubValue: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  dividerLine: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 14,
  },
  infoCalloutBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 12,
    padding: 14,
    marginBottom: 28,
  },
  infoCalloutText: {
    fontSize: 13,
    color: "#1e40af",
    fontWeight: "600",
    flex: 1,
  },
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  textActionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  textActionBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0052cc",
  },
  outlineActionBtn: {
    borderWidth: 1.5,
    borderColor: "#0052cc",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },
  outlineActionBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0052cc",
  },
  solidPrimaryBtn: {
    backgroundColor: "#0052cc",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  solidPrimaryBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
});
