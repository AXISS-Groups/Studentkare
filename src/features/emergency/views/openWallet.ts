import { Linking, Platform } from 'react-native';
import { apiBaseUrl } from '@/core/env';
import { WALLET_PLATFORMS } from '../viewmodel/WalletPassViewModel';
import type { WalletPlatform } from '../viewmodel/WalletPassViewModel';

/** Wallets this device can hold: an iPhone has Apple Wallet, an Android phone Google Wallet; the web offers both. */
export const deviceWallets: readonly WalletPlatform[] =
  Platform.OS === 'ios' ? ['APPLE'] : Platform.OS === 'android' ? ['GOOGLE'] : WALLET_PLATFORMS;

/**
 * Hands the pass to the wallet. Apple: the single-use .pkpass link (Safari or the app's
 * browser shows Apple's "Add pass" sheet). Google: the save link, which opens Google
 * Wallet. Neither URL carries a health value. On the web the page itself goes to the
 * link (a new window opened after a network call is blocked as a pop-up).
 */
export async function openWalletUrl(platform: WalletPlatform, url: string): Promise<void> {
  const target = platform === 'APPLE' ? `${apiBaseUrl()}${url}` : url;
  const page = (globalThis as { location?: { assign: (href: string) => void } }).location;
  if (Platform.OS === 'web' && page) {
    page.assign(target);
    return;
  }
  await Linking.openURL(target);
}
