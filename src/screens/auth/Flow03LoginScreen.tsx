import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useTheme } from '../../theme/theme';
import { useAppStore } from '../../data/store';
import { Button } from '../../components/Button';
import { authApi, twoFactorApi } from '../../data/api';
import {
  Smartphone,
  Mail,
  Fingerprint,
  CheckCircle2,
  ChevronLeft,
  MessageCircle,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

import { AuthLayout } from '../../components/interface/AuthLayout';
import { PageTransition } from '../../components/interface/PageTransition';
import { mockStudents } from '../../data/mockData';

interface Flow03Props {
  onLoginSuccess: () => void;
  onNavigateToSignup?: () => void;
}

export const Flow03LoginScreen: React.FC<Flow03Props> = ({
  onLoginSuccess,
  onNavigateToSignup,
}) => {
  const { tokens, typography } = useTheme();
  const { updateStudent } = useAppStore();

  // Mode: 'PHONE' | 'EMAIL'
  const [authMode, setAuthMode] = useState<'PHONE' | 'EMAIL'>('PHONE');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Input, 2: Destination Select, 3: OTP Code, 4: 2FA
  const [pendingTempToken, setPendingTempToken] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [fallbackNotice, setFallbackNotice] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('98765 43210');
  const [emailAddress, setEmailAddress] = useState('arjun.m@osmania.ac.in');
  const [selectedChannel, setSelectedChannel] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(45);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let timer: any;
    if ((step === 3 || step === 4) && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const handleQuickMockLogin = (mockUser: typeof mockStudents[0]) => {
    updateStudent(mockUser);
    onLoginSuccess();
  };

  const handleSendCode = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setFallbackNotice('');
    const target = authMode === 'PHONE' ? phoneNumber : emailAddress;
    // WhatsApp primary: pass email as auto-fallback if WhatsApp dispatch fails
    const fallback = selectedChannel === 'WHATSAPP' && emailAddress.includes('@') ? emailAddress : undefined;
    const res = await authApi.sendOtp(target, selectedChannel, 'LOGIN', fallback);
    setIsLoading(false);
    if (res.success) {
      setStep(3);
      setCountdown(45);
      setCanResend(false);
      if (res.fallbackSent) {
        setFallbackNotice(`WhatsApp didn't go through — same code also sent to email ${res.fallbackTargetMasked || 'on file'} in case it didn't arrive on WhatsApp.`);
      }
    } else {
      setErrorMessage(res.message || 'Failed to dispatch code');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 4) {
      setErrorMessage('Please enter the 6-digit verification code');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    const target = authMode === 'PHONE' ? phoneNumber : emailAddress;
    const res = await authApi.verifyOtp(target, otpCode, selectedChannel);
    setIsLoading(false);
    if (res.success) {
      // Persist JWT for SuperAdmin integrations calls
      try {
        if (res.token) localStorage.setItem('sk_token', res.token);
      } catch { /* noop */ }
      if (res.requires2FA && res.tempToken) {
        setPendingTempToken(res.tempToken);
        setStep(4);
        return;
      }
      if (res.user) {
        updateStudent(res.user);
      }
      onLoginSuccess();
    } else {
      setErrorMessage(res.message || 'Invalid verification code. Please check your WhatsApp or email.');
    }
  };

  const handleVerify2FA = async () => {
    if (!twoFaCode || twoFaCode.length !== 6) {
      setErrorMessage('Enter the 6-digit code from your authenticator app');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    const res = await twoFactorApi.challenge(pendingTempToken, twoFaCode);
    setIsLoading(false);
    if (res.success) {
      try {
        if (res.token) localStorage.setItem('sk_token', res.token);
      } catch { /* noop */ }
      if (res.user) updateStudent(res.user);
      onLoginSuccess();
    } else {
      setErrorMessage(res.message || 'Invalid authenticator code');
    }
  };

  const handleResendOtherChannel = async () => {
    setIsLoading(true);
    setErrorMessage('');
    const other: 'WHATSAPP' | 'EMAIL' = selectedChannel === 'WHATSAPP' ? 'EMAIL' : 'WHATSAPP';
    const target = other === 'EMAIL' ? emailAddress : phoneNumber;
    const fallback = other === 'WHATSAPP' && emailAddress.includes('@') ? emailAddress : undefined;
    const res = await authApi.sendOtp(target, other, 'LOGIN', fallback);
    setIsLoading(false);
    if (res.success) {
      setSelectedChannel(other);
      if (other === 'EMAIL') setAuthMode('EMAIL');
      setCountdown(45);
      setCanResend(false);
      if (res.fallbackSent) {
        setFallbackNotice(`WhatsApp didn't go through — same code also sent to email ${res.fallbackTargetMasked || 'on file'} in case it didn't arrive on WhatsApp.`);
      } else {
        setFallbackNotice('');
      }
    } else {
      setErrorMessage(res.message || 'Failed to resend code');
    }
  };

  return (
    <AuthLayout mode="login" step={step}>
      <View style={styles.contentWrap}>
        <View dataSet={{ ui: 'auth-card' }} style={[styles.loginCard, { backgroundColor: tokens.surface, borderColor: tokens.rule }]}>
          {errorMessage && <div className="care-form-error" role="alert"><AlertCircle size={16} />{errorMessage}</div>}
          <PageTransition key={step}>
          
          {/* STEP 1: Phone or Email Entry */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <div className="care-auth-step-mark"><Smartphone size={23} /></div>

              <Text accessibilityRole="header" style={[styles.heading, { color: tokens.text }]}>Welcome back</Text>
              <Text style={[styles.subheading, { color: tokens.text2 }]}>
                Use the phone number or email you registered with.
              </Text>

              {/* Quick Demo Mock Users Section */}
              <details className="care-demo-logins"><summary>Explore sample student accounts <span>DEMO</span></summary>
              <div
                style={{
                  margin: '16px 0 20px',
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: tokens.surface2,
                  border: `1px solid ${tokens.ruleSoft}`,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: tokens.action,
                    fontFamily: typography.fontMono,
                    marginBottom: 10,
                    letterSpacing: 0.5,
                  }}
                >
                  ⚡ 1-CLICK DEMO MOCK USER LOGINS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {mockStudents.map((stu) => (
                    <button
                      key={stu.id}
                      onClick={() => handleQuickMockLogin(stu)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 10,
                        backgroundColor: tokens.surface,
                        border: `1.5px solid ${tokens.rule}`,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 180ms ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: tokens.action,
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: 13,
                            display: 'grid',
                            placeItems: 'center',
                          }}
                        >
                          {stu.fullName.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: tokens.text }}>
                            {stu.fullName}
                          </div>
                          <div style={{ fontSize: 11, color: tokens.text2, fontFamily: typography.fontMono }}>
                            {stu.university} · {stu.bloodGroup}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: tokens.action,
                          backgroundColor: tokens.surface3,
                          padding: '4px 10px',
                          borderRadius: 9999,
                        }}
                      >
                        Sign In →
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode Switcher Tabs */}
              </details>
              <View style={[styles.modeTabs, { backgroundColor: tokens.surface3 }]}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setAuthMode('PHONE')}
                  accessibilityRole="button"
                  aria-pressed={authMode === 'PHONE'}
                  style={[
                    styles.modeTabBtn,
                    authMode === 'PHONE' && { backgroundColor: tokens.canvas, borderColor: tokens.rule },
                  ]}
                >
                  <Smartphone size={15} color={authMode === 'PHONE' ? tokens.action : tokens.text2} />
                  <Text style={[styles.modeTabText, { color: authMode === 'PHONE' ? tokens.action : tokens.text2 }]}>
                    Phone
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setAuthMode('EMAIL')}
                  accessibilityRole="button"
                  aria-pressed={authMode === 'EMAIL'}
                  style={[
                    styles.modeTabBtn,
                    authMode === 'EMAIL' && { backgroundColor: tokens.canvas, borderColor: tokens.rule },
                  ]}
                >
                  <Mail size={15} color={authMode === 'EMAIL' ? tokens.action : tokens.text2} />
                  <Text style={[styles.modeTabText, { color: authMode === 'EMAIL' ? tokens.action : tokens.text2 }]}>
                    Email
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Phone Input */}
              {authMode === 'PHONE' ? (
                <View style={styles.inputGroup}>
                  <View style={styles.phoneInputRow}>
                    <View style={[styles.countryCodeBox, { borderColor: tokens.rule, backgroundColor: tokens.canvas }]}>
                      <Text style={[styles.countryCodeText, { color: tokens.text, fontFamily: typography.fontMono }]}>+91</Text>
                    </View>
                    <View style={[styles.phoneTextInputBox, { borderColor: tokens.action, backgroundColor: tokens.canvas }]}>
                      <TextInput
                        accessibilityLabel="Phone number"
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        placeholder="98765 43210"
                        placeholderTextColor={tokens.text3}
                        keyboardType="phone-pad"
                        style={[styles.phoneInput, { color: tokens.text, fontFamily: typography.fontMono }]}
                      />
                    </View>
                  </View>
                  <Text style={[styles.inputHint, { color: tokens.text3 }]}>
                    We send a 6-digit code to WhatsApp or email. No SMS.
                  </Text>
                </View>
              ) : (
                <View style={styles.inputGroup}>
                  <View style={[styles.emailInputBox, { borderColor: tokens.action, backgroundColor: tokens.canvas }]}>
                    <TextInput
                      accessibilityLabel="Email address"
                      value={emailAddress}
                      onChangeText={setEmailAddress}
                      placeholder="arjun.m@osmania.ac.in"
                      placeholderTextColor={tokens.text3}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={[styles.emailInput, { color: tokens.text }]}
                    />
                  </View>
                  <Text style={[styles.inputHint, { color: tokens.text3 }]}>
                    The code goes to this inbox. Check spam if it is not there in a minute.
                  </Text>
                </View>
              )}

              {/* Info Note */}
              <View style={[styles.channelNotice, { borderColor: tokens.rule, backgroundColor: tokens.surface2 }]}>
                <MessageCircle size={18} color={tokens.action} style={{ flexShrink: 0, marginTop: 2 }} />
                <Text style={[styles.channelNoticeText, { color: tokens.text2 }]}>
                  Codes arrive on WhatsApp within a few seconds. If this number is not on WhatsApp, we will offer email instead.
                </Text>
              </View>

              <Button
                label="Continue"
                onPress={() => setStep(2)}
                variant="primary"
                size="lg"
                fullWidth
                style={{ marginTop: 24, marginBottom: 16 }}
              />

              {onNavigateToSignup && (
                <TouchableOpacity activeOpacity={0.8} onPress={onNavigateToSignup} style={{ alignSelf: 'center' }}>
                  <Text style={[styles.signupLinkText, { color: tokens.text2 }]}>
                    New here? <Text style={{ color: tokens.action, fontWeight: '700' }}>Create an account</Text>
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* STEP 2: Channel Picker ("Where should we send the code?") */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => setStep(1)} style={styles.backBtn}>
                <ChevronLeft size={18} color={tokens.text} />
                <Text style={[styles.backText, { color: tokens.text }]}>Back</Text>
              </TouchableOpacity>

              <Text accessibilityRole="header" style={[styles.heading, { color: tokens.text, marginTop: 8 }]}>Where should we send the code?</Text>
              <Text style={[styles.subheading, { color: tokens.text2 }]}>
                Both are on your verified account. Pick whichever you can open right now.
              </Text>

              {/* Destination Options */}
              <View style={styles.destinationList}>
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => setSelectedChannel('WHATSAPP')}
                  style={[
                    styles.destinationOption,
                    {
                      borderColor: selectedChannel === 'WHATSAPP' ? tokens.action : tokens.rule,
                      backgroundColor: selectedChannel === 'WHATSAPP' ? tokens.surface3 : tokens.canvas,
                    },
                  ]}
                >
                  <View style={[styles.destIconTile, { backgroundColor: tokens.surface }]}>
                    <MessageCircle size={22} color={tokens.action} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.destTitle, { color: tokens.text }]}>WhatsApp</Text>
                    <Text style={[styles.destTarget, { color: tokens.text2, fontFamily: typography.fontMono }]}>
                      +91 98••• •3210
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.destCheckCircle,
                      {
                        backgroundColor: selectedChannel === 'WHATSAPP' ? tokens.action : 'transparent',
                        borderColor: selectedChannel === 'WHATSAPP' ? tokens.action : tokens.rule,
                      },
                    ]}
                  >
                    {selectedChannel === 'WHATSAPP' && <CheckCircle2 size={16} color="#ffffff" />}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => setSelectedChannel('EMAIL')}
                  style={[
                    styles.destinationOption,
                    {
                      borderColor: selectedChannel === 'EMAIL' ? tokens.action : tokens.rule,
                      backgroundColor: selectedChannel === 'EMAIL' ? tokens.surface3 : tokens.canvas,
                    },
                  ]}
                >
                  <View style={[styles.destIconTile, { backgroundColor: tokens.surface }]}>
                    <Mail size={22} color={tokens.action} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.destTitle, { color: tokens.text }]}>Email</Text>
                    <Text style={[styles.destTarget, { color: tokens.text2, fontFamily: typography.fontMono }]}>
                      a•••••m@osmania.ac.in
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.destCheckCircle,
                      {
                        backgroundColor: selectedChannel === 'EMAIL' ? tokens.action : 'transparent',
                        borderColor: selectedChannel === 'EMAIL' ? tokens.action : tokens.rule,
                      },
                    ]}
                  >
                    {selectedChannel === 'EMAIL' && <CheckCircle2 size={16} color="#ffffff" />}
                  </View>
                </TouchableOpacity>
              </View>

              {/* Fastpass passkey option */}
              <View style={[styles.passkeyCallout, { borderColor: tokens.veil, backgroundColor: tokens.surface2 }]}>
                <Fingerprint size={20} color={tokens.action} style={{ flexShrink: 0, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.passkeyCalloutTitle, { color: tokens.text }]}>Or use device Touch ID / Face ID</Text>
                  <Text style={[styles.passkeyCalloutSub, { color: tokens.text2 }]}>
                    Unlock your health vault with biometric passkey without waiting for codes.
                  </Text>
                </View>
              </View>

              <Button
                label={`Send Code to ${selectedChannel === 'WHATSAPP' ? 'WhatsApp' : 'Email'}`}
                onPress={handleSendCode}
                loading={isLoading}
                variant="primary"
                size="lg"
                fullWidth
                style={{ marginTop: 24 }}
              />
            </View>
          )}

          {/* STEP 3: Enter 6-Digit OTP */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => setStep(2)} style={styles.backBtn}>
                <ChevronLeft size={18} color={tokens.text} />
                <Text style={[styles.backText, { color: tokens.text }]}>Change destination</Text>
              </TouchableOpacity>

              <Text accessibilityRole="header" style={[styles.heading, { color: tokens.text, marginTop: 8 }]}>Enter the 6-digit code</Text>
              <Text style={[styles.subheading, { color: tokens.text2 }]}>
                Sent to {selectedChannel === 'WHATSAPP' ? 'WhatsApp (+91 98••• •3210)' : 'arjun.m@osmania.ac.in'}.
              </Text>

              {fallbackNotice ? (
                <View style={{ backgroundColor: 'rgba(46,125,50,0.1)', borderColor: tokens.positive, borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={16} color={tokens.positive} />
                  <Text style={{ fontSize: 12, color: tokens.text, flex: 1 }}>{fallbackNotice}</Text>
                </View>
              ) : null}
              {/* OTP Input Box */}
              <View style={[styles.otpInputBox, { borderColor: tokens.action, backgroundColor: tokens.canvas }]}>
                <TextInput
                  accessibilityLabel="Verification code"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  placeholder="142857"
                  placeholderTextColor={tokens.text3}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  style={[styles.otpInput, { color: tokens.text, fontFamily: typography.fontMono }]}
                />
              </View>

              {/* Countdown & Resend */}
              <View style={styles.resendRow}>
                {canResend ? (
                  <TouchableOpacity activeOpacity={0.8} onPress={handleSendCode} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <RotateCcw size={15} color={tokens.action} />
                    <Text style={[styles.resendText, { color: tokens.action }]}>Resend 6-digit code</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.countdownText, { color: tokens.text3, fontFamily: typography.fontMono }]}>
                    Resend code in {countdown}s
                  </Text>
                )}
              </View>
              <TouchableOpacity activeOpacity={0.8} onPress={handleResendOtherChannel} style={{ marginTop: 8, alignSelf: 'center' }}>
                <Text style={{ fontSize: 12, color: tokens.action, fontWeight: 700 }}>
                  Didn't get it? Resend via {selectedChannel === 'WHATSAPP' ? 'Email (Postal)' : 'WhatsApp (OpenWA)'}
                </Text>
              </TouchableOpacity>

              <Button
                label="Verify Code & Open Vault"
                onPress={handleVerifyOtp}
                loading={isLoading}
                variant="impiloPill"
                size="lg"
                fullWidth
                style={{ marginTop: 20 }}
              />

              <div style={{ textAlign: 'center', marginTop: 18 }}>
                <span style={{ fontSize: 12, color: tokens.text3 }}>
                  Demo Master Code: <strong style={{ color: tokens.action, fontFamily: typography.fontMono }}>142857</strong>
                </span>
              </div>
            </View>
          )}
          {step === 4 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.heading, { color: tokens.text, marginTop: 8 }]}>Two-factor check</Text>
              <Text style={[styles.subheading, { color: tokens.text2 }]}>
                Open your authenticator app (Google Authenticator / Authy) and enter the 6-digit code.
              </Text>
              {errorMessage ? (
                <View style={[styles.errorBox, { backgroundColor: 'rgba(179,36,26,0.1)', borderColor: tokens.emergency }]}>
                  <AlertCircle size={16} color={tokens.emergency} />
                  <Text style={[styles.errorText, { color: tokens.emergency }]}>{errorMessage}</Text>
                </View>
              ) : null}
              <View style={[styles.otpInputBox, { borderColor: tokens.action, backgroundColor: tokens.canvas }]}>
                <TextInput
                  value={twoFaCode}
                  onChangeText={setTwoFaCode}
                  placeholder="123456"
                  placeholderTextColor={tokens.text3}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  style={[styles.otpInput, { color: tokens.text, fontFamily: typography.fontMono }]}
                />
              </View>
              <Button label="Verify 2FA & Sign In" onPress={handleVerify2FA} loading={isLoading} variant="impiloPill" size="lg" fullWidth style={{ marginTop: 20 }} />
            </View>
          )}

          </PageTransition>
        </View>
      </View>

    </AuthLayout>
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
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  loginCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 32,
    boxShadow: '0 12px 40px rgba(64, 42, 86, 0.05)',
  },
  stepContainer: {
    width: '100%',
  },
  heading: {
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 32,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  modeTabs: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  modeTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  countryCodeBox: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
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
    borderRadius: 10,
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
  emailInputBox: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  emailInput: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputHint: {
    fontSize: 12,
    marginTop: 4,
  },
  channelNotice: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 14,
  },
  channelNoticeText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  signupLinkText: {
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
  destinationList: {
    gap: 12,
    marginBottom: 20,
  },
  destinationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  destIconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  destTarget: {
    fontSize: 13,
    marginTop: 2,
  },
  destCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passkeyCallout: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  passkeyCalloutTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  passkeyCalloutSub: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
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
  resendRow: {
    alignItems: 'center',
    marginVertical: 10,
  },
  countdownText: {
    fontSize: 13,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
