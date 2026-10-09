import type { ComponentProps } from 'react';
import type { Image } from 'react-native';

type ImageSource = ComponentProps<typeof Image>['source'];

/**
 * Bundled illustrations for the native landing views. A relative URI such as
 * '/assets/x.png' only resolves in a browser; on a device it loads nothing.
 * Metro bundles these through require().
 */
export const labTestsIllustration = require('../../../../public/assets/aa86cceef7f47ddd0066a108e627ed0b.png') as ImageSource;
export const consultIllustration = require('../../../../public/assets/46011255169a19dbc1060f1bd00e5fd4.png') as ImageSource;
