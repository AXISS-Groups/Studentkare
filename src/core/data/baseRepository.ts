/**
 * Base Repository with Mandatory RLS Context Enforcement (P47)
 * Ensures every database access carries an explicit session context.
 * Fail closed: A query executed without RLS context throws immediately.
 */

export interface RLSSessionContext {
  authenticatedUserId: string;
  institutionGrantId?: string;
  roles: string[];
}

export abstract class BaseRepository {
  protected readonly rlsContext: RLSSessionContext;

  constructor(context: RLSSessionContext) {
    if (!context || !context.authenticatedUserId) {
      throw new Error(
        `[P47 Violation] Repository initialization failed: Missing RLS Session Context. ` +
        `Every clinical/operational repository query must execute within an authenticated, scoped session.`
      );
    }
    this.rlsContext = Object.freeze({ ...context });
  }

  /**
   * Returns current RLS session parameters for query parameterization.
   */
  protected getSessionContext(): Readonly<RLSSessionContext> {
    return this.rlsContext;
  }
}
