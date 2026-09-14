import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useStudentStore } from '../../store/AppStores';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Moon, ShieldCheck } from 'lucide-react';

const Flow10LearnScreenUnwrapped: React.FC = () => {
  const { tokens, radius } = useTheme();
  const { student, updateStudent } = useStudentStore();

  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);

  const modules = [
    {
      id: 'mod-1',
      title: 'Monsoon Dengue Prevention & Platelet Health',
      duration: '3 min read',
      icon: ShieldCheck,
      desc: 'Understanding early NS1 fever indicators, hydration protocols, and why NSAIDs should be avoided during fever spikes.',
      quiz: {
        question: 'Which pain reliever is safest to take during suspected viral fever in monsoon?',
        options: ['Ibuprofen / Aspirin', 'Paracetamol 650mg', 'Antibiotics (Amoxicillin)'],
        correctIdx: 1,
      },
    },
    {
      id: 'mod-2',
      title: 'Circadian Rhythm & Sleep Hygiene for Students',
      duration: '4 min read',
      icon: Moon,
      desc: 'The neuroscience of non-REM sleep, blue-light mitigation before exams, and non-stimulant focus routines.',
      quiz: {
        question: 'How long before bed should high-intensity screen exposure be minimized?',
        options: ['5 minutes', '45–60 minutes', 'Does not matter'],
        correctIdx: 1,
      },
    },
  ];

  const handleCompleteQuiz = () => {
    setQuizFinished(true);
    updateStudent({ pointsBalance: student.pointsBalance + 50 });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]}>
      <View style={styles.headerBox}>
        <Badge label="FLOW 10 · M17 AWARENESS LIBRARY" variant="mono" />
        <Text style={[styles.title, { color: tokens.text }]}>Evidence-Backed Health Knowledge</Text>
        <Text style={[styles.sub, { color: tokens.text2 }]}>
          Bite-sized micro-modules verified by medical clinicians. Complete interactive quizzes to earn wellness points.
        </Text>
      </View>

      <View style={styles.modulesList}>
        {modules.map((mod) => {
          const IconC = mod.icon;
          const isQuizOpen = activeQuizId === mod.id;

          return (
            <Card key={mod.id} variant="surface" style={styles.modCard}>
              <View style={styles.modTopRow}>
                <View style={[styles.modIconBox, { backgroundColor: tokens.surface3 }]}>
                  <IconC size={22} color={tokens.action} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modTitle, { color: tokens.text }]}>{mod.title}</Text>
                  <Text style={[styles.modDuration, { color: tokens.data }]}>{mod.duration} · Peer Reviewed</Text>
                </View>
              </View>

              <Text style={[styles.modDesc, { color: tokens.text2 }]}>{mod.desc}</Text>

              {isQuizOpen ? (
                <View style={[styles.quizBox, { backgroundColor: tokens.surface2, borderRadius: radius.md }]}>
                  <Text style={[styles.quizQ, { color: tokens.text }]}>Quiz: {mod.quiz.question}</Text>
                  <View style={{ gap: 8, marginVertical: 10 }}>
                    {mod.quiz.options.map((opt, oIdx) => (
                      <TouchableOpacity
                        key={oIdx}
                        onPress={() => setSelectedAnswer(oIdx)}
                        style={[
                          styles.optionBtn,
                          {
                            backgroundColor: selectedAnswer === oIdx ? tokens.action : tokens.surface,
                            borderColor: selectedAnswer === oIdx ? tokens.action : tokens.rule,
                          },
                        ]}
                      >
                        <Text style={{ color: selectedAnswer === oIdx ? '#ffffff' : tokens.text, fontSize: 13 }}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {quizFinished ? (
                    <Badge label="Quiz Completed! +50 Points Awarded" variant="positive" />
                  ) : (
                    <Button
                      label="Submit Answer"
                      onPress={handleCompleteQuiz}
                      size="sm"
                      disabled={selectedAnswer === null}
                    />
                  )}
                </View>
              ) : (
                <Button
                  label="Take Micro-Quiz (+50 Pts)"
                  onPress={() => {
                    setActiveQuizId(mod.id);
                    setSelectedAnswer(null);
                    setQuizFinished(false);
                  }}
                  variant="secondary"
                  size="sm"
                  style={{ alignSelf: 'flex-start', marginTop: 10 }}
                />
              )}
            </Card>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  headerBox: {
    maxWidth: 780,
    alignSelf: 'center',
    width: '100%',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    marginBottom: 16,
  },
  modulesList: {
    maxWidth: 780,
    alignSelf: 'center',
    width: '100%',
    gap: 14,
    paddingBottom: 40,
  },
  modCard: {
    padding: 18,
  },
  modTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  modIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  modDuration: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  modDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  quizBox: {
    padding: 14,
    marginTop: 10,
  },
  quizQ: {
    fontSize: 13,
    fontWeight: '700',
  },
  optionBtn: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
});

export const Flow10LearnScreen: React.FC = observer(Flow10LearnScreenUnwrapped);
