import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/theme';
import { Card } from './Card';
import { Badge } from './Badge';
import { Radio, Pause, Play } from 'lucide-react';

export interface TelemetryEvent {
  id: string;
  eventType: 'CAMP_CHECKIN' | 'FHIR_DOC_INGEST' | 'EMERGENCY_SOS_HEARTBEAT' | 'ABDM_TOKEN_SYNC';
  institutionName: string;
  payloadSummary: string;
  latencyMs: number;
  timestamp: string;
}

export const RealtimeTelemetryStream: React.FC = () => {
  const { tokens, radius, typography } = useTheme();

  const [isStreaming, setIsStreaming] = useState(true);
  const [events, setEvents] = useState<TelemetryEvent[]>([
    { id: 'evt-101', eventType: 'EMERGENCY_SOS_HEARTBEAT', institutionName: 'IIT Hyderabad (Kandi)', payloadSummary: '108 Ambulance GPS Heartbeat Lat/Lng: 17.594, 78.123', latencyMs: 14, timestamp: 'Just now' },
    { id: 'evt-100', eventType: 'CAMP_CHECKIN', institutionName: 'Osmania University', payloadSummary: 'Student STU-2026-9812 completed Station 3 (rPPG Vitals)', latencyMs: 42, timestamp: '10s ago' },
    { id: 'evt-099', eventType: 'FHIR_DOC_INGEST', institutionName: 'BITS Pilani Hyderabad', payloadSummary: 'Parsed CBC Blood Panel FHIR R4 Bundle (+50 Pts)', latencyMs: 68, timestamp: '24s ago' },
    { id: 'evt-098', eventType: 'ABDM_TOKEN_SYNC', institutionName: 'AIIMS Campus Clinic', payloadSummary: 'ABHA Token Gateway OAuth 2.0 refresh completed', latencyMs: 120, timestamp: '45s ago' },
  ]);

  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      const sampleEvents: TelemetryEvent[] = [
        { id: `evt-${Date.now().toString().slice(-3)}`, eventType: 'CAMP_CHECKIN', institutionName: 'IIT Hyderabad', payloadSummary: 'Student camp checkin completed at Station Pod 2', latencyMs: 38, timestamp: 'Just now' },
        { id: `evt-${Date.now().toString().slice(-3)}`, eventType: 'FHIR_DOC_INGEST', institutionName: 'Osmania University', payloadSummary: 'LOINC 26453-1 RBC count indexed to FHIR Vault', latencyMs: 54, timestamp: 'Just now' },
        { id: `evt-${Date.now().toString().slice(-3)}`, eventType: 'ABDM_TOKEN_SYNC', institutionName: 'BITS Pilani', payloadSummary: 'HIP Discovery token reconciled with ABDM Gateway', latencyMs: 112, timestamp: 'Just now' },
      ];
      const randomEvt = sampleEvents[Math.floor(Math.random() * sampleEvents.length)];
      setEvents((prev) => [randomEvt, ...prev.slice(0, 7)]);
    }, 4000);

    return () => clearInterval(interval);
  }, [isStreaming]);

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Radio size={22} color={isStreaming ? tokens.positive : tokens.text3} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: tokens.text, fontFamily: typography.fontFamily }}>
            Real-Time SSE / WebSocket Telemetry Stream
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Badge label={isStreaming ? 'LIVE STREAM CONNECTED' : 'STREAM PAUSED'} variant={isStreaming ? 'positive' : 'mono'} />
          <TouchableOpacity
            onPress={() => setIsStreaming(!isStreaming)}
            style={{ backgroundColor: tokens.surface2, padding: 6, borderRadius: 8, border: `1px solid ${tokens.rule}` }}
          >
            {isStreaming ? <Pause size={14} color={tokens.text} /> : <Play size={14} color={tokens.action} />}
          </TouchableOpacity>
        </View>
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 16 }}>
        Low-latency server-sent events stream monitoring real-time campus check-ins, FHIR extractions, and ABDM gateway heartbeats without manual page refreshes.
      </Text>

      {/* Events Ticker */}
      <View style={{ backgroundColor: tokens.canvas, borderRadius: radius.lg, padding: 12, border: `1px solid ${tokens.rule}` }}>
        {events.map((evt) => (
          <View key={evt.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: tokens.ruleSoft }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Badge
                  label={evt.eventType}
                  variant={evt.eventType === 'EMERGENCY_SOS_HEARTBEAT' ? 'emergency' : evt.eventType === 'CAMP_CHECKIN' ? 'positive' : 'mono'}
                />
                <Text style={{ fontSize: 12, fontWeight: '800', color: tokens.text }}>{evt.institutionName}</Text>
              </View>
              <Text style={{ fontSize: 11, color: tokens.text2, marginTop: 2 }}>{evt.payloadSummary}</Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 11, color: tokens.positive, fontWeight: '800', fontFamily: typography.fontMono }}>{evt.latencyMs}ms</Text>
              <Text style={{ fontSize: 10, color: tokens.text3, marginTop: 2 }}>{evt.timestamp}</Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
};
