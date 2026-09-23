import React, { useState } from 'react';
import { Inbox, AlertTriangle, Pill, ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import { ClinicalReviewPanel } from '../workspace/ClinicalReviewPanel';
import '../../theme/workflows.css';

export function DoctorClinicalInboxScreen() {
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'substitutions'>('all');

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">CLINICIAN DECISION DESK</span>
          <h2>Doctor Clinical Inbox</h2>
          <p>Unread critical diagnostic alerts, lab results, and pharmacy substitution requests requiring your signature.</p>
        </div>
      </div>

      <div className="wf-card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 12 }}>
        <button 
          className={`health-button ${activeTab === 'all' ? 'health-button-primary' : ''}`}
          style={{ minHeight: 40 }}
          onClick={() => setActiveTab('all')}
        >
          <Inbox size={16} /> All Decision Items
        </button>
        <button 
          className={`health-button ${activeTab === 'critical' ? 'health-button-primary' : ''}`}
          style={{ minHeight: 40 }}
          onClick={() => setActiveTab('critical')}
        >
          <AlertTriangle size={16} color="var(--emergency, #ef4444)" /> Critical Values Only
        </button>
        <button 
          className={`health-button ${activeTab === 'substitutions' ? 'health-button-primary' : ''}`}
          style={{ minHeight: 40 }}
          onClick={() => setActiveTab('substitutions')}
        >
          <Pill size={16} /> Pharmacy Swaps
        </button>
      </div>

      <ClinicalReviewPanel />
    </div>
  );
}
