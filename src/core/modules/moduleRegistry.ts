/**
 * Module Registry & Inter-Module Communication (P63)
 * Manages module registration, dependency graph acyclicity checks, and typed domain event distribution.
 */

import { ModuleConfig, ModuleId } from './moduleManifest';

export interface DomainEvent<T = Record<string, unknown>> {
  /** Event topic name (e.g., 'records.updated') */
  topic: string;
  /** Source module ID emitting the event */
  sourceModuleId: ModuleId;
  /** Payload payload containing IDs/metadata only — NO clinical payloads (P63) */
  payload: T;
  /** Timestamp of event generation */
  timestamp: Date;
}

export type EventSubscriber<T = Record<string, unknown>> = (event: DomainEvent<T>) => void;

/** Forbidden clinical payload keys in event payloads per P63 Guardrails */
const FORBIDDEN_CLINICAL_PAYLOAD_KEYS = [
  'diagnosis',
  'prescription',
  'labResult',
  'vitals',
  'medicalHistory',
  'symptom',
  'treatment',
  'patientNotes',
];

export class ModuleRegistry {
  private static instance: ModuleRegistry;
  private modules = new Map<ModuleId, ModuleConfig>();
  private subscribers = new Map<string, Set<EventSubscriber>>();

  private constructor() {}

  public static getInstance(): ModuleRegistry {
    if (!ModuleRegistry.instance) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }

  /** Reset registry state (for testing purposes) */
  public reset(): void {
    this.modules.clear();
    this.subscribers.clear();
  }

  /**
   * Registers a module and validates dependency graph acyclicity.
   */
  public register(config: ModuleConfig): void {
    if (this.modules.has(config.id)) {
      throw new Error(`[ModuleRegistry] Module ${config.id} is already registered.`);
    }

    this.modules.set(config.id, config);
    this.validateDependencyGraph();
  }

  /**
   * Get all registered modules.
   */
  public getModules(): ReadonlyArray<ModuleConfig> {
    return Array.from(this.modules.values());
  }

  /**
   * Get a module manifest by ID.
   */
  public getModule(id: ModuleId): ModuleConfig | undefined {
    return this.modules.get(id);
  }

  /**
   * Emits a domain event across the inter-module bus (P63).
   */
  public emit<T extends Record<string, unknown>>(
    sourceModuleId: ModuleId,
    topic: string,
    payload: T
  ): void {
    const manifest = this.modules.get(sourceModuleId);
    if (!manifest) {
      throw new Error(`[ModuleRegistry] Unregistered module ${sourceModuleId} attempted to emit event.`);
    }

    // P63 Guardrail: Emitting an undeclared event topic fails check
    if (!manifest.emits?.includes(topic)) {
      throw new Error(
        `[P63 Violation] Module ${sourceModuleId} (${manifest.name}) attempted to emit undeclared event topic '${topic}'. ` +
        `Declare topic in module.config.ts 'emits' array.`
      );
    }

    // P63 Guardrail: Event payloads carry identifiers only, never clinical payloads
    this.validatePayloadPrivacy(topic, payload);

    const event: DomainEvent<T> = {
      topic,
      sourceModuleId,
      payload,
      timestamp: new Date(),
    };

    const topicSubscribers = this.subscribers.get(topic);
    if (topicSubscribers) {
      topicSubscribers.forEach((sub) => sub(event as unknown as DomainEvent));
    }
  }

  /**
   * Subscribes a consumer module to a domain event topic.
   */
  public subscribe<T extends Record<string, unknown>>(
    consumerModuleId: ModuleId,
    topic: string,
    subscriber: EventSubscriber<T>
  ): () => void {
    const manifest = this.modules.get(consumerModuleId);
    if (!manifest) {
      throw new Error(`[ModuleRegistry] Unregistered module ${consumerModuleId} attempted to subscribe.`);
    }

    // P63 Guardrail: Consumer module must declare event topic in 'consumes'
    if (!manifest.consumes?.includes(topic)) {
      throw new Error(
        `[P63 Violation] Module ${consumerModuleId} (${manifest.name}) attempted to subscribe to undeclared topic '${topic}'. ` +
        `Declare topic in module.config.ts 'consumes' array.`
      );
    }

    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }

    const topicSubs = this.subscribers.get(topic)!;
    topicSubs.add(subscriber as EventSubscriber);

    return () => {
      topicSubs.delete(subscriber as EventSubscriber);
    };
  }

  /**
   * Validates that the dependency graph contains no cycles.
   */
  private validateDependencyGraph(): void {
    const visited = new Set<ModuleId>();
    const recursionStack = new Set<ModuleId>();

    const dfs = (id: ModuleId): void => {
      visited.add(id);
      recursionStack.add(id);

      const moduleConfig = this.modules.get(id);
      if (moduleConfig?.dependsOn) {
        for (const depId of moduleConfig.dependsOn) {
          if (!visited.has(depId) && this.modules.has(depId)) {
            dfs(depId);
          } else if (recursionStack.has(depId)) {
            throw new Error(`[P58 Violation] Circular dependency detected in module graph involving ${id} -> ${depId}.`);
          }
        }
      }

      recursionStack.delete(id);
    };

    for (const moduleId of this.modules.keys()) {
      if (!visited.has(moduleId)) {
        dfs(moduleId);
      }
    }
  }

  /**
   * Enforces P63 rule: Event payloads carry identifiers only, never clinical fields.
   */
  private validatePayloadPrivacy(topic: string, payload: Record<string, unknown>): void {
    for (const key of Object.keys(payload)) {
      if (FORBIDDEN_CLINICAL_PAYLOAD_KEYS.includes(key)) {
        throw new Error(
          `[P63 Violation] Event topic '${topic}' payload contains forbidden clinical field '${key}'. ` +
          `Events must contain resource IDs/metadata only (e.g. recordId). Clinical data must be re-read via consented repository.`
        );
      }
    }
  }
}
