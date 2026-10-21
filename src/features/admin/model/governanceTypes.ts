/**
 * Response shapes for the super admin governance, safety and money boards (WP-17).
 * Each one mirrors what its endpoint returns today; nothing here is filled in on
 * the client.
 */

/** One delivery attempt of an SOS (who was told, on which channel, whether it went). */
export interface SosDelivery { recipientKind?: string; channel?: string; status: string }

/**
 * GET /ops/sos?open=false, as this board reads it. The endpoint also returns the
 * student's name, contact, hostel, location note, coordinates and the closing note;
 * this board never reads them (it shows that an alert exists, where and who answered,
 * never the student or their condition), so they are not typed here.
 */
export interface SosAlertRow {
  id: string;
  status: string;
  campus: string;
  createdAt: number;
  acknowledgedAt: number | null;
  resolvedAt: number | null;
  cancelledAt: number | null;
  deliveries: SosDelivery[];
}
export interface SosList { items: SosAlertRow[] }

/** GET /ops/rule-l: Rule L at the database, computed on each request. */
export interface RuleLChecks {
  rolesPresent?: Record<string, boolean>;
  unclassifiedTables?: string[];
  loginCanAssumeCommerce?: boolean;
  commerceLeaks?: string[];
  commerceMissing?: string[];
  clinicalOnCommerce?: string[];
}
export interface RuleLStatus {
  database: string;
  enforced: boolean;
  reasons: string[];
  checks: RuleLChecks;
  commercePaths?: { runAs: string; failClosed: boolean; endpoints: string[] };
}

/** GET /ops/erasure: pending erasure requests and sealed archives. Times are epoch seconds. */
export interface ErasurePending { accountId: string; requestedAt: number; scheduledFor: number }
export interface ErasureArchive { id: string; formerAccountId: string; rowCount: number; archivedAt: number; destroyAfter: number; destroyed: boolean }
export interface ErasureQueue { blocked: string | null; retentionDays: number | null; pending: ErasurePending[]; archives: ErasureArchive[] }

/** GET /apilayer/status: the proxy routes a previous product mounted, and whether a key is set. */
export interface ApiLayerStatus { status: string; apilayer_enabled: boolean; has_api_key: boolean; supported_features: string[] }

/** One declared setting, as GET /ops/settings lists it. */
export interface SettingView {
  key: string;
  type: string;
  default: unknown;
  description: string;
  area: string;
  unit: string;
  min: number | null;
  max: number | null;
  public: boolean;
  override: { value: unknown; valid: boolean; updatedBy: string; updatedAt: number } | null;
  effective: unknown;
}
export interface SettingList { items: SettingView[] }

/** GET /ops/settings/{key}/history, newest first. */
export interface SettingChange { oldValue: unknown; newValue: unknown; reason: string; changedBy: string; changedAt: number }
export interface SettingHistory { items: SettingChange[] }
