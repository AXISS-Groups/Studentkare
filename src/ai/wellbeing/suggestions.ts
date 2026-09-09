/**
 * Suggestions — population-level and contextual, NEVER derived from an
 * individual's clinical findings as advice.
 *
 * S-4.1 Permitted triggers: seasonal/geographic, academic calendar, campus
 * events, administrative state, environmental, aggregate campus signal.
 * These NEVER require reading a diagnosis, lab value, medication, or mental
 * health record.
 *
 * S-4.3 Delivery: at most one suggestion surface per session, dismissible,
 * no PHI, no urgency/scarcity near a health decision, no commercial content,
 * always carries source + advisor sign-off.
 */
import type { Suggestion, SuggestionContext } from './types';

function approved(id: string, trigger: Suggestion['trigger'], title: string, body: string, source: string): Suggestion {
  return { id, trigger, title, body, source, advisorApproved: true, dismissible: true };
}

/** Contextual suggestion generator. Input is non-clinical by construction. */
export function generateContextualSuggestions(ctx: SuggestionContext): Suggestion[] {
  const out: Suggestion[] = [];

  if (ctx.monsoonSeason) {
    out.push(
      approved(
        'sug-monsoon',
        'SEASONAL',
        'Monsoon dengue prevention',
        'Clear standing water near your room, wear long sleeves in the evening, and use a repellent. General campus-season reminder.',
        'Seasonal campus guidance',
      ),
    );
  }

  if (ctx.summerHeat) {
    out.push(
      approved(
        'sug-heat',
        'ENVIRONMENTAL',
        'Heat guidance for Telangana summer',
        'Stay hydrated, avoid peak-hour sun, and use shaded routes between classes. General seasonal guidance.',
        'Environmental guidance',
      ),
    );
  }

  if (ctx.isExamWeek) {
    out.push(
      approved(
        'sug-exam',
        'ACADEMIC',
        'Sleep and stress in exam week',
        'Prioritise consistent sleep and short breaks. This is general study-wellbeing guidance, not a plan for you.',
        'Academic calendar guidance',
      ),
    );
  }

  if (ctx.campDaySoon) {
    out.push(
      approved(
        'sug-camp',
        'CAMPUS_EVENT',
        'Prepare for campus camp day',
        'Your campus health camp is coming up. Check which stations are scheduled and bring any documents you may need.',
        'Campus event guidance',
      ),
    );
  }

  if (ctx.clearanceExpiring) {
    out.push(
      approved(
        'sug-clearance',
        'ADMIN_STATE',
        'Clearance expiring',
        'A health clearance on your record is expiring. Book a clinic slot to renew it.',
        'Administrative state',
      ),
    );
  }

  if (ctx.immunisationDue) {
    out.push(
      approved(
        'sug-immunisation',
        'ADMIN_STATE',
        'Immunisation due',
        'An immunisation on your record is due. Book a clinic slot.',
        'Administrative state',
      ),
    );
  }

  if (ctx.campOverdue) {
    out.push(
      approved(
        'sug-camp-overdue',
        'ADMIN_STATE',
        'Campus camp overdue',
        'Your campus health camp is overdue. Book a slot to complete it.',
        'Administrative state',
      ),
    );
  }

  if (ctx.aggregateGiReports) {
    out.push(
      approved(
        'sug-gi',
        'AGGREGATE_SIGNAL',
        'Food safety reminder',
        'There have been elevated stomach-illness reports on campus this week. Wash hands and prefer freshly prepared food. This is a general reminder.',
        'Aggregate campus signal',
      ),
    );
  }

  return out;
}

/** At most one suggestion surface per session. */
export function takeTopSuggestion(suggestions: Suggestion[]): Suggestion | null {
  return suggestions[0] ?? null;
}
