import type React from 'react';

/**
 * Native build of the calculator icons. lucide-react draws DOM <svg>, which
 * React Native cannot render, and lucide-react-native is not installed. The
 * icons are decorative (the text carries the meaning), so on a device they
 * render nothing rather than crash the screen. The web build is
 * calculatorIcons.web.ts.
 */
type IconProps = { size?: number; color?: string };
const Decorative = (_props: IconProps): React.ReactElement | null => null;

export const Activity = Decorative;
export const AlertCircle = Decorative;
export const CheckCircle2 = Decorative;
export const Droplets = Decorative;
export const Eye = Decorative;
export const Heart = Decorative;
export const Info = Decorative;
export const Moon = Decorative;
export const Scale = Decorative;
