/**
 * Studentkare — Clinical Sign-Off Guard & Verification (G0.5)
 * Asserts that clinical decision artifacts possess a valid medical advisor sign-off.
 *
 * Rules:
 * 1. Unsigned artifacts render a visible "Pending Clinical Sign-Off" banner in non-production environments.
 * 2. Unsigned artifacts throw a fatal error blocking application startup in production (`APP_ENV=production`).
 */

export interface ClinicalArtifactMetadata {
  artifactId: string;
  description: string;
  version?: string;
  signedBy?: string;
  signedDate?: string;
}

export const REGISTERED_CLINICAL_ARTIFACTS: ClinicalArtifactMetadata[] = [
  {
    artifactId: 'RED_FLAG_LIST_V1',
    description: 'Red-flag symptom detection rules',
    // Pending medical advisor sign-off: version and signedBy omitted
  },
  {
    artifactId: 'CAL_TIMERS_V1',
    description: 'Clinical Acuity Level response timers',
  },
  {
    artifactId: 'FIRST_AID_CARDS_V1',
    description: 'Pre-hospital first-aid protocol guidance cards',
  },
  {
    artifactId: 'CRISIS_PHRASES_V1',
    description: 'Multilingual crisis phrase floor table',
  },
  {
    artifactId: 'IMMINENT_RISK_V1',
    description: 'Imminent self-harm risk escalation protocol',
  },
];

export interface ClinicalSignoffVerification {
  isFullySigned: boolean;
  renderBanner: boolean;
  bannerMessage: string;
  pendingArtifacts: string[];
}

export function verifyClinicalSignoff(
  appEnv: string = (import.meta as any)?.env?.VITE_APP_ENV || 'development'
): ClinicalSignoffVerification {
  const pendingArtifacts = REGISTERED_CLINICAL_ARTIFACTS
    .filter((artifact) => !artifact.signedBy || !artifact.version)
    .map((artifact) => artifact.artifactId);

  const isFullySigned = pendingArtifacts.length === 0;
  const isProduction = appEnv === 'production';

  if (!isFullySigned && isProduction) {
    throw new Error(
      `[FATAL CLINICAL SIGNOFF ERROR]: Unsigned clinical artifacts detected in production environment (${pendingArtifacts.join(
        ', '
      )}). Production startup blocked until clinical sign-off is recorded in CLINICAL_SIGNOFF.md.`
    );
  }

  return {
    isFullySigned,
    renderBanner: !isFullySigned && !isProduction,
    bannerMessage: `⚠️ Pending Clinical Sign-Off: ${pendingArtifacts.length} clinical artifacts awaiting medical advisor sign-off.`,
    pendingArtifacts,
  };
}
