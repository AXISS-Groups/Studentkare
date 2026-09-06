import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/theme';
import { useAppStore } from '../data/store';
import { StudentKareLogo } from './StudentKareLogo';
import { ShieldAlert, Bot, Sparkles } from 'lucide-react';
import { LanguageCode } from '../types';

interface HeaderProps {
  onOpenAI: () => void;
  onOpenEmergency: () => void;
  onSelectFlow?: (flowId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAI, onOpenEmergency, onSelectFlow }) => {
  const { tokens, radius, typography } = useTheme();
  const { student, language, setLanguage, emergencyActive } = useAppStore();

  const languages: LanguageCode[] = ['EN', 'HI', 'TE'];

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: tokens.surface,
          borderBottomColor: tokens.ruleSoft,
        },
      ]}
    >
      {/* Brand: StudentKare */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onSelectFlow && onSelectFlow('landing')}
        accessibilityLabel="StudentKare Home"
        accessibilityRole="button"
        style={styles.brandRow}
      >
        <StudentKareLogo size={30} showStrapline={true} straplineText="CAMPUS TELEMETRY v0.5" />
      </TouchableOpacity>

      {/* Center / Quick actions */}
      <View style={styles.actionsRow}>
        {/* Language Switch */}
        <View style={[styles.langSwitch, { backgroundColor: tokens.surface2, borderColor: tokens.rule }]}>
          {languages.map((lang) => {
            const active = language === lang;
            const langName = lang === 'EN' ? 'English' : lang === 'HI' ? 'Hindi' : 'Telugu';
            return (
              <TouchableOpacity
                key={lang}
                onPress={() => setLanguage(lang)}
                accessibilityLabel={`Switch language to ${langName}`}
                accessibilityRole="button"
                style={[
                  styles.langBtn,
                  active && {
                    backgroundColor: tokens.action,
                    borderRadius: radius.xs,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.langText,
                    {
                      color: active ? '#ffffff' : tokens.text2,
                      fontFamily: typography.fontMono,
                    },
                  ]}
                >
                  {lang === 'EN' ? 'EN' : lang === 'HI' ? 'हिंदी' : 'తెలుగు'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* AI Copilot Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onOpenAI}
          accessibilityLabel="Open Care AI Copilot"
          accessibilityRole="button"
          style={[
            styles.aiBtn,
            {
              backgroundColor: tokens.surface3,
              borderColor: tokens.action,
            },
          ]}
        >
          <Bot size={15} color={tokens.action} />
          <Text style={[styles.aiBtnText, { color: tokens.action }]}>Care AI</Text>
          <Sparkles size={11} color={tokens.cyan} />
        </TouchableOpacity>

        {/* Emergency SOS Trigger */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onOpenEmergency}
          accessibilityLabel="Trigger 108 Emergency SOS Card"
          accessibilityRole="button"
          style={[
            styles.emergencyBtn,
            {
              backgroundColor: emergencyActive ? tokens.emergency : tokens.emergencyBg,
              borderColor: tokens.emergency,
            },
          ]}
        >
          <ShieldAlert size={15} color={emergencyActive ? '#ffffff' : tokens.emergency} />
          <Text
            style={[
              styles.emergencyBtnText,
              { color: emergencyActive ? '#ffffff' : tokens.emergency },
            ]}
          >
            {emergencyActive ? 'SOS ACTIVE' : '108 SOS'}
          </Text>
        </TouchableOpacity>

        {/* User Badge */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onSelectFlow && onSelectFlow('flow-04')}
          accessibilityLabel={`Open profile settings for ${student.fullName}`}
          accessibilityRole="button"
          style={[styles.userChip, { backgroundColor: tokens.surface2, borderColor: tokens.rule }]}
        >
          <View style={[styles.avatar, { backgroundColor: tokens.action }]}>
            <Text style={styles.avatarText}>{student.fullName.charAt(0)}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: tokens.text }]}>{student.fullName.split(' ')[0]}</Text>
            <Text style={[styles.userPoints, { color: tokens.reward, fontFamily: typography.fontMono }]}>
              {student.pointsBalance} pts
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    minHeight: 60,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    borderBottomWidth: 1,
    zIndex: 50,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  impiloPillLogo: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
    boxShadow: '0 2px 8px rgba(22, 22, 92, 0.15)',
  },
  pillLogoInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillLogoText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  langSwitch: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  langBtn: {
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  langText: {
    fontSize: 11,
    fontWeight: '600',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  aiBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  emergencyBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  userInfo: {
    flexDirection: 'column',
  },
  userName: {
    fontSize: 12,
    fontWeight: '700',
  },
  userPoints: {
    fontSize: 10,
    fontWeight: '600',
  },
});
