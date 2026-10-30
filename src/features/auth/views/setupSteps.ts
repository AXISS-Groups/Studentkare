/**
 * The setup that follows sign-up, in order: care profile, the two optional
 * questions, then the permission choices. The progress on ProfileSetup and
 * Permissions counts these, at their real positions (the canvas numbers its
 * own different six-step flow, "3 of 6" and "6 of 6").
 */
const SETUP_STEPS = ['profile-setup', 'setup/goal', 'setup/activity', 'permissions'] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

export function setupPosition(step: SetupStep): { position: number; total: number } {
  return { position: SETUP_STEPS.indexOf(step) + 1, total: SETUP_STEPS.length };
}
