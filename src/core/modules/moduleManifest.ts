/**
 * Module Manifest Specification (P58 / P61 / P63)
 * Enforces typed module manifests, capability slots, and data class boundaries.
 */

export type ModuleId =
  | 'M01' | 'M02' | 'M03' | 'M04' | 'M05'
  | 'M06' | 'M07' | 'M08' | 'M09' | 'M10'
  | 'M11' | 'M12' | 'M13' | 'M14' | 'M15'
  | 'M16' | 'M17' | 'M18' | 'M19' | 'M20'
  | 'M21' | 'M22' | 'M23' | 'M24' | 'M25';

export type DataClass = 'clinical' | 'operational' | 'commercial';

export type Capability = 'ai' | 'agent' | 'seo' | 'realtime';

export interface ModuleConfig {
  /** Unique module identifier (M01-M25) */
  id: ModuleId;
  /** Human readable name of the module */
  name: string;
  /** Primary team/owner responsible for this module */
  owner: string;
  /** Target launch phase (1-8) */
  phase: number;
  /** Data classification tier */
  dataClass: DataClass;
  /** Optional capability slots declared by this module */
  capabilities?: Capability[];
  /** IDs of modules this module depends on directly */
  dependsOn?: ModuleId[];
  /** Public routes exposed by this module */
  routes?: string[];
  /** Domain event topics emitted by this module */
  emits?: string[];
  /** Domain event topics consumed by this module */
  consumes?: string[];
}

/**
 * Validates and defines a module manifest.
 * Enforces P58 & P61 guardrails at compile & run time.
 */
export function defineModule<T extends ModuleConfig>(config: T): Readonly<T> {
  // P61 / Rule L Guardrail: Clinical modules can NEVER declare the SEO capability.
  if (config.dataClass === 'clinical' && config.capabilities?.includes('seo')) {
    throw new Error(
      `[P61 Violation] Module ${config.id} (${config.name}) is classified as 'clinical' ` +
      `and cannot declare the 'seo' capability. Public SEO surfaces are restricted to operational/commercial modules.`
    );
  }

  return Object.freeze(config);
}
