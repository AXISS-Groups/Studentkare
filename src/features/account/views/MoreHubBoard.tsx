import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandLogo, Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { Button, Note, Sheet } from '@/design-system';
import { BoardRow, BoardSection, IconTile, TextLink, boardText } from '@/design-system/board/BoardKit';
import type { BoardTone } from '@/design-system/board/BoardKit';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { useApiResource } from '@/hooks/api/useApiResource';
import type { AccountRole, LiveOrder } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

/** The account's own name and standing, from the session. */
export interface MoreAccount {
  fullName: string;
  university: string;
  role: AccountRole;
  isVerifiedStudent: boolean;
}

/** A destination on the board; omitted where the platform has no such screen (the row is then not drawn). */
type MoreDestination =
  | 'account' | 'records' | 'orders' | 'requests' | 'notifications' | 'pass' | 'verify' | 'campus' | 'profile'
  | 'permissions' | 'ayush' | 'crisis' | 'plan' | 'help' | 'joinClinician' | 'joinPartner' | 'website';

export interface MoreHubLinks {
  open: Partial<Record<MoreDestination, () => void>>;
  /** Another console this account holds a role in. */
  workspace?: (role: AccountRole) => void;
  /** Web: opens the app's log-out dialog. */
  askSignOut?: () => void;
  /** Expo: the board confirms itself, then signs out. */
  signOut?: () => Promise<void>;
  signingOut?: boolean;
}

interface Row { key: MoreDestination; icon: SkIconName; tone: BoardTone; title: MessageKey; meta: MessageKey }

const ROWS: readonly Row[] = [
  { key: 'requests', icon: 'message-square', tone: 'action', title: 'pb.more.requests', meta: 'pb.more.requestsMeta' },
  { key: 'notifications', icon: 'bell-2', tone: 'attention', title: 'pb.more.notifications', meta: 'pb.more.notificationsMeta' },
  { key: 'pass', icon: 'qr-code-2', tone: 'action', title: 'pb.more.pass', meta: 'pb.more.passMeta' },
  { key: 'verify', icon: 'shield-check-3', tone: 'positive', title: 'pb.more.verify', meta: 'pb.more.verifyMeta' },
  { key: 'campus', icon: 'house-outline', tone: 'action', title: 'pb.more.campus', meta: 'pb.more.campusMeta' },
  { key: 'profile', icon: 'map-pin', tone: 'danger', title: 'pb.more.profile', meta: 'pb.more.profileMeta' },
  { key: 'permissions', icon: 'shield-2', tone: 'positive', title: 'pb.more.permissions', meta: 'pb.more.permissionsMeta' },
  { key: 'ayush', icon: 'sparkle', tone: 'action', title: 'pb.more.ayush', meta: 'pb.more.ayushMeta' },
  { key: 'crisis', icon: 'phone-2', tone: 'attention', title: 'pb.more.crisis', meta: 'pb.more.crisisMeta' },
  { key: 'plan', icon: 'briefcase', tone: 'action', title: 'pb.more.plan', meta: 'pb.more.planMeta' },
  { key: 'help', icon: 'question-mark', tone: 'neutral', title: 'pb.more.help', meta: 'pb.more.helpMeta' },
];

/** The consoles an account can switch to: only the ones it holds a role in. A student holds none. */
const WORKSPACES: readonly { role: AccountRole; icon: SkIconName; label: MessageKey }[] = [
  { role: 'NMC_DOCTOR', icon: 'doctor-2', label: 'pb.more.ws.clinician' },
  { role: 'CAMPUS_ADMIN', icon: 'house-outline', label: 'pb.more.ws.campus' },
  { role: 'VENDOR', icon: 'shopping-bag', label: 'pb.more.ws.vendor' },
  { role: 'SUPER_ADMIN', icon: 'shield-2', label: 'pb.more.ws.admin' },
];

const IN_TRANSIT = new Set(['ACCEPTED', 'DISPATCHED']);

type PressState = { pressed: boolean; focused?: boolean };

/**
 * More / account (canvas page 2, MoreHub, Tier 2): who is signed in, the vault
 * and orders, the account rows and log out. In the web phone frame it is the
 * More panel under the header; in Expo it is its own screen. Counts come from
 * the student's own data and are left out if they did not load.
 */
