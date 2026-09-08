import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useAppStore } from '../../data/store';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { Stethoscope, Home, HeartHandshake, CheckCircle2 } from 'lucide-react';

export const Flow07BookCareScreen: React.FC = () => {
  const { tokens, radius } = useTheme();
  const { createFabricOrder } = useAppStore();

  const [serviceType, setServiceType] = useState<'TELECONSULT' | 'HOME_LAB' | 'COUNSELLOR'>('TELECONSULT');
  ;
  const [pincode, setPincode] = useState('502285');
  const [bookingSuccessModal, setBookingSuccessModal] = useState<any>(null);

  const handleBookService = (title: string, cost: number, code: string) => {
    const order = createFabricOrder({
      serviceCategory: serviceType === 'HOME_LAB' ? 'DIAGNOSTICS' : serviceType === 'COUNSELLOR' ? 'COUNSELLOR' : 'TELECONSULT',
      serviceName: title,
      serviceCodeLoinc: code,
      pincode,
      providerCost: cost * 0.7,
      partnerPrice: cost,
    });
    setBookingSuccessModal(order);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]}>
      <View style={styles.headerBox}>
        <Badge label="FLOW 07 · CARE DELIVERY & TELECONSULT" variant="mono" />
        <Text style={[styles.title, { color: tokens.text }]}>Book Care & Diagnostics</Text>
        <Text style={[styles.sub, { color: tokens.text2 }]}>
          Instant doctor teleconsults, NABL-certified home blood collections, and confidential campus
          mental health counselling.
        </Text>

        {/* Category Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            onPress={() => setServiceType('TELECONSULT')}
            style={[
              styles.tabBtn,
              serviceType === 'TELECONSULT' && {
                backgroundColor: tokens.action,
                borderRadius: radius.md,
              },
            ]}
          >
            <Stethoscope size={16} color={serviceType === 'TELECONSULT' ? '#ffffff' : tokens.text2} />
            <Text
              style={[
                styles.tabText,
                { color: serviceType === 'TELECONSULT' ? '#ffffff' : tokens.text2 },
              ]}
            >
              Doctor Consult
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setServiceType('HOME_LAB')}
            style={[
              styles.tabBtn,
              serviceType === 'HOME_LAB' && {
                backgroundColor: tokens.action,
                borderRadius: radius.md,
              },
            ]}
          >
            <Home size={16} color={serviceType === 'HOME_LAB' ? '#ffffff' : tokens.text2} />
            <Text
              style={[
                styles.tabText,
                { color: serviceType === 'HOME_LAB' ? '#ffffff' : tokens.text2 },
              ]}
            >
              Home Lab Test
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setServiceType('COUNSELLOR')}
            style={[
              styles.tabBtn,
              serviceType === 'COUNSELLOR' && {
                backgroundColor: tokens.action,
                borderRadius: radius.md,
              },
            ]}
          >
            <HeartHandshake size={16} color={serviceType === 'COUNSELLOR' ? '#ffffff' : tokens.text2} />
            <Text
              style={[
                styles.tabText,
                { color: serviceType === 'COUNSELLOR' ? '#ffffff' : tokens.text2 },
              ]}
            >
              Mental Health
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardsGrid}>
        {serviceType === 'TELECONSULT' && (
          <>
            <Card variant="surface" style={styles.careCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.careTitle, { color: tokens.text }]}>
                    General Physician Video Consult
                  </Text>
                  <Text style={[styles.careMeta, { color: tokens.text2 }]}>
                    15 Min · Prescription Gated · NMC Licensed Doctors
                  </Text>
                </View>
                <Text style={[styles.priceTag, { color: tokens.action }]}>₹299</Text>
              </View>
              <Text style={[styles.careDesc, { color: tokens.text2 }]}>
                Ideal for seasonal flu, viral fever, allergies, skin rashes, and medication renewal.
              </Text>
              <Button
                label="Book Slot (Today 03:30 PM)"
                onPress={() => handleBookService('General Physician Teleconsult', 299, '99213')}
                style={{ marginTop: 14 }}
              />
            </Card>

            <Card variant="surface" style={styles.careCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.careTitle, { color: tokens.text }]}>
                    Dermatology & Skin Specialist
                  </Text>
                  <Text style={[styles.careMeta, { color: tokens.text2 }]}>
                    20 Min · Photo upload review included
                  </Text>
                </View>
                <Text style={[styles.priceTag, { color: tokens.action }]}>₹499</Text>
              </View>
              <Text style={[styles.careDesc, { color: tokens.text2 }]}>
                Expert dermatological care for acne, dermatitis, scalp conditions, and fungal infections.
              </Text>
              <Button
                label="Book Dermatology Consult"
                onPress={() => handleBookService('Dermatology Teleconsult', 499, '99214')}
                variant="secondary"
                style={{ marginTop: 14 }}
              />
            </Card>
          </>
        )}

        {serviceType === 'HOME_LAB' && (
          <>
            <Card variant="surface" style={styles.careCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.careTitle, { color: tokens.text }]}>
                    Complete Blood Count (CBC) with ESR
                  </Text>
                  <Text style={[styles.careMeta, { color: tokens.text2 }]}>
                    NABL Lab · Sample collection at campus hostel
                  </Text>
                </View>
                <Text style={[styles.priceTag, { color: tokens.action }]}>₹350</Text>
              </View>
              <Text style={[styles.careDesc, { color: tokens.text2 }]}>
                Covers Hb, TLC, DLC, Platelet count, RBC indices. Report in 6 hours directly in FHIR vault.
              </Text>
              <Input
                label="Hostel Delivery Pincode"
                value={pincode}
                onChangeText={setPincode}
                mono
              />
              <Button
                label="Book Home Phlebotomist (+50 pts)"
                onPress={() => handleBookService('Complete Blood Count (CBC) Home', 350, '58410-2')}
                style={{ marginTop: 10 }}
              />
            </Card>
          </>
        )}

        {serviceType === 'COUNSELLOR' && (
          <Card variant="surface" style={styles.careCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.careTitle, { color: tokens.text }]}>
                  Confidential Student Peer Counsellor
                </Text>
                <Text style={[styles.careMeta, { color: tokens.text2 }]}>
                  45 Min · Anonymous Room · 100% Free under Campus Care
                </Text>
              </View>
              <Badge label="100% FREE" variant="positive" />
            </View>
            <Text style={[styles.careDesc, { color: tokens.text2 }]}>
              Exam stress, relationship strain, anxiety, and sleep health. Absolute privacy
              guaranteed.
            </Text>
            <Button
              label="Schedule Confidential Session"
              onPress={() => handleBookService('Student Mental Health Counselling', 0, '96150')}
              variant="reward"
              style={{ marginTop: 14 }}
            />
          </Card>
        )}
      </View>

      {/* Booking Success Modal */}
      {bookingSuccessModal && (
        <Modal
          visible={!!bookingSuccessModal}
          onClose={() => setBookingSuccessModal(null)}
          title="Booking Confirmed!"
          subtitle={`Order ID: ${bookingSuccessModal.id}`}
        >
          <View style={{ alignItems: 'center', paddingVertical: 10, gap: 12 }}>
            <CheckCircle2 size={48} color={tokens.positive} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: tokens.text }}>
              {bookingSuccessModal.serviceName}
            </Text>
            <Text style={{ fontSize: 13, textAlign: 'center', color: tokens.text2 }}>
              Routed via Vertical C Health Services Fabric to {bookingSuccessModal.assignedProviderName}.
              You will receive SMS tracking on +91 98765 43210.
            </Text>
            <Button
              label="Done & View in Vault"
              onPress={() => setBookingSuccessModal(null)}
              style={{ width: '100%', marginTop: 8 }}
            />
          </View>
        </Modal>
      )}
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
    marginTop: 6,
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    marginBottom: 16,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 4,
    borderRadius: 10,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardsGrid: {
    maxWidth: 780,
    alignSelf: 'center',
    width: '100%',
    gap: 14,
    paddingBottom: 40,
  },
  careCard: {
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  careTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  careMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  priceTag: {
    fontSize: 18,
    fontWeight: '800',
  },
  careDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginVertical: 6,
  },
});
