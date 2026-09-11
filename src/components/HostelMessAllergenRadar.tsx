import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "../theme/theme";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { Utensils } from "lucide-react";
import { assertRule } from "../ai/constitution";

export interface MessMenuItem {
  id: string;
  dishName: string;
  allergens: string[];
  calories: number;
  vegan: boolean;
}

export const HostelMessAllergenRadar: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  assertRule("Rule-A"); // Hostel wellness & environment hygiene rule

  const [activeMeal, setActiveMeal] = useState<"BREAKFAST" | "LUNCH" | "DINNER">("LUNCH");

  const studentAllergies = ["Peanuts", "Gluten"];

  const menuItems: Record<"BREAKFAST" | "LUNCH" | "DINNER", MessMenuItem[]> = {
    BREAKFAST: [
      { id: "m1", dishName: "Poha with Roasted Peanuts", allergens: ["Peanuts"], calories: 280, vegan: true },
      { id: "m2", dishName: "Whole Wheat Bread Toast & Butter", allergens: ["Gluten", "Dairy"], calories: 220, vegan: false },
      { id: "m3", dishName: "Fresh Cut Papaya & Watermelon", allergens: [], calories: 90, vegan: true },
    ],
    LUNCH: [
      { id: "m4", dishName: "Rajma Masala & Steamed Basmati Rice", allergens: [], calories: 420, vegan: true },
      { id: "m5", dishName: "Whole Wheat Tandoori Roti", allergens: ["Gluten"], calories: 120, vegan: true },
      { id: "m6", dishName: "Paneer Butter Masala", allergens: ["Dairy"], calories: 310, vegan: false },
      { id: "m7", dishName: "Mixed Peanut Chutney & Salad", allergens: ["Peanuts"], calories: 85, vegan: true },
    ],
    DINNER: [
      { id: "m8", dishName: "Dal Tadka & Steamed Rice", allergens: [], calories: 360, vegan: true },
      { id: "m9", dishName: "Mixed Veg Sabzi (No Gluten/Dairy)", allergens: [], calories: 180, vegan: true },
      { id: "m10", dishName: "Hostel Special Gulab Jamun", allergens: ["Gluten", "Dairy"], calories: 240, vegan: false },
    ],
  };

  const currentMenu = menuItems[activeMeal];

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Utensils size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: "800", color: tokens.text, fontFamily: typography.fontFamily }}>
            Hostel Mess Allergen Radar & FSSAI Hygiene Scorecard
          </Text>
        </View>
        <Badge label="FSSAI GRADE A+ (94/100)" variant="positive" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 14 }}>
        Daily campus mess menu cross-checked against your profile allergies ({studentAllergies.join(", ")}). Real-time FSSAI Schedule 4 water & food safety compliance.
      </Text>

      {/* Meal Shift Switcher */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        {(["BREAKFAST", "LUNCH", "DINNER"] as const).map((meal) => {
          const active = activeMeal === meal;
          return (
            <TouchableOpacity
              key={meal}
              onPress={() => setActiveMeal(meal)}
              style={{
                backgroundColor: active ? tokens.action : tokens.surface2,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                border: `1px solid ${active ? tokens.action : tokens.rule}`,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "800", color: active ? "#ffffff" : tokens.text }}>
                {meal} MENU
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Menu Dish List with Allergen Warnings */}
      <View style={{ gap: 10 }}>
        {currentMenu.map((item) => {
          const matchedAllergies = item.allergens.filter((a) => studentAllergies.includes(a));
          const hasConflict = matchedAllergies.length > 0;

          return (
            <View
              key={item.id}
              style={{
                backgroundColor: hasConflict ? tokens.emergencyBg : tokens.surface2,
                borderRadius: radius.lg,
                padding: 14,
                border: `1px solid ${hasConflict ? tokens.emergency : tokens.rule}`,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: tokens.text }}>{item.dishName}</Text>
                  <Text style={{ fontSize: 11, color: tokens.text3, fontFamily: typography.fontMono, marginTop: 2 }}>
                    {item.calories} kcal · {item.vegan ? "🌱 Vegan" : "🥛 Contains Dairy"}
                  </Text>
                </View>
                {hasConflict ? (
                  <Badge label={`⚠️ CONTAINS YOUR ALLERGEN (${matchedAllergies.join(", ")})`} variant="emergency" />
                ) : (
                  <Badge label="✓ ALLERGEN SAFE FOR YOU" variant="positive" />
                )}
              </View>

              {item.allergens.length > 0 && (
                <Text style={{ fontSize: 11, color: tokens.text2, fontFamily: typography.fontMono, marginTop: 4 }}>
                  Declared Allergens: {item.allergens.join(", ")}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </Card>
  );
};
