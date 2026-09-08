import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/theme';
import { Card } from './Card';
import { Badge } from './Badge';
import { Bot, Play, CheckCircle2, AlertTriangle, ShieldCheck, Cpu } from 'lucide-react';
import { specialistMesh, SpecialistAgentResult } from '../ai/specialistAgentsMesh';

export const SpecialistAgentsMeshPanel: React.FC = () => {
  const { tokens, radius, typography } = useTheme();

  const [agentResults, setAgentResults] = useState<SpecialistAgentResult[]>([
    specialistMesh.runOutbreakPredictor('Hostel Block B', 34),
    specialistMesh.runCdscoRecallGuard('Paracetamol 650mg'),
    specialistMesh.runFssaiHygieneAuditor('Hostel Mess Pod 1'),
    specialistMesh.runDpdpErasureReconciler('dpdp_req_003'),
    specialistMesh.runAbdmGatewayHealthCheck(),
  ]);

  const [runningAll, setRunningAll] = useState(false);

  const handleRunAllAgents = () => {
    setRunningAll(true);
    setTimeout(() => {
      setAgentResults([
        specialistMesh.runOutbreakPredictor('Hostel Block B', 38),
        specialistMesh.runCdscoRecallGuard('Paracetamol 650mg'),
        specialistMesh.runFssaiHygieneAuditor('Hostel Mess Pod 1'),
        specialistMesh.runDpdpErasureReconciler('dpdp_req_003'),
        specialistMesh.runAbdmGatewayHealthCheck(),
      ]);
      setRunningAll(false);
    }, 800);
  };

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Cpu size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: tokens.text, fontFamily: typography.fontFamily }}>
            Specialist Autonomous Agent Swarm Mesh
          </Text>
        </View>
        <Badge label="5 SPECIALIZED AGENTS ONLINE" variant="positive" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 16 }}>
        Autonomous background agent mesh monitoring epidemic R0 rates, CDSCO drug recalls, FSSAI mess water quality, DPDP erasure SLAs, and ABDM gateway latency.
      </Text>

      {/* Agents List */}
      <View style={{ gap: 10, marginBottom: 16 }}>
        {agentResults.map((res) => (
          <View key={res.agentId} style={{ backgroundColor: tokens.surface2, borderRadius: radius.lg, padding: 12, border: `1px solid ${tokens.rule}` }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Bot size={16} color={tokens.action} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: tokens.text }}>{res.agentName}</Text>
              </View>
              <Badge
                label={res.status}
                variant={res.status === 'ALERT_RAISED' ? 'emergency' : 'positive'}
              />
            </View>
            <Text style={{ fontSize: 11, color: tokens.text2 }}>{res.summary}</Text>
          </View>
        ))}
      </View>

      {/* Run All Trigger */}
      <TouchableOpacity
        onPress={handleRunAllAgents}
        disabled={runningAll}
        style={{ backgroundColor: tokens.action, padding: 10, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
      >
        <Play size={14} color="#ffffff" />
        <Text style={{ fontSize: 12, fontWeight: '800', color: '#ffffff', fontFamily: typography.fontFamily }}>
          {runningAll ? 'Executing Specialist Mesh Sweep...' : 'Trigger Full Specialist Swarm Audit Sweep'}
        </Text>
      </TouchableOpacity>
    </Card>
  );
};
