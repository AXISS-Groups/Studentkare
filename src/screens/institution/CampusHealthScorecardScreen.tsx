import React from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

export function CampusHealthScorecardScreen() {
  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">INSTITUTIONAL BENCHMARK</span>
          <h2>Campus Health Rating Scorecard & Audit Index</h2>
          <p>Composite health governance rating based on immunization coverage, sanitary audits, and ambulance SLAs.</p>
        </div>
      </div>

      {/* No scorecard data source exists yet. A grade, coverage % or SLA is never
          shown unless it is computed from recorded evidence (AGENTS.md guardrail 6). */}
      <EmptyState title="No scorecard data yet." description="A campus rating appears only once immunisation, sanitary audit and ambulance response records exist to compute it from." />
    </div>
  );
}
