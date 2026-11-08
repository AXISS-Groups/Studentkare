# Expo SDK 52 tooling compatibility

The documented React 18 / React Native 0.76 stack uses Expo SDK 52. Scoped npm overrides keep its archive, XML and Metro CSS tools on patched versions without upgrading the native SDK.

`@expo+cli+0.22.28.patch` adapts two CommonJS imports to tar 7's named-export object. Expo's original default-import helper treats tar's `__esModule` marker as evidence of a default export, but tar 7 has none. The patch preserves Expo's existing extraction calls and options. `patch-package --error-on-fail` applies it during installation and fails if the patch cannot apply. Review or remove it when upgrading the CLI.

Verification covers a clean install, Expo's Windows JavaScript archive-extraction path, a plist roundtrip, resolved app configuration and Android/iOS Hermes exports. These checks do not certify all native build or runtime flows. The dependency audit remains a report; remaining findings require separate review before release.
