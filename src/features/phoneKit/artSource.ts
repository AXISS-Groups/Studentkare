import type { ComponentProps } from 'react';
import type { Image } from 'react-native';

/** An image source as React Native's <Image> takes it (a bundled module on a phone, a URL on the web). */
export type ArtSource = ComponentProps<typeof Image>['source'];