export function MoreHubBoard({ account, links, testID = 'more-hub' }: { account: MoreAccount; links: MoreHubLinks; testID?: string }): React.ReactElement {
  const t = useT();
  const profile = useApiResource<{ hostelBlock?: string }>('/profile');
  const docs = useApiResource<{ items: unknown[]; total?: number }>('/health/documents?limit=1');
  const orders = useApiResource<{ items: LiveOrder[] }>('/orders?limit=20');
  const [confirming, setConfirming] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  const place = [account.university, profile.data?.hostelBlock].filter(Boolean).join(' • ');
  const docTotal = docs.data ? docs.data.total ?? docs.data.items.length : null;
  const inTransit = orders.data ? orders.data.items.filter((o) => o.lines.some((l) => IN_TRANSIT.has(l.status))).length : null;
  const workspaces = WORKSPACES.filter((w) => w.role === account.role);
  const rows = ROWS.filter((row) => links.open[row.key]);
  const askSignOut = () => {
    if (links.askSignOut) links.askSignOut();
    else if (links.signOut) setConfirming(true);
  };
  const signOut = () => {
    setSignOutError(false);
    links.signOut?.().then(() => setConfirming(false), () => setSignOutError(true));
  };

  return (
    <View style={styles.board} testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('pb.more.openAccount', { name: account.fullName })}
        disabled={!links.open.account}
        onPress={links.open.account}
        style={({ focused }: PressState) => [styles.who, focused ? focusRing : null]}
        testID="more-hub-account"
      >
        <BrandLogo size={size.touchTarget + space.s12} label="" />
        <View style={styles.whoWords}>
          <Text style={styles.name}>{account.fullName}</Text>
          {place ? <Text style={styles.place}>{place}</Text> : null}
        </View>
        {account.role === 'STUDENT' ? (
          <View style={styles.eduChip}>
            <View style={[styles.eduDot, { backgroundColor: account.isVerifiedStudent ? color.onHeroPositive : color.onHeroAttention }]} />
            <Text style={styles.eduText}>{account.isVerifiedStudent ? t('pb.more.eduId') : t('pb.more.eduPending')}</Text>
          </View>
        ) : null}
      </Pressable>

      <View style={styles.tiles}>
        {links.open.records ? (
          <Tile icon="lock-5" tone="action" title={t('pb.more.vault')} meta={docTotal === null ? '' : t('pb.yc.documentsN', { count: docTotal })} onPress={links.open.records} />
        ) : null}
        {links.open.orders ? (
          <Tile icon="shopping-bag" tone="positive" title={t('pb.more.orders')} meta={inTransit === null ? '' : inTransit ? t('pb.more.inTransit', { count: inTransit }) : t('pb.more.noneInTransit')} onPress={links.open.orders} />
        ) : null}
      </View>

      {workspaces.length && links.workspace ? (
        <BoardSection label={t('pb.more.switch')}>
          <View style={styles.tiles}>
            {workspaces.map((w) => (
              <Pressable key={w.role} accessibilityRole="button" accessibilityLabel={t(w.label)} onPress={() => links.workspace?.(w.role)}
                style={({ focused }: PressState) => [styles.wsTile, focused ? focusRing : null]}>
                <Icon name={w.icon} size={size.navIcon} color={color.action} />
                <Text style={boardText.meta}>{t(w.label)}</Text>
              </Pressable>
            ))}
          </View>
        </BoardSection>
      ) : null}
      {links.open.joinClinician || links.open.joinPartner ? (
        <View style={styles.join}>
          <Text style={boardText.meta}>{t('pb.more.rolesNote')}</Text>
          <View style={styles.joinLinks}>
            {links.open.joinClinician ? <TextLink label={t('pb.more.joinClinician')} onPress={links.open.joinClinician} /> : null}
            {links.open.joinPartner ? <TextLink label={t('pb.more.joinPartner')} onPress={links.open.joinPartner} /> : null}
          </View>
        </View>
      ) : null}

      <BoardSection label={t('pb.more.account')}>
        <View style={styles.group}>
          {rows.map((row, i) => (
            <BoardRow
              key={row.key}
              testID={`more-hub-${row.key}`}
              grouped
              divider={i < rows.length - 1}
              icon={row.icon}
              tone={row.tone}
              title={t(row.title)}
              meta={row.key === 'verify' ? (account.isVerifiedStudent ? t('pb.more.verified') : t(row.meta)) : row.key === 'campus' && place ? place : t(row.meta)}
              onPress={links.open[row.key]}
              trailing={<Icon name="chevron-right" size={size.navIcon - space.s2} color={color.text3} />}
            />
          ))}
        </View>
      </BoardSection>

      <Pressable
        testID="more-hub-logout"
        accessibilityRole="button"
        accessibilityLabel={links.signingOut ? t('shell.loggingOut') : t('shell.logout')}
        disabled={links.signingOut}
        onPress={askSignOut}
        style={({ focused }: PressState) => [styles.logout, focused ? focusRing : null]}
      >
        <Icon name={links.signingOut ? 'circle' : 'log-out-2'} size={size.navIcon} color={color.danger} />
        <Text style={styles.logoutText}>{links.signingOut ? t('shell.loggingOut') : t('shell.logout')}</Text>
      </Pressable>
      {links.open.website ? <TextLink label={t('pb.more.website')} onPress={links.open.website} /> : null}

      {links.signOut ? (
        <Sheet visible={confirming} title={t('shell.logoutTitle')} onClose={() => setConfirming(false)} busy={links.signingOut}>
          <View style={styles.confirm}>
            <View style={styles.badge}><Icon name="shield-3" size={size.navIcon + space.s8} color={color.attention} /></View>
            <Text style={boardText.body}>{t('ws.signOutBody')}</Text>
            {signOutError ? <Note tone="danger">{t('pb.more.signOutFailed')}</Note> : null}
            <View style={styles.confirmActions}>
              <View style={styles.flex}><Button label={t('common.cancel')} variant="secondary" fullWidth onPress={() => setConfirming(false)} /></View>
              <View style={styles.flex}><Button label={t('shell.logout')} fullWidth busy={links.signingOut} onPress={signOut} /></View>
            </View>
          </View>
        </Sheet>
      ) : null}
    </View>
  );
}

