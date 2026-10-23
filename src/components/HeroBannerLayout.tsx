import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../theme/tokens/theme";
import { color } from "@/design-system/theme";
import { Search, HelpCircle, Bell, Power, ArrowLeft } from "lucide-react";
import { StudentKareLogo } from "./StudentKareLogo";

interface HeroBannerLayoutProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  currentRoute?: string;
  onNavigateRoute?: (route: string) => void;
  children: React.ReactNode;
}

export const HeroBannerLayout: React.FC<HeroBannerLayoutProps> = ({
  title = "Student Health Portal",
  subtitle = "Your health records and campus care in one place",
  onBack,
  currentRoute = "dashboard",
  onNavigateRoute,
  children,
}) => {
  const { typography } = useTheme();

  const navCategories = [
    { label: "Home", route: "dashboard" },
    { label: "Health Vault", route: "vault" },
    { label: "Book Care", route: "flow-07" },
    { label: "NMC Doctor", route: "flow-08" },
    { label: "Profile & Consent", route: "flow-04" },
    { label: "Claims & Insurance", route: "claims-m23" },
    { label: "108 SOS", route: "flow-06" },
    { label: "Campus Radar", route: "flow-11" },
    { label: "Super Admin", route: "super-admin" },
    { label: "✨ Hero Banner", route: "hdfc-hero" },
  ];

  return (
    <View style={styles.outerContainer}>
      {/* Top HDFC-Style Dark Navy Hero Banner Header */}
      <View style={styles.heroBannerHeader}>
        {/* SVG Radial Wave Pattern Overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.14,
            backgroundImage: `radial-gradient(circle at 25px 25px, ${color.onHero} 2%, transparent 0%), radial-gradient(circle at 75px 75px, ${color.onHero} 2%, transparent 0%)`,
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
            <Search size={15} color={color.text2} />
            <input
              type="text"
              placeholder="Search Download Statement, Lab Reports, Book OPD etc"
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: color.text,
                fontSize: 13,
                fontFamily: typography.fontFamily,
                width: "100%",
              }}
            />
          </View>

          {/* Top Right Quick Icons */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
            <TouchableOpacity style={styles.topNavIconBtn}>
              <HelpCircle size={17} color={color.onHero2} />
              <Text style={styles.topNavIconLabel}>Services & Support</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.topNavIconBtn}>
              <Bell size={17} color={color.onHero2} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.topNavIconBtn}>
              <Power size={17} color={color.onHero2} />
            </TouchableOpacity>

            {/* Profile Avatar Pill */}
            <View style={styles.avatarPill}>
              <Text style={{ color: color.action, fontWeight: "800", fontSize: 12, fontFamily: typography.fontMono }}>AS</Text>
            </View>
          </View>
        </View>

        {/* Secondary Category Navigation Links */}
        <View style={styles.categoryNavRow}>
          {navCategories.map((cat, idx) => {
            const active = currentRoute === cat.route;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => onNavigateRoute && onNavigateRoute(cat.route)}
                style={[styles.catLinkBtn, active && styles.catLinkBtnActive]}
              >
                <Text style={[styles.catLinkLabel, active && styles.catLinkLabelActive]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Title Area in Banner */}
        <View style={styles.heroTitleArea}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <ArrowLeft size={16} color={color.onHero} />
              <Text style={{ color: color.onHero, fontSize: 13, fontWeight: "700" }}>Back</Text>
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
    backgroundColor: color.canvas,
    minHeight: "100vh",
  },
  heroBannerHeader: {
    backgroundColor: color.heroBg,
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
    backgroundColor: color.surface,
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
    color: color.onHero2,
    fontSize: 12,
    fontWeight: "600",
  },
  avatarPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryNavRow: {
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingTop: 12,
    paddingBottom: 16,
    overflowX: "auto" as any,
  },
  catLinkBtn: {
    paddingVertical: 4,
  },
  catLinkBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: color.heroCurrent,
  },
  catLinkLabel: {
    color: color.onHero2,
    fontSize: 13,
    fontWeight: "600",
  },
  catLinkLabelActive: {
    color: color.onHero,
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
    color: color.onHero,
  },
  heroSubText: {
    fontSize: 13,
    color: color.onHero2,
    marginTop: 4,
  },
  overlappingContentWrap: {
    maxWidth: 960,
    width: "100%",
    alignSelf: "center",
    marginTop: -52,
    paddingHorizontal: 16,
    paddingBottom: 48,
    zIndex: 10,
  },
});
