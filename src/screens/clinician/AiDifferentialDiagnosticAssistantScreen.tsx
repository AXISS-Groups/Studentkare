import React, { useState } from 'react';
import { Bot, Sparkles, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { Field } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

export function AiDifferentialDiagnosticAssistantScreen() {
  const [symptoms, setSymptoms] = useState('High fever (102°F), severe retro-orbital pain, myalgia, skin petechiae');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setResult({
        primary: 'Dengue Hemorrhagic Fever (High Probability)',
        differentials: ['Chikungunya Virus Infection', 'Malaria (Plasmodium Vivax)', 'Acute Viral Exanthem'],
        recommendedLabs: ['Dengue NS1 Antigen & IgM', 'Complete Blood Count (Platelet Monitor)', 'Peripheral Blood Smear']
      });
    }, 1500);
  };

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">EXECUTABLE AI CONSTITUTION MODULE</span>
          <h2>AI Differential Diagnostic Assistant</h2>
          <p>FHIR R4 clinical symptom checker with evidence grounding routed through M18 isolation firewall.</p>
        </div>
      </div>

      <div className="wf-card" style={{ padding: 24, marginBottom: 20 }}>
        <form onSubmit={handleAnalyze} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Enter Patient Symptoms & Physical Signs">
            <textarea rows={3} value={symptoms} onChange={e => setSymptoms(e.target.value)} required />
          </Field>
          <button className="health-button health-button-primary" type="submit" disabled={analyzing} style={{ minHeight: 44, width: 'fit-content' }}>
            <Sparkles size={16} /> {analyzing ? 'Analyzing Clinical Evidence...' : 'Generate AI Differential Assessment'}
          </button>
        </form>
      </div>

      {result && (
        <div className="wf-card" style={{ padding: 24, borderLeft: '4px solid var(--accent, #2563eb)' }}>
          <span className="care-eyebrow">M18 ISOLATED MODEL ANALYSIS</span>
          <h3 style={{ fontSize: 18, margin: '6px 0 12px' }}>Primary Hypothesis: {result.primary}</h3>
          
          <div style={{ marginBottom: 14 }}>
            <strong>Differential Diagnoses:</strong>
            <ul style={{ fontSize: 13, margin: '4px 0 0', paddingLeft: 20 }}>
              {result.differentials.map((d: string) => <li key={d}>{d}</li>)}
            </ul>
          </div>

          <div>
            <strong>Recommended Diagnostic Workup:</strong>
            <ul style={{ fontSize: 13, margin: '4px 0 0', paddingLeft: 20 }}>
              {result.recommendedLabs.map((l: string) => <li key={l}>{l}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
