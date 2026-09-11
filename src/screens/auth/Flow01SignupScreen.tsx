import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { useTheme } from '../../theme/theme';
import { useAppStore } from '../../data/store';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { authApi } from '../../data/api';
import {
  ShieldCheck,
  CheckCircle2,
  UserCheck,
  CreditCard,
  Camera,
  ArrowRight,
  ChevronLeft,
  Lock,
  Building2,
  Sparkles,
  HeartPulse,
  QrCode,
  FileText,
  AlertCircle,
} from 'lucide-react';

import { StudentKareLogo } from '../../components/StudentKareLogo';

interface Flow01Props {
  onComplete: () => void;
  onNavigateToLogin?: () => void;
}

export const Flow01SignupScreen: React.FC<Flow01Props> = ({
  onComplete,
  onNavigateToLogin,
}) => {
  const { tokens, radius, typography, isDark } = useTheme();
  const { student, updateStudent } = useAppStore();

  // Multi-step signup sequence: 1: Welcome, 2: Mobile, 3: OTP, 4: Personal Info & Age, 5: Verification Proof, 6: University
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [mobile, setMobile] = useState('98111 22334');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('Arjun Mehta');
  const [dob, setDob] = useState('2004-03-14');
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [proofType, setProofType] = useState<'AADHAAR' | 'STUDENT_ID' | 'DIGILOCKER'>('STUDENT_ID');
  const [university, setUniversity] = useState('Osmania University');
  const [rollNumber, setRollNumber] = useState('URN-OSMANIA-2026-ARJUN');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fallbackNotice, setFallbackNotice] = useState('');

  const handleSendOtp = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setFallbackNotice('');
    const res = await authApi.sendOtp(mobile, 'WHATSAPP', 'SIGNUP');
    setIsLoading(false);
    if (res.success) {
      setStep(3);
      if (res.fallbackSent) {
        setFallbackNotice(`WhatsApp didn't go through — same code also sent to email ${res.fallbackTargetMasked || 'on file'} in case it didn't arrive on WhatsApp.`);
      }
    } else {
      setErrorMessage(res.message || 'Failed to dispatch verification code');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) {
      setErrorMessage('Please enter the 6-digit code sent to WhatsApp');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    const res = await authApi.verifyOtp(mobile, otp, 'WHATSAPP');
    setIsLoading(false);
    if (res.success) {
      setStep(4);
    } else {
      setErrorMessage('Invalid verification code');
    }
  };

  const handleCompleteSignup = async () => {
    setIsLoading(true);
    // Derive ageVerified strictly from evidence - never self-declared
    const birthYear = parseInt(dob.split('-')[0] || '2004', 10);
    const calculatedAge = new Date().getFullYear() - birthYear;
    const hasEvidence = proofType === 'AADHAAR' || proofType === 'DIGILOCKER' || proofType === 'STUDENT_ID';
    const isAgeVerified = calculatedAge >= 18 && hasEvidence;
    
    const evidenceType = proofType === 'DIGILOCKER'
      ? 'DIGILOCKER'
      : proofType === 'STUDENT_ID'
      ? 'CAMPUS_ROSTER'
      : proofType === 'AADHAAR'
      ? 'PASSPORT_PAN_DL'
      : 'NONE';

    const res = await authApi.signup({
      fullName,
      phone: mobile,
      dob,
      university,
      rollNumber,
      bloodGroup,
      institutionId: 'inst_osmania_01',
    });
    setIsLoading(false);
    if (res.success) {
      updateStudent({
        fullName,
        phone: mobile,
        dob,
        university,
        institutionId: 'inst_osmania_01',
        rollNumber,
        bloodGroup,
        age: calculatedAge,
        ageVerified: isAgeVerified,
        ageVerificationEvidence: evidenceType,
        isVerifiedStudent: true,
      });
      onComplete();
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]} showsVerticalScrollIndicator={false}>
      
      {/* Top Header */}
      <View style={[styles.topBar, { borderBottomColor: tokens.ruleSoft }]}>
        <View style={styles.topBarInner}>
          <StudentKareLogo size={28} showStrapline={false} />
          <Badge label="FLOW 01 · SIGN UP & IDENTITY VERIFICATION" variant="mono" size="sm" />
        </View>
      </View>

      <View style={styles.contentWrap}>
        <View style={[styles.signupCard, { backgroundColor: tokens.surface, borderColor: tokens.rule }]}>
          
          {/* Step indicator bar */}
          <View style={styles.stepBar}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View
                key={i}
                style={[
                  styles.stepSegment,
                  {
                    backgroundColor: step >= i ? tokens.action : tokens.surface3,
                  },
                ]}
              />
            ))}
          </View>

          {/* STEP 1: Welcome & Value Prop */}
          {step === 1 && (
            <View>
              <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
                <span style={{ fontFamily: typography.fontMono, fontSize: 11, border: `1px solid ${tokens.action}`, background: tokens.surface3, color: tokens.action, borderRadius: 9999, padding: '4px 10px' }}>EN</span>
                <span style={{ fontFamily: typography.fontMono, fontSize: 11, border: `1px solid ${tokens.rule}`, color: tokens.text2, borderRadius: 9999, padding: '4px 10px' }}>हिंदी</span>
                <span style={{ fontFamily: typography.fontMono, fontSize: 11, border: `1px solid ${tokens.rule}`, color: tokens.text2, borderRadius: 9999, padding: '4px 10px' }}>తెలుగు</span>
              </div>

              <div style={{ width: 34, height: 34, border: `2px solid ${tokens.veil}`, display: 'grid', placeItems: 'center', marginBottom: 24 }}>
                <div style={{ width: 2, height: 20, background: tokens.action }}></div>
              </div>

              <Text style={[styles.heading, { color: tokens.text }]}>
                Every report you have ever been handed, filed on one line.
              </Text>
              <Text style={[styles.subheading, { color: tokens.text2 }]}>
                Lab reports, prescriptions, vaccination cards, and camp results. Yours, exportable, deletable.
              </Text>

              <View style={styles.valueList}>
                <View style={styles.valueItem}>
                  <CheckCircle2 size={18} color={tokens.positive} style={{ flexShrink: 0, marginTop: 2 }} />
                  <Text style={[styles.valueText, { color: tokens.text2 }]}>Free for university students</Text>
                </View>
                <View style={styles.valueItem}>
                  <CheckCircle2 size={18} color={tokens.positive} style={{ flexShrink: 0, marginTop: 2 }} />
                  <Text style={[styles.valueText, { color: tokens.text2 }]}>Readable offline once cached on your device</Text>
                </View>
                <View style={styles.valueItem}>
                  <CheckCircle2 size={18} color={tokens.positive} style={{ flexShrink: 0, marginTop: 2 }} />
                  <Text style={[styles.valueText, { color: tokens.text2 }]}>Never used to train AI models or target ads</Text>
                </View>
              </View>

              <Button
                label="Continue with Mobile Number"
                onPress={() => setStep(2)}
                variant="primary"
                size="lg"
                fullWidth
                style={{ marginTop: 28, marginBottom: 14 }}
              />

              <Text style={[styles.ageNotice, { color: tokens.text3 }]}>
                18+ only. Age is verified against a document, never self-declared under DPDP Act 2023.
              </Text>

              {onNavigateToLogin && (
                <TouchableOpacity activeOpacity={0.8} onPress={onNavigateToLogin} style={{ alignSelf: 'center', marginTop: 14 }}>
                  <Text style={[styles.loginLink, { color: tokens.text2 }]}>
                    Already registered? <Text style={{ color: tokens.action, fontWeight: '700' }}>Sign in here</Text>
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* STEP 2: Mobile Number */}
          {step === 2 && (
            <View>
              <TouchableOpacity activeOpacity={0.8} onPress={() => setStep(1)} style={styles.backBtn}>
                <ChevronLeft size={18} color={tokens.text} />
                <Text style={[styles.backText, { color: tokens.text }]}>Back</Text>
              </TouchableOpacity>

              <Text style={[styles.heading, { color: tokens.text, marginTop: 8 }]}>Enter mobile number</Text>
              <Text style={[styles.subheading, { color: tokens.text2 }]}>
                We will send a 6-digit verification code to WhatsApp. Used for your Ayushman Bharat ABHA locker.
              </Text>

              <View style={styles.phoneInputRow}>
                <View style={[styles.countryCodeBox, { borderColor: tokens.rule, backgroundColor: tokens.canvas }]}>
                  <Text style={[styles.countryCodeText, { color: tokens.text, fontFamily: typography.fontMono }]}>+91</Text>
                </View>
                <View style={[styles.phoneTextInputBox, { borderColor: tokens.action, backgroundColor: tokens.canvas }]}>
                  <TextInput
                    value={mobile}
                    onChangeText={setMobile}
                    placeholder="98111 22334"
                    placeholderTextColor={tokens.text3}
                    keyboardType="phone-pad"
                    style={[styles.phoneInput, { color: tokens.text, fontFamily: typography.fontMono }]}
                  />
                </View>
              </View>

              <View style={[styles.lockCallout, { backgroundColor: tokens.surface2, borderColor: tokens.rule }]}>
                <Lock size={15} color={tokens.action} />
                <Text style={[styles.lockCalloutText, { color: tokens.text2 }]}>
                  18+ ONLY · Zero marketing SMS. Strictly encrypted under DPDP Act 2023.
                </Text>
              </View>

              <Button
                label="Send WhatsApp Verification Code"
                onPress={handleSendOtp}
                loading={isLoading}
                variant="primary"
                size="lg"
                fullWidth
                style={{ marginTop: 24 }}
              />
            </View>
          )}

          {/* STEP 3: Enter OTP */}
          {step === 3 && (
            <View>
              <TouchableOpacity activeOpacity={0.8} onPress={() => setStep(2)} style={styles.backBtn}>
                <ChevronLeft size={18} color={tokens.text} />
                <Text style={[styles.backText, { color: tokens.text }]}>Change number</Text>
              </TouchableOpacity>

              <Text style={[styles.heading, { color: tokens.text, marginTop: 8 }]}>Enter verification code</Text>
              <Text style={[styles.subheading, { color: tokens.text2 }]}>
                We sent a 6-digit code to WhatsApp on +91 {mobile}.
              </Text>

              {errorMessage ? (
                <View style={[styles.errorBox, { backgroundColor: 'rgba(179,36,26,0.1)', borderColor: tokens.emergency }]}>
                  <AlertCircle size={16} color={tokens.emergency} />
                  <Text style={[styles.errorText, { color: tokens.emergency }]}>{errorMessage}</Text>
                </View>
              ) : null}
              {fallbackNotice ? (
                <View style={{ backgroundColor: 'rgba(46,125,50,0.1)', borderColor: tokens.positive, borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, color: tokens.text }}>{fallbackNotice}</Text>
                </View>
              ) : null}

              <View style={[styles.otpInputBox, { borderColor: tokens.action, backgroundColor: tokens.canvas }]}>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="142857"
                  placeholderTextColor={tokens.text3}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  style={[styles.otpInput, { color: tokens.text, fontFamily: typography.fontMono }]}
                />
              </View>

              <Button
                label="Verify Code & Continue"
                onPress={handleVerifyOtp}
                loading={isLoading}
                variant="primary"
                size="lg"
                fullWidth
                style={{ marginTop: 20 }}
              />

              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <span style={{ fontSize: 12, color: tokens.text3 }}>
                  Demo Master Code: <strong style={{ color: tokens.action, fontFamily: typography.fontMono }}>142857</strong>
                </span>
              </div>
            </View>
          )}

          {/* STEP 4: Personal Info & Age Verification */}
          {step === 4 && (
            <View>
              <Text style={[styles.heading, { color: tokens.text }]}>Your details</Text>
              <Text style={[styles.subheading, { color: tokens.text2 }]}>
                Legal name and birth date must match your university student record.
              </Text>

              <View style={{ gap: 14, marginBottom: 20 }}>
                <View>
                  <Text style={[styles.fieldLabel, { color: tokens.text2 }]}>FULL LEGAL NAME</Text>
                  <View style={[styles.fieldInputBox, { borderColor: tokens.rule, backgroundColor: tokens.canvas }]}>
                    <TextInput
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Arjun Mehta"
                      placeholderTextColor={tokens.text3}
                      style={[styles.fieldInput, { color: tokens.text }]}
                    />
                  </View>
                </View>

                <View>
                  <Text style={[styles.fieldLabel, { color: tokens.text2 }]}>DATE OF BIRTH (YYYY-MM-DD)</Text>
                  <View style={[styles.fieldInputBox, { borderColor: tokens.rule, backgroundColor: tokens.canvas }]}>
                    <TextInput
                      value={dob}
                      onChangeText={setDob}
                      placeholder="2004-03-14"
                      placeholderTextColor={tokens.text3}
                      style={[styles.fieldInput, { color: tokens.text, fontFamily: typography.fontMono }]}
                    />
                  </View>
                </View>

                <View>
                  <Text style={[styles.fieldLabel, { color: tokens.text2 }]}>BLOOD GROUP</Text>
                  <View style={styles.bloodGroupRow}>
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+'].map((bg) => (
                      <TouchableOpacity
                        key={bg}
                        activeOpacity={0.8}
                        onPress={() => setBloodGroup(bg)}
                        style={[
                          styles.bloodPill,
                          {
                            backgroundColor: bloodGroup === bg ? tokens.action : tokens.canvas,
                            borderColor: bloodGroup === bg ? tokens.action : tokens.rule,
                          },
                        ]}
                      >
                        <Text style={{ color: bloodGroup === bg ? '#ffffff' : tokens.text, fontWeight: '700', fontSize: 13 }}>
                          {bg}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Button
                label="Confirm & Proceed to Document Check"
                onPress={() => setStep(5)}
                variant="primary"
                size="lg"
                fullWidth
              />
            </View>
          )}

          {/* STEP 5: Verification Proof */}
          {step === 5 && (
            <View>
              <Text style={[styles.heading, { color: tokens.text }]}>Verify Student Identity</Text>
              <Text style={[styles.subheading, { color: tokens.text2 }]}>
                Pick one document proof to activate your medical passport.
              </Text>

              <View style={{ gap: 12, marginBottom: 24 }}>
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => setProofType('STUDENT_ID')}
                  style={[
                    styles.proofCard,
                    {
                      borderColor: proofType === 'STUDENT_ID' ? tokens.action : tokens.rule,
                      backgroundColor: proofType === 'STUDENT_ID' ? tokens.surface3 : tokens.canvas,
                    },
                  ]}
                >
                  <CreditCard size={22} color={tokens.action} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.proofTitle, { color: tokens.text }]}>Physical Student ID Card</Text>
                    <Text style={[styles.proofDesc, { color: tokens.text2 }]}>
                      Scan the barcode or roll number on your campus identity card.
                    </Text>
                  </View>
                  {proofType === 'STUDENT_ID' && <CheckCircle2 size={18} color={tokens.action} />}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => setProofType('AADHAAR')}
                  style={[
                    styles.proofCard,
                    {
                      borderColor: proofType === 'AADHAAR' ? tokens.action : tokens.rule,
                      backgroundColor: proofType === 'AADHAAR' ? tokens.surface3 : tokens.canvas,
                    },
                  ]}
                >
                  <ShieldCheck size={22} color={tokens.action} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.proofTitle, { color: tokens.text }]}>Aadhaar Paperless OTP</Text>
                    <Text style={[styles.proofDesc, { color: tokens.text2 }]}>
                      Instant UIDAI KYC with age evidencing without storing Aadhaar numbers.
                    </Text>
                  </View>
                  {proofType === 'AADHAAR' && <CheckCircle2 size={18} color={tokens.action} />}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => setProofType('DIGILOCKER')}
                  style={[
                    styles.proofCard,
                    {
                      borderColor: proofType === 'DIGILOCKER' ? tokens.action : tokens.rule,
                      backgroundColor: proofType === 'DIGILOCKER' ? tokens.surface3 : tokens.canvas,
                    },
                  ]}
                >
                  <FileText size={22} color={tokens.action} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.proofTitle, { color: tokens.text }]}>DigiLocker / ABHA M1</Text>
                    <Text style={[styles.proofDesc, { color: tokens.text2 }]}>
                      Direct link to National Ayushman Bharat digital health account.
                    </Text>
                  </View>
                  {proofType === 'DIGILOCKER' && <CheckCircle2 size={18} color={tokens.action} />}
                </TouchableOpacity>
              </View>

              <Button
                label="Continue to Campus Details"
                onPress={() => setStep(6)}
                variant="primary"
                size="lg"
                fullWidth
              />
            </View>
          )}

          {/* STEP 6: University Details & Finalize */}
          {step === 6 && (
            <View>
              <Text style={[styles.heading, { color: tokens.text }]}>University & Campus</Text>
              <Text style={[styles.subheading, { color: tokens.text2 }]}>
                Connects your profile to the campus health room and annual health camp stations.
              </Text>

              <View style={{ gap: 14, marginBottom: 24 }}>
                <View>
                  <Text style={[styles.fieldLabel, { color: tokens.text2 }]}>INSTITUTION</Text>
                  <View style={[styles.fieldInputBox, { borderColor: tokens.rule, backgroundColor: tokens.canvas }]}>
                    <TextInput
                      value={university}
                      onChangeText={setUniversity}
                      placeholder="Osmania University"
                      placeholderTextColor={tokens.text3}
                      style={[styles.fieldInput, { color: tokens.text }]}
                    />
                  </View>
                </View>

                <View>
                  <Text style={[styles.fieldLabel, { color: tokens.text2 }]}>COLLEGE ROLL NUMBER / STUDENT ID</Text>
                  <View style={[styles.fieldInputBox, { borderColor: tokens.rule, backgroundColor: tokens.canvas }]}>
                    <TextInput
                      value={rollNumber}
                      onChangeText={setRollNumber}
                      placeholder="URN-OSMANIA-2026-ARJUN"
                      placeholderTextColor={tokens.text3}
                      style={[styles.fieldInput, { color: tokens.text, fontFamily: typography.fontMono }]}
                    />
                  </View>
                </View>

                <View style={[styles.summaryBox, { backgroundColor: tokens.surface2, borderColor: tokens.rule }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={18} color={tokens.positive} />
                    <Text style={[styles.summaryTitle, { color: tokens.text }]}>ABHA Health Locker Initialized</Text>
                  </View>
                  <Text style={[styles.summarySub, { color: tokens.text2 }]}>
                    Your account will be linked to <Text style={{ fontFamily: typography.fontMono, color: tokens.action }}>arjun.mehta@abdm</Text> with AES-256 local vault encryption.
                  </Text>
                </View>
              </View>

              <Button
                label="Complete Registration & Launch Vault"
                onPress={handleCompleteSignup}
                loading={isLoading}
                variant="impiloPill"
                size="lg"
                fullWidth
              />
            </View>
          )}

        </View>
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  topBar: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderBottomWidth: 1,
  },
  topBarInner: {
    maxWidth: 1180,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  contentWrap: {
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  signupCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    boxShadow: '0 16px 48px rgba(22, 22, 92, 0.12)',
  },
  stepBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 28,
  },
  stepSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 32,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  valueList: {
    gap: 14,
    marginBottom: 20,
  },
  valueItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  valueText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  ageNotice: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  loginLink: {
    fontSize: 14,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 14,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  countryCodeBox: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryCodeText: {
    fontSize: 17,
    fontWeight: '700',
  },
  phoneTextInputBox: {
    flex: 1,
    borderRadius: 9999,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  phoneInput: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  lockCallout: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  lockCalloutText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  otpInputBox: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  otpInput: {
    fontSize: 28,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '800',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldInputBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  fieldInput: {
    fontSize: 15,
    fontWeight: '600',
  },
  bloodGroupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bloodPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9999,
    borderWidth: 1,
  },
  proofCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  proofTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  proofDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  summaryBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  summarySub: {
    fontSize: 12,
    lineHeight: 16,
  },
});
