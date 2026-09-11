// The authenticated URL-based application is the single routing entry point.
// Legacy flow screens are no longer mounted through a second preview navigator.
export { default as AppNavigator } from '../App';
export type { RoutePath as ScreenRoute } from '../lib/workflowRouting';
