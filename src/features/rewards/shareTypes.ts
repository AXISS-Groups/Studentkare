/** What happened when the student tried to share their invite. */
export type ShareOutcome = 'shared' | 'copied' | 'dismissed' | 'failed';

export interface InviteShare {
  /** The full prefilled message, link included. */
  message: string;
  /** The link on its own (some share targets take it separately). */
  url: string;
  title: string;
}