function Tile({ icon, tone, title, meta, onPress }: { icon: SkIconName; tone: BoardTone; title: string; meta: string; onPress: () => void }): React.ReactElement {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={[title, meta].filter(Boolean).join(', ')} onPress={onPress}
      style={({ focused }: PressState) => [styles.tile, focused ? focusRing : null]}>
      <View style={styles.tileIcon}><IconTile icon={icon} tone={tone} /></View>
      <Text style={boardText.strong}>{title}</Text>
      {meta ? <Text style={boardText.meta}>{meta}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  board: { gap: space.s20, paddingBottom: space.s24 },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.s14, backgroundColor: color.heroBg, borderRadius: radius.sheet, padding: space.s20, minHeight: size.touchTarget },
  whoWords: { flex: 1, minWidth: 0, gap: space.s2 },
  name: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  place: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.onHero2 },
  eduChip: { flexDirection: 'row', alignItems: 'center', gap: space.s6, borderRadius: radius.full, paddingHorizontal: space.s10, paddingVertical: space.s4, backgroundColor: color.onHeroVeil },
  eduDot: { width: space.s6, height: space.s6, borderRadius: radius.full },
  eduText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s12 },
  tile: { flexGrow: 1, flexBasis: '40%', gap: space.s4, backgroundColor: color.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: color.ruleSoft, padding: space.s16, minHeight: size.touchTarget },
  tileIcon: { marginBottom: space.s8 },
  wsTile: { flexGrow: 1, flexBasis: '20%', alignItems: 'center', justifyContent: 'center', gap: space.s6, minHeight: size.touchTarget + space.s24, backgroundColor: color.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: color.ruleSoft },
  join: { gap: space.s4 },
  joinLinks: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.s12 },
  group: { backgroundColor: color.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: color.ruleSoft, overflow: 'hidden' },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s8, minHeight: size.controlLg, borderRadius: radius.full, borderWidth: 1, borderColor: color.dangerRule, backgroundColor: color.surface },
  logoutText: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.danger },
  confirm: { gap: space.s14 },
  badge: { width: size.touchTarget + space.s12, height: size.touchTarget + space.s12, borderRadius: radius.full, backgroundColor: color.attentionBg, alignItems: 'center', justifyContent: 'center' },
  confirmActions: { flexDirection: 'row', gap: space.s10 },
  flex: { flex: 1 },
});
