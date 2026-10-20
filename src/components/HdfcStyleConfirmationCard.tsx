import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Check, CheckCircle2, Info } from "lucide-react";
import { color } from "@/design-system/theme";

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
          <Check size={22} color={color.onAction} strokeWidth={3} />
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
              <CheckCircle2 size={13} color={color.positiveFill} />
              <Text style={{ fontSize: 11, color: color.positive, fontWeight: "700" }}>Payee Validated</Text>
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
        <Info size={18} color={color.info} />
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
    backgroundColor: color.surface,
    borderRadius: 20,
    padding: 32,
    boxShadow: "0 20px 40px rgba(0, 32, 91, 0.08)",
    borderWidth: 1,
    borderColor: color.rule,
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
    backgroundColor: color.positiveFill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    boxShadow: "0 4px 12px rgba(22, 163, 74, 0.3)",
  },
  cardTitleText: {
    fontSize: 22,
    fontWeight: "800",
    color: color.text,
    marginBottom: 4,
  },
  cardSubtitleText: {
    fontSize: 13,
    color: color.text2,
  },
  detailsOuterBox: {
    borderWidth: 1,
    borderColor: color.rule,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    backgroundColor: color.surface,
  },
  detailsSectionHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: color.text,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    color: color.text3,
    fontWeight: "600",
    marginBottom: 2,
  },
  fieldValueBold: {
    fontSize: 14,
    fontWeight: "800",
    color: color.text,
  },
  fieldSubValue: {
    fontSize: 12,
    color: color.text3,
    marginTop: 2,
  },
  dividerLine: {
    height: 1,
    backgroundColor: color.ruleSoft,
    marginVertical: 14,
  },
  infoCalloutBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: color.surface3,
    borderWidth: 1,
    borderColor: color.rule,
    borderRadius: 12,
    padding: 14,
    marginBottom: 28,
  },
  infoCalloutText: {
    fontSize: 13,
    color: color.info,
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
    color: color.action,
  },
  outlineActionBtn: {
    borderWidth: 1.5,
    borderColor: color.action,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: color.surface,
  },
  outlineActionBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: color.action,
  },
  solidPrimaryBtn: {
    backgroundColor: color.action,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  solidPrimaryBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: color.onAction,
  },
});
