import React from 'react';
import './timeline.css';

export type TimelineTone = 'live' | 'attention' | 'positive' | 'plain' | 'edge';

export interface TimelineEntry {
  id: string;
  title: string;
  /** Short uppercase tag after the title, e.g. "LOW", "NOW". */
  tag?: string;
  meta: string;
  when: string;
  tone: TimelineTone;
}

/**
 * One axis for readings, prescriptions, orders and notes (EncounterNote). The
 * last entry can be the consent-window edge: nothing before it is shown at all.
 */
export function Timeline({ label, entries }: { label: string; entries: TimelineEntry[] }): React.ReactElement {
  return (
    <ol className="sk-timeline" aria-label={label}>
      {entries.map((entry, index) => (
        <li key={entry.id} className={`sk-timeline__item sk-timeline__item--${entry.tone} sk-rise`} style={{ '--sk-stagger': Math.min(index, 8) } as React.CSSProperties}>
          <span className="sk-timeline__rail" aria-hidden="true">
            <span className="sk-timeline__dot" />
            {index < entries.length - 1 ? <span className="sk-timeline__line" /> : null}
          </span>
          <span className="sk-timeline__body">
            <span className="sk-timeline__title">
              {entry.title}
              {entry.tag ? <span className="sk-timeline__tag">{entry.tag}</span> : null}
            </span>
            <span className="sk-timeline__meta">{entry.meta}</span>
            <span className="sk-timeline__when">{entry.when}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
