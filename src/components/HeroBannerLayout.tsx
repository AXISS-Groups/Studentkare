import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../theme/theme";
import { Search, HelpCircle, Bell, Power, User, ArrowLeft, CheckCircle2, Info } from "lucide-react";
import { StudentKareLogo } from "./StudentKareLogo";
import { Badge } from "./Badge";

interface HeroBannerLayoutProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
}

export const HeroBannerLayout: React.FC<HeroBannerLayoutProps> = ({
  title = "Student Health & ABDM Portal",
  subtitle,
  onBack,
  children,
}) => {
  const { tokens, radius, typography } = useTheme();

  return (
    <View style={styles.outerContainer}>
      {/* Top HDFC-Style Dark Navy Hero Banner Header */}
      <View style={styles.heroBannerHeader}>
        {/* SVG Pattern Overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.12,
            backgroundImage: "radial-gradient(circle at 25px 25px, #ffffff 2%, transparent 0%), radial-gradient(circle at 75px 75px, #ffffff 2%, transparent 0%)",
            backgroundSize: "100px 100px",
            pointerEvents: "none",
          }}
        />

        {/* Top Utility Nav Bar */}
        <View style={styles.topNavRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <StudentKareLogo size={28} />
          </View>

          {/* Search Bar Input */}
          <View style={styles.searchBarBox}>
            <Search size={15} color="#00205b" />
            <input
              type="text"
              placeholder="Search Download Statement, Reset Password etc"
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#1e293b",
                fontSize: 13,
                fontFamily: typography.fontFamily,
                width: "100%",
              }}
            />
          </View>

          {/* Top Right Quick Icons */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
            <TouchableOpacity style={styles.topNavIconBtn}>
              <HelpCircle size={17} color="#cbd5e1" />
              <Text style={styles.topNavIconLabel}>Services & Support</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.topNavIconBtn}>
              <Bell size={17} color="#cbd5e1" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.topNavIconBtn}>
              <Power size={17} color="#cbd5e1" />
            </TouchableOpacity>

            {/* Profile Avatar Pill */}
            <View style={styles.avatarPill}>
              <Text style={{ color: "#00205b", fontWeight: "800", fontSize: 12, fontFamily: typography.fontMono }}>CS</Text>
            </View>
          </View>
        </View>

        {/* Secondary Category Navigation Links */}
        <View style={styles.categoryNavRow}>
          {["Home", "Accounts", "Send Money", "Cards", "FD/RD", "Bills & Recharges", "Loans", "Invest", "Insure"].map((cat, idx) => (
            <TouchableOpacity key={idx} style={[styles.catLinkBtn, idx === 2 && styles.catLinkBtnActive]}>
              <Text style={[styles.catLinkLabel, idx === 2 && styles.catLinkLabelActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Title Area in Banner */}
        <View style={styles.heroTitleArea}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <ArrowLeft size={16} color="#ffffff" />
              <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "700" }}>Back</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.heroTitleText}>{title}</Text>
          {subtitle && <Text style={styles.heroSubText}>{subtitle}</Text>}
        </View>
      </View>

      {/* Main Content Area Overlapping Hero Banner */}
      <View style={styles.overlappingContentWrap}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    width: "100%",
    backgroundColor: "#f4f6fa",
    minHeight: "100vh",
  },
  heroBannerHeader: {
    backgroundColor: "#001a4d",
    paddingTop: 12,
    paddingBottom: 72,
    paddingHorizontal: 24,
    position: "relative",
  },
  topNavRow: {
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.12)",
  },
  searchBarBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 380,
  },
  topNavIconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  topNavIconLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
  },
  avatarPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryNavRow: {
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  catLinkBtn: {
    paddingVertical: 4,
  },
  catLinkBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#ffffff",
  },
  catLinkLabel: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
  catLinkLabelActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  heroTitleArea: {
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
    marginTop: 8,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  heroTitleText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#ffffff",
  },
  heroSubText: {
    fontSize: 13,
    color: "#cbd5e1",
    marginTop: 4,
  },
  overlappingContentWrap: {
    maxWidth: 780,
    width: "100%",
    alignSelf: "center",
    marginTop: -52,
    paddingHorizontal: 16,
    paddingBottom: 48,
    zIndex: 10,
  },
});
