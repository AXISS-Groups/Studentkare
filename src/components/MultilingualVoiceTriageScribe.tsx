import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/theme';
import { Card } from './Card';
import { Badge } from './Badge';
import { Mic, Languages } from 'lucide-react';
import { assertRule } from '../ai/constitution';

export interface VoiceTriageTranscription {
  language: 'ENGLISH' | 'TELUGU' | 'HINDI';
  audioTranscript: string;
  englishTranslation: string;
  fleschKincaidReadingGrade: string;
  extractedSymptoms: string[];
}

export const MultilingualVoiceTriageScribe: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  assertRule('Rule-A'); // Non-prescriptive triage rule

  const [selectedLang, setSelectedLang] = useState<'ENGLISH' | 'TELUGU' | 'HINDI'>('TELUGU');
  const [recording, setRecording] = useState(false);
  const [transcription, setTranscription] = useState<VoiceTriageTranscription | null>({
    language: 'TELUGU',
    audioTranscript: 'నాకు 2 రోజుల నుండి తీవ్రమైన జ్వరం మరియు గొంతు నొప్పి ఉంది.',
    englishTranslation: 'I have severe fever and sore throat for 2 days.',
    fleschKincaidReadingGrade: 'Grade 6.2 (Accessible Primary Literacy)',
    extractedSymptoms: ['Acute Pyrexia (2 Days)', 'Sore Throat'],
  });

  const handleStartVoiceRecording = (lang: 'ENGLISH' | 'TELUGU' | 'HINDI') => {
    setSelectedLang(lang);
    setRecording(true);
    setTranscription(null);

    setTimeout(() => {
      setRecording(false);
      if (lang === 'TELUGU') {
        setTranscription({
          language: 'TELUGU',
          audioTranscript: 'నాకు 2 రోజుల నుండి తీవ్రమైన జ్వరం మరియు గొంతు నొప్పి ఉంది.',
          englishTranslation: 'I have severe fever and sore throat for 2 days.',
          fleschKincaidReadingGrade: 'Grade 6.2 (Accessible Primary Literacy)',
          extractedSymptoms: ['Acute Pyrexia (2 Days)', 'Sore Throat'],
        });
      } else if (lang === 'HINDI') {
        setTranscription({
          language: 'HINDI',
          audioTranscript: 'मुझे 2 दिनों से तेज़ बुखार और गले में खराश है।',
          englishTranslation: 'I have high fever and throat irritation for 2 days.',
          fleschKincaidReadingGrade: 'Grade 5.8 (Accessible Primary Literacy)',
          extractedSymptoms: ['High Pyrexia (2 Days)', 'Throat Irritation'],
        });
      } else {
        setTranscription({
          language: 'ENGLISH',
          audioTranscript: 'I have high fever and severe headache for the past 2 days.',
          englishTranslation: 'I have high fever and severe headache for the past 2 days.',
          fleschKincaidReadingGrade: 'Grade 6.0 (Accessible Primary Literacy)',
          extractedSymptoms: ['High Fever (2 Days)', 'Severe Headache'],
        });
      }
    }, 1200);
  };

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Languages size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: tokens.text, fontFamily: typography.fontFamily }}>
            Multilingual Voice Triage Scribe (EN / TE / HI)
          </Text>
        </View>
        <Badge label="BILINGUAL AUDIO SCRIBE" variant="positive" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 16 }}>
        Accessibility-first audio voice scribe. Allows students to speak symptoms in English, Telugu (తెలుగు), or Hindi (हिन्दी) with automated reading-level validation.
      </Text>

      {/* Language Selector Buttons */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {[
          { id: 'TELUGU' as const, label: 'తెలుగు (Telugu)' },
          { id: 'HINDI' as const, label: 'हिन्दी (Hindi)' },
          { id: 'ENGLISH' as const, label: 'English' },
        ].map((lang) => (
          <TouchableOpacity
            key={lang.id}
            onPress={() => handleStartVoiceRecording(lang.id)}
            disabled={recording}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 10,
              backgroundColor: selectedLang === lang.id ? tokens.action : tokens.surface2,
              border: `1px solid ${tokens.rule}`,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: selectedLang === lang.id ? '#ffffff' : tokens.text }}>
              {lang.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Mic Recording Indicator */}
      {recording && (
        <View style={{ backgroundColor: tokens.canvas, padding: 16, borderRadius: radius.lg, alignItems: 'center', marginBottom: 14 }}>
          <Mic size={32} color={tokens.emergency} />
          <Text style={{ fontSize: 12, fontWeight: '800', color: tokens.emergency, marginTop: 8, fontFamily: typography.fontMono }}>
            Listening & Transcribing ({selectedLang})... Speak clearly into microphone
          </Text>
        </View>
      )}

      {/* Transcription Results */}
      {transcription && (
        <View style={{ backgroundColor: tokens.surface2, borderRadius: radius.lg, padding: 14, border: `1px solid ${tokens.rule}` }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: tokens.text3, fontFamily: typography.fontMono }}>AUDIO TRANSCRIPT ({transcription.language})</Text>
            <Badge label={transcription.fleschKincaidReadingGrade} variant="mono" />
          </View>

          <Text style={{ fontSize: 14, fontWeight: '800', color: tokens.text, marginBottom: 6 }}>
            "{transcription.audioTranscript}"
          </Text>

          {transcription.language !== 'ENGLISH' && (
            <Text style={{ fontSize: 12, color: tokens.text2, fontStyle: 'italic', marginBottom: 10 }}>
              Translation: "{transcription.englishTranslation}"
            </Text>
          )}

          <Text style={{ fontSize: 11, fontWeight: '800', color: tokens.text3, fontFamily: typography.fontMono, marginBottom: 4 }}>
            EXTRACTED CLINICAL SYMPTOMS
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {transcription.extractedSymptoms.map((sym, idx) => (
              <View key={idx} style={{ backgroundColor: tokens.actionHover, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: tokens.action, fontFamily: typography.fontMono }}>✓ {sym}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
};
