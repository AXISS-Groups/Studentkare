// Expo app config: the static settings live in app.json; this file adds the
// values that are computed or come from the build environment.
//
// One place for the version: package.json "version" (MAJOR.MINOR.PATCH) is the
// store version, and the iOS buildNumber / Android versionCode are derived from
// it (MAJOR*10000 + MINOR*100 + PATCH). Bump package.json for every store upload.
//
// Nothing secret is committed. The EAS project, owner and Sentry upload target
// come from the environment (EAS secrets / CI), and are simply left out when unset.
import type { ConfigContext, ExpoConfig } from 'expo/config';
import pkg from './package.json';

const VERSION_PART_LIMIT = 100;
const MINOR_FACTOR = VERSION_PART_LIMIT;
const MAJOR_FACTOR = VERSION_PART_LIMIT * VERSION_PART_LIMIT;

/** The public web domain the app opens links from (universal links / Android App Links). */
const LINK_HOSTS = ['studentkare.co', 'www.studentkare.co'];

/**
 * Web paths the app opens; keep in step with src/native/linking.ts and the
 * templates in deploy/well-known/. `/claim` is left to the web until the phone
 * can redeem an invite (studentkare://claim still opens Sign in).
 */
const LINK_PATH_PREFIXES = ['/login', '/orders', '/consult', '/medicine-info', '/find-care'];

export function nativeBuildNumber(version: string): number {
  const parts = version.split('.').map((part) => Number.parseInt(part, 10));
  const [major, minor, patch] = parts;
  const valid = parts.length === 3 && parts.every((part) => Number.isInteger(part) && part >= 0 && part < VERSION_PART_LIMIT);
  if (!valid || major === undefined || minor === undefined || patch === undefined) {
    throw new Error(`package.json version "${version}" must be MAJOR.MINOR.PATCH with each part below ${VERSION_PART_LIMIT}`);
  }
  return major * MAJOR_FACTOR + minor * MINOR_FACTOR + patch;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const version = pkg.version;
  const build = nativeBuildNumber(version);
  const projectId = optionalEnv('EAS_PROJECT_ID');
  const owner = optionalEnv('EXPO_OWNER');
  const sentryOrg = optionalEnv('SENTRY_ORG');
  const sentryProject = optionalEnv('SENTRY_PROJECT');

  // Source-map upload runs only when a Sentry org/project is configured for the
  // build (with SENTRY_AUTH_TOKEN as an EAS secret). The SDK itself is always
  // linked; it stays off at runtime unless EXPO_PUBLIC_SENTRY_DSN is set.
  const sentryPlugin: [string, Record<string, string>][] = sentryOrg && sentryProject
    ? [['@sentry/react-native/expo', { organization: sentryOrg, project: sentryProject, url: optionalEnv('SENTRY_URL') ?? 'https://sentry.io/' }]]
    : [];

  return {
    ...config,
    name: config.name ?? 'Studentkare',
    slug: config.slug ?? 'studentkare',
    ...(owner ? { owner } : {}),
    version,
    runtimeVersion: { policy: 'appVersion' },
    ios: {
      ...config.ios,
      buildNumber: String(build),
      associatedDomains: LINK_HOSTS.map((host) => `applinks:${host}`),
    },
    android: {
      ...config.android,
      versionCode: build,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          category: ['BROWSABLE', 'DEFAULT'],
          data: LINK_HOSTS.flatMap((host) => LINK_PATH_PREFIXES.map((pathPrefix) => ({ scheme: 'https', host, pathPrefix }))),
        },
      ],
    },
    plugins: [...(config.plugins ?? []), ...sentryPlugin],
    extra: {
      ...config.extra,
      ...(projectId ? { eas: { projectId } } : {}),
    },
  };
};
