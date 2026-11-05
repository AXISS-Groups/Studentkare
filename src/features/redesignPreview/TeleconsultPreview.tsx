import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, font, fontWeight, radius, space } from '@/design-system/theme';

const BARS = [10, 18, 26, 16, 22, 12];

/**
 * Flat, non-functional 1mg-inspired preview of Teleconsult — built from
 * the real design/screens/briefs/Teleconsult.md, its screenshot and HTML
 * source (Tier 1), one of the two real-brief screens Krishna asked for
 * (2026-11-05) after the "incoming call" pattern in the 1mg reference
 * video. The "shared for this consult" scoping note (access ends with the
 * call; nothing else in the vault is visible) is the brief's own content,
 * not invented. Dark full-screen call UI, using the same onHero* tokens
 * the hero panels already use for light-on-dark content. Static only — no
 * live call, no timer, no waveform animation. Not wired, not replacing
 * anything. See NOTES.md.
 */
export function TeleconsultPreview(): React.ReactElement {
  return (
    <View style={styles.screen} testID="preview-teleconsult">
      <View style={styles.topRow}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE · 04:12</Text>
        </View>
        <View style={styles.youTile}>
          <Text style={styles.youText}>You</Text>
        </View>
      </View>

      <View style={styles.center}>
        <View style={styles.avatar}><Text style={styles.avatarText}>AR</Text></View>
        <Text style={styles.docName}>Dr. Ananya Reddy</Text>
        <Text style={styles.docMeta}>MD Internal Medicine · NMC verified</Text>
        <View style={styles.waveRow}>
          {BARS.map((h, i) => <View key={i} style={[styles.waveBar, { height: h }]} />)}
        </View>
      </View>

      <View style={styles.sharedCard}>
        <Text style={styles.sharedEyebrow}>SHARED FOR THIS CONSULT</Text>
        {['Vitamin D Test — 20 Sep 2026', 'Complete Blood Count — 04 Aug 2026'].map((item) => (
          <View key={item} style={styles.sharedRow}>
            <Icon name="check" size={14} color={color.onHeroPositive} />
            <Text style={styles.sharedText}>{item}</Text>
          </View>
        ))}
        <View style={styles.sharedNoteRow}>
          <Icon name="lock-3" size={13} color={color.onHeroLabel} />
          <Text style={styles.sharedNote}>Access ends when the consult ends. Nothing else in your vault is visible.</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <View style={styles.actionBtn}><Icon name="mic-2" size={18} color={color.onHero} /></View>
        <View style={styles.actionBtn}><Icon name="video-3" size={18} color={color.onHero} /></View>
        <View style={styles.endBtn}><Icon name="phone-2" size={18} color={color.onDangerFill} /></View>
        <View style={styles.actionBtn}><Icon name="message-circle-3" size={18} color={color.onHero} /></View>
        <View style={styles.actionBtn}><Icon name="plus" size={18} color={color.onHero} /></View>
      </View>
      <View style={styles.endVisitBtn}><Text style={styles.endVisitText}>End and see the visit note</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.brandNavy, overflow: 'hidden', padding: space.gutterPhone, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: space.s6, height: 28, paddingHorizontal: space.s10, borderRadius: radius.full, backgroundColor: color.dangerFill },
  liveDot: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: color.onDangerFill },
  liveText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.onDangerFill },
  youTile: { width: 72, height: 96, borderRadius: radius.md, backgroundColor: color.onHeroVeil, borderWidth: 1, borderColor: color.onHeroRule, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: space.s6 },
  youText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.onHeroLabel },
  center: { alignItems: 'center', gap: space.s6 },
  avatar: { width: 112, height: 112, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center', marginBottom: space.s8 },
  avatarText: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  docName: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  docMeta: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.regular), color: color.onHeroLabel },
  waveRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.s4, height: 26, marginTop: space.s10 },
  waveBar: { width: 4, borderRadius: radius.sm, backgroundColor: color.onHeroPositive },
  sharedCard: { padding: space.s16, borderRadius: radius.lg, backgroundColor: color.onHeroVeil, borderWidth: 1, borderColor: color.onHeroRule, gap: space.s10 },
  sharedEyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption - 1, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, color: color.onHeroPositive },
  sharedRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  sharedText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.onHero },
  sharedNoteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s6, paddingTop: space.s4 },
  sharedNote: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: font.size.caption * 1.4, fontWeight: fontWeight(font.weight.regular), color: color.onHeroLabel },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.s16 },
  actionBtn: { width: 52, height: 52, borderRadius: radius.full, backgroundColor: color.onHeroVeil, alignItems: 'center', justifyContent: 'center' },
  endBtn: { width: 52, height: 52, borderRadius: radius.full, backgroundColor: color.dangerFill, alignItems: 'center', justifyContent: 'center' },
  endVisitBtn: { height: 50, borderRadius: radius.full, backgroundColor: color.onHeroVeil, borderWidth: 1, borderColor: color.onHeroRule, alignItems: 'center', justifyContent: 'center', marginTop: space.s12 },
  endVisitText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
});
