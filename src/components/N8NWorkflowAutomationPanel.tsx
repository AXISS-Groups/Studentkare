import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/theme';
import { Card } from './Card';
import { Badge } from './Badge';
import { Layers, Workflow, Play, CheckCircle2, RefreshCw, Zap, Server, ShieldCheck } from 'lucide-react';
import { multiAgentLoopEngine, MultiAgentSwarmResult } from '../ai/multiAgentLoopOrchestrator';
import { aiApi } from '../data/api';

export const N8NWorkflowAutomationPanel: React.FC = () => {
  const { tokens, radius, typography } = useTheme();

  const [executing, setExecuting] = useState(false);
  const [swarmResult, setSwarmResult] = useState<MultiAgentSwarmResult | null>(null);

  const [n8nWorkflows, setN8nWorkflows] = useState([
    { id: 'wf-01', name: 'Campus Emergency SOS 108 Alert Dispatcher', webhookUrl: '/webhook/sos-alert-108', status: 'ACTIVE', totalTriggers: 142 },
    { id: 'wf-02', name: 'Hostel Express Pharmacy Order & Rider Dispatch', webhookUrl: '/webhook/pharma-rider-dispatch', status: 'ACTIVE', totalTriggers: 512 },
    { id: 'wf-03', name: 'DPDP Act 2023 Statutory SLA Breach Countdown Warning', webhookUrl: '/webhook/dpdp-sla-warning', status: 'ACTIVE', totalTriggers: 28 },
    { id: 'wf-04', name: 'ABDM Gateway Token Revocation Sync Engine', webhookUrl: '/webhook/abdm-token-sync', status: 'ACTIVE', totalTriggers: 89 },
  ]);

  const handleRunSwarmLoop = () => {
    setExecuting(true);
    setSwarmResult(null);

    setTimeout(() => {
      const res = multiAgentLoopEngine.executeSwarmLoop('Acute High Fever (101.2°F) & Body Ache in Hostel Block B');
      setSwarmResult(res);
      setExecuting(false);
      // Dispatch the fulfillment webhook to the automation plane (best-effort).
      aiApi.dispatchN8n('/webhook/pharma-rider-dispatch', {
        goal: res.goal,
        executionId: res.executionId,
        finalAnswer: res.finalAnswer,
      }).then(() => {});
    }, 1000);
  };

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Workflow size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: tokens.text, fontFamily: typography.fontFamily }}>
            n8n Automation Pipeline & Multi-Agent Swarm Orchestrator
          </Text>
        </View>
        <Badge label="N8N WORKFLOW AUTOMATION ACTIVE" variant="positive" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 16 }}>
        Distributed n8n webhook automation & multi-agent ReAct swarm orchestrator. Automates end-to-end campus emergency dispatches, pharmacy fulfillment, and ABDM gateway token reconciliation.
      </Text>

      {/* Active Workflows Table */}
      <View style={{ backgroundColor: tokens.surface2, borderRadius: radius.lg, padding: 14, border: `1px solid ${tokens.rule}`, marginBottom: 16 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: tokens.text3, fontFamily: typography.fontMono, marginBottom: 10 }}>
          REGISTERED N8N AUTOMATION PIPELINES ({n8nWorkflows.length})
        </Text>

        {n8nWorkflows.map((wf) => (
          <View key={wf.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: tokens.ruleSoft }}>
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: tokens.text }}>{wf.name}</Text>
              <Text style={{ fontSize: 11, color: tokens.text3, fontFamily: typography.fontMono, marginTop: 2 }}>
                Webhook: {wf.webhookUrl} · Triggers: {wf.totalTriggers}
              </Text>
            </View>
            <Badge label={wf.status} variant="positive" />
          </View>
        ))}
      </View>

      {/* Multi-Agent Swarm ReAct Loop Runner */}
      <View style={{ backgroundColor: tokens.canvas, borderRadius: radius.lg, padding: 16, border: `1px solid ${tokens.action}` }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: tokens.text, fontFamily: typography.fontFamily }}>
            Multi-Agent Swarm & ReAct Loop Runner
          </Text>
          <TouchableOpacity
            onPress={handleRunSwarmLoop}
            disabled={executing}
            style={{ backgroundColor: tokens.action, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            {executing ? <RefreshCw size={14} color="#ffffff" /> : <Play size={14} color="#ffffff" />}
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#ffffff' }}>
              {executing ? 'Executing ReAct Loop...' : 'Trigger 5-Agent Swarm Loop'}
            </Text>
          </TouchableOpacity>
        </View>

        {swarmResult && (
          <View style={{ marginTop: 12 }}>
            <View style={{ backgroundColor: tokens.positiveBg, padding: 10, borderRadius: 8, marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: tokens.positive, fontFamily: typography.fontMono }}>
                ✓ SWARM EXECUTION SUCCESS ({swarmResult.executionId})
              </Text>
              <Text style={{ fontSize: 12, color: tokens.text, marginTop: 4 }}>{swarmResult.finalAnswer}</Text>
            </View>

            <Text style={{ fontSize: 11, fontWeight: '800', color: tokens.text3, fontFamily: typography.fontMono, marginBottom: 8 }}>
              REACT THOUGHT-ACTION-OBSERVATION TRACE ({swarmResult.steps.length} STEPS)
            </Text>

            {swarmResult.steps.map((step) => (
              <View key={step.stepIndex} style={{ backgroundColor: tokens.surface2, padding: 10, borderRadius: 8, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: tokens.action }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: tokens.text }}>{step.agentName}</Text>
                  <Badge label={step.ruleAsserted} variant="mono" />
                </View>
                <Text style={{ fontSize: 11, color: tokens.text2, fontStyle: 'italic' }}>Thought: {step.thought}</Text>
                <Text style={{ fontSize: 11, color: tokens.action, fontFamily: typography.fontMono, marginTop: 2 }}>{step.action}</Text>
                <Text style={{ fontSize: 11, color: tokens.positive, marginTop: 2 }}>Observation: {step.observation}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Card>
  );
};
