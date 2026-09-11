import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "../theme/theme";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { Compass, User, Stethoscope, Building2, FileCheck, ShieldAlert, ArrowRight } from "lucide-react";
import { assertRule } from "../ai/constitution";

export interface PersonaGuide {
  id: "STUDENT" | "CLINICIAN" | "INSTITUTION" | "CLAIMS" | "SUPER_ADMIN";
  title: string;
  targetRoute: string;
  icon: any;
  primaryGoals: string[];
  keyRulesEnforced: string[];
  badgeText: string;
}

interface UserRoleTourGuideProps {
  onNavigateRoute: (route: string) => void;
}

export const UserRoleTourGuide: React.FC<UserRoleTourGuideProps> = ({ onNavigateRoute }) => {
  const { tokens, radius, typography } = useTheme();
  assertRule("Rule-A");
  assertRule("Rule-J1");
  assertRule("Rule-K1");

  const [activePersona, setActivePersona] = useState<PersonaGuide["id"]>("STUDENT");

  const personas: PersonaGuide[] = [
    {
      id: "STUDENT",
      title: "Student Data Principal",
      targetRoute: "vault",
      icon: User,
      badgeText: "STUDENT CARE PLANE",
      primaryGoals: [
        "Store health vault records with end-to-end encryption",
        "1-tap 108 lockscreen emergency SOS with blood group dispatch",
        "Granular DPDP Act 2023 consent management & ABDM FHIR export",
      ],
      keyRulesEnforced: ["Rule-A (No Prescriptive AI)", "Rule-C (Zero Training)", "Rule-D (ABDM Consent)"],
    },
    {
      id: "CLINICIAN",
      title: "Campus OPD Doctor",
      targetRoute: "flow-08",
      icon: Stethoscope,
      badgeText: "CLINICAL PRACTICE PLANE",
      primaryGoals: [
        "AI-assisted clinical consultation scribe & voice triage",
        "NMC digital signature & CDSCO drug interaction checks",
        "Jan Aushadhi generic alternative recommendation engine",
      ],
      keyRulesEnforced: ["Rule-A (Symptom Triage Only)", "Rule-J1 (Provider SLA)", "NMC Code of Ethics 2023"],
    },
    {
      id: "INSTITUTION",
      title: "Hostel & Campus Admin",
      targetRoute: "flow-11",
      icon: Building2,
      badgeText: "INSTITUTIONAL GOVERNANCE",
      primaryGoals: [
        "Hostel syndromic epidemic outbreak radar (R0 estimates)",
        "FSSAI Schedule 4 mess hygiene scorecard & water testing",
        "Anonymized campus mental health stress index (k≥20 floor)",
      ],
      keyRulesEnforced: ["Rule-K-Anonymity (k≥20 Floor)", "Rule-F (Hostel Hygiene)", "Rule-L6 (Zero Student Cost)"],
    },
    {
      id: "CLAIMS",
      title: "Insurance Adjudicator",
      targetRoute: "m23",
      icon: FileCheck,
      badgeText: "OPERATIONAL CLAIMS PLANE",
      primaryGoals: [
        "Drools automated insurance claim pre-authorization engine",
        "Bounding-box document provenance & Rule-K5 NME deduction",
        "NHCX / ABDM FHIR ClaimResponse gateway integration",
      ],
      keyRulesEnforced: ["Rule-K1 (Role Isolation)", "Rule-K2 (Human Adjudicator)", "Rule-K4 (Bounding Box)"],
    },
    {
      id: "SUPER_ADMIN",
      title: "Super Admin & AI Ops",
      targetRoute: "super-admin",
      icon: ShieldAlert,
      badgeText: "CONTROL PLANE & DEPARTMENTS D1-D9",
      primaryGoals: [
        "2-plane separation guardrails (Clinical vs Operational)",
        "AI Operations Departments D1-D9 & global kill switches",
        "Merkle-tree forensic audit verifier & Break-Glass log",
      ],
      keyRulesEnforced: ["Rule-K1 (Schema Isolation)", "Rule-B (Crisis Bypass)", "DPDP Act Sec 11"],
    },
  ];

  const current = personas.find((p) => p.id === activePersona) || personas[0];
  const IconComponent = current.icon;

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Compass size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: "800", color: tokens.text, fontFamily: typography.fontFamily }}>
            User Perspective Audit & Interactive Persona Tour
          </Text>
        </View>
        <Badge label="5 USER PERSONAS AUDITED" variant="positive" />
      </View>

      {/* Persona Tabs */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {personas.map((p) => {
          const active = activePersona === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => setActivePersona(p.id)}
              style={{
                backgroundColor: active ? tokens.action : tokens.surface2,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
                border: `1px solid ${active ? tokens.action : tokens.rule}`,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "800", color: active ? "#ffffff" : tokens.text }}>
                {p.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Active Persona Box */}
      <View style={{ backgroundColor: tokens.surface2, borderRadius: radius.lg, padding: 16, border: `1px solid ${tokens.rule}`, marginBottom: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <IconComponent size={20} color={tokens.action} />
            <Text style={{ fontSize: 15, fontWeight: "800", color: tokens.text }}>{current.title}</Text>
          </View>
          <Badge label={current.badgeText} variant="mono" />
        </View>

        <Text style={{ fontSize: 12, fontWeight: "700", color: tokens.text2, marginBottom: 6 }}>Key User Journey Capabilities:</Text>
        {current.primaryGoals.map((goal, idx) => (
          <Text key={idx} style={{ fontSize: 12, color: tokens.text, marginBottom: 4 }}>
            • {goal}
          </Text>
        ))}

        <Text style={{ fontSize: 11, fontWeight: "700", color: tokens.text3, marginTop: 8, fontFamily: typography.fontMono }}>
          Enforced Rules: {current.keyRulesEnforced.join(" · ")}
        </Text>
      </View>

      {/* Switch Screen CTA */}
      <TouchableOpacity
        onPress={() => onNavigateRoute(current.targetRoute)}
        style={{
          backgroundColor: tokens.action,
          padding: 12,
          borderRadius: 12,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 13, fontFamily: typography.fontFamily }}>
          Launch {current.title} Screen & Experience Persona Flow
        </Text>
        <ArrowRight size={16} color="#ffffff" />
      </TouchableOpacity>
    </Card>
  );
};
