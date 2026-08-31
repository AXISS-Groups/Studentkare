import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme/theme';

export interface BadgeProps {
  label: string;
  variant?: 'primary' | 'positive' | 'attention' | 'emergency' | 'mono' | 'cyan' | 'reward';
  size?: 'sm' | 'md';
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  size = 'md',
  style,
  textStyle,
  icon,
}) => {
  const { tokens, radius, spacing, typography } = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'positive':
        return { bg: tokens.positiveBg, text: tokens.positive, border: tokens.positive };
      case 'attention':
        return { bg: tokens.attentionBg, text: tokens.attention, border: tokens.attention };
      case 'emergency':
        return { bg: tokens.emergencyBg, text: tokens.emergency, border: tokens.emergency };
      case 'cyan':
        return { bg: 'rgba(0, 177, 255, 0.12)', text: tokens.cyan, border: tokens.cyan };
      case 'reward':
        return { bg: tokens.rewardBg, text: tokens.reward, border: tokens.reward };
      case 'mono':
        return { bg: tokens.surface3, text: tokens.data, border: tokens.veil };
      case 'primary':
      default:
        return { bg: tokens.surface3, text: tokens.action, border: tokens.veil };
    }
  };

  const colors = getColors();
  const paddingV = size === 'sm' ? 2 : 4;
  const paddingH = size === 'sm' ? 6 : 10;
  const fontSize = size === 'sm' ? 11 : 12;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          borderRadius: radius.full,
          paddingVertical: paddingV,
          paddingHorizontal: paddingH,
        },
        style,
      ]}
    >
      {icon && <View style={{ marginRight: spacing.s4 }}>{icon}</View>}
      <Text
        style={[
          styles.text,
          {
            color: colors.text,
            fontSize,
            fontFamily: variant === 'mono' ? typography.fontMono : typography.fontFamily,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
