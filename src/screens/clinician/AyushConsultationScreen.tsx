import React, { useState } from 'react';
import { Bot, Leaf, MessageSquare, Sparkles } from 'lucide-react';
import { AgentAyushPanel } from '../workspace/AgentAyushPanel';
import '../../theme/workflows.css';

export function AyushConsultationScreen() {
  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">HOLISTIC WELLNESS & AYUSH</span>
          <h2>AYUSH Integrative Consultation Workspace</h2>
          <p>Ayurvedic, Yoga, and Naturopathy integrative care recommendations supervised by certified practitioners.</p>
        </div>
      </div>

      <AgentAyushPanel />
    </div>
  );
}
