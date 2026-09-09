import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/theme';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'surface' | 'recessed' | 'dark' | 'outline' | 'alert';
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'region' | 'article';
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  variant = 'surface',
  style,
  accessibilityLabel,
  accessibilityRole,
}) => {
  const { tokens, radius, shadows, isDark } = useTheme();

  const getBg = () => {
    switch (variant) {
      case 'surface':
        return tokens.surface;
      case 'recessed':
        return tokens.surface2;
      case 'dark':
        return isDark ? tokens.surface : tokens.ink;
      case 'outline':
        return 'transparent';
      case 'alert':
        return tokens.emergencyBg;
      default:
        return tokens.surface;
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case 'outline':
        return tokens.rule;
      case 'alert':
        return tokens.emergency;
      default:
        return tokens.ruleSoft;
    }
  };

  const content = (
    <View
      dataSet={{ ui: 'card', variant }}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={onPress ? undefined : accessibilityRole || 'region'}
      style={[
        styles.card,
        {
          backgroundColor: getBg(),
          borderColor: getBorderColor(),
          borderRadius: radius.r2xl,
          padding: 18,
          borderWidth: 1,
        },
        variant === 'surface' ? shadows.sm : null,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        dataSet={{ ui: 'interactive-card' }}
        activeOpacity={0.88}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole || 'button'}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});
