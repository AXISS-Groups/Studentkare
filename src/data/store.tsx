import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  StudentProfile,
  HealthRecord,
  HealthCamp,
  FabricProvider,
  FabricOrder,
  ClaimAdjudication,
  ClinicianPatient,
  ChatMessage,
  LanguageCode,
  OrderState,
} from '../types';
import {
  initialStudent,
  initialRecords,
  initialCamp,
  initialFabricProviders,
  initialFabricOrders,
  initialClaimAdjudications,
  initialClinicianPatients,
} from './mockData';
import { processStudentCareMessage } from '../ai/careCopilot';

interface AppStoreContextType {
  student: StudentProfile;
  updateStudent: (updates: Partial<StudentProfile>) => void;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  records: HealthRecord[];
  addRecord: (record: HealthRecord) => void;
  deleteRecord: (id: string) => void;
  camp: HealthCamp;
  completeStation: (stationId: string, doctorNote?: string) => void;
  fabricProviders: FabricProvider[];
  fabricOrders: FabricOrder[];
  advanceOrderState: (orderId: string, nextState: OrderState) => void;
  createFabricOrder: (order: Partial<FabricOrder>) => FabricOrder;
  claimAdjudications: ClaimAdjudication[];
  signClaimAdjudication: (claimId: string, reviewerName: string) => void;
  dismissClaimAnomaly: (claimId: string, anomalyId: string, reason: string) => void;
  clinicianPatients: ClinicianPatient[];
  selectedPatientId: string;
  setSelectedPatientId: (id: string) => void;
  addClinicianNote: (patientId: string, noteTitle: string, noteText: string) => void;
  emergencyActive: boolean;
  triggerEmergency: () => void;
  cancelEmergency: () => void;
  chatMessages: ChatMessage[];
  sendStudentChatMessage: (text: string) => void;
  clearChat: () => void;
}

const AppStoreContext = createContext<AppStoreContextType | undefined>(undefined);

export const AppStoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [student, setStudent] = useState<StudentProfile>(initialStudent);
  const [language, setLanguage] = useState<LanguageCode>('EN');
  const [records, setRecords] = useState<HealthRecord[]>(initialRecords);
  const [camp, setCamp] = useState<HealthCamp>(initialCamp);
  const [fabricProviders, setFabricProviders] = useState<FabricProvider[]>(initialFabricProviders);
  const [fabricOrders, setFabricOrders] = useState<FabricOrder[]>(initialFabricOrders);
  const [claimAdjudications, setClaimAdjudications] = useState<ClaimAdjudication[]>(initialClaimAdjudications);
  const [clinicianPatients, setClinicianPatients] = useState<ClinicianPatient[]>(initialClinicianPatients);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('PAT-01');
  const [emergencyActive, setEmergencyActive] = useState<boolean>(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-0',
      sender: 'assistant',
      text: 'Hello Rohit! I am your AI Health Assistant. How can I support your health and records today?',
      timestamp: '09:00 AM',
      constitutionRuleRef: 'Rule-A: Non-prescriptive Guidance',
    },
  ]);

  const updateStudent = (updates: Partial<StudentProfile>) => {
    setStudent((prev) => ({ ...prev, ...updates }));
  };

  const addRecord = (record: HealthRecord) => {
    setRecords((prev) => [record, ...prev]);
    // Reward points for adding record
    setStudent((prev) => ({ ...prev, pointsBalance: prev.pointsBalance + 50 }));
  };

  const deleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const completeStation = (stationId: string, doctorNote?: string) => {
    setCamp((prev) => {
      const updatedStations = prev.stations.map((st) => {
        if (st.id === stationId) {
          return {
            ...st,
            status: 'COMPLETED' as const,
            completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            doctorNote: doctorNote || st.doctorNote || 'Verified and completed by station officer',
          };
        }
        return st;
      });
      const completedCount = updatedStations.filter((s) => s.status === 'COMPLETED').length;
      const digitalBadgeEarned = completedCount === prev.totalStations;

      return {
        ...prev,
        stations: updatedStations,
        completedCount,
        digitalBadgeEarned,
      };
    });
    setStudent((prev) => ({ ...prev, pointsBalance: prev.pointsBalance + 100 }));
  };

  const advanceOrderState = (orderId: string, nextState: OrderState) => {
    setFabricOrders((prev) =>
      prev.map((order) => {
        if (order.id === orderId) {
          const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
          const historyEntry = {
            state: nextState,
            timestamp,
            note: `State updated to ${nextState.toUpperCase()}`,
          };
          return {
            ...order,
            state: nextState,
            stateHistory: [...order.stateHistory, historyEntry],
          };
        }
        return order;
      })
    );
  };

  const createFabricOrder = (orderData: Partial<FabricOrder>): FabricOrder => {
    const newOrder: FabricOrder = {
      id: `ORD-FAB-${Math.floor(1000 + Math.random() * 9000)}`,
      partnerId: orderData.partnerId || 'PARTNER-CAMPUS-CORE',
      partnerName: orderData.partnerName || 'Campus Internal Health App',
      serviceCategory: orderData.serviceCategory || 'DIAGNOSTICS',
      serviceCodeLoinc: orderData.serviceCodeLoinc || '58410-2',
      serviceName: orderData.serviceName || 'Diagnostic Panel',
      pincode: orderData.pincode || '502285',
      modality: orderData.modality || 'HOME_COLLECTION',
      assignedProviderId: 'PROV-101',
      assignedProviderName: 'Dr. Lal PathLabs · Central Hub',
      fallbackProviderId: 'PROV-102',
      state: 'created',
      stateHistory: [
        {
          state: 'created',
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          note: 'Order initiated',
        },
      ],
      patientId: student.id,
      patientName: student.fullName,
      providerCost: 350,
      partnerPrice: 550,
      settlementStatus: 'UNBILLED',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      ...orderData,
    };

    setFabricOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  const signClaimAdjudication = (claimId: string, reviewerName: string) => {
    setClaimAdjudications((prev) =>
      prev.map((claim) => {
        if (claim.id === claimId) {
          return {
            ...claim,
            decisionStatus: 'APPROVED' as const,
            assignedReviewerName: reviewerName,
            reviewerSignedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          };
        }
        return claim;
      })
    );
  };

  const dismissClaimAnomaly = (claimId: string, anomalyId: string, reason: string) => {
    setClaimAdjudications((prev) =>
      prev.map((claim) => {
        if (claim.id === claimId) {
          return {
            ...claim,
            anomalyFlags: claim.anomalyFlags.map((flag) =>
              flag.id === anomalyId ? { ...flag, dismissed: true, dismissalReason: reason } : flag
            ),
          };
        }
        return claim;
      })
    );
  };

  const addClinicianNote = (patientId: string, noteTitle: string, noteText: string) => {
    setClinicianPatients((prev) =>
      prev.map((patient) => {
        if (patient.id === patientId) {
          const newEntry = {
            date: new Date().toISOString().split('T')[0],
            type: 'EMR_NOTE',
            title: noteTitle,
            notes: noteText,
          };
          return {
            ...patient,
            timeline: [newEntry, ...patient.timeline],
          };
        }
        return patient;
      })
    );
  };

  const triggerEmergency = () => {
    setEmergencyActive(true);
  };

  const cancelEmergency = () => {
    setEmergencyActive(false);
  };

  const sendStudentChatMessage = (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);

    setTimeout(() => {
      const response = processStudentCareMessage(text, student.fullName.split(' ')[0]);
      const botMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: response.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        constitutionRuleRef: response.ruleRef,
        triageSeverity: response.severity,
        actionPrompt: response.suggestedAction?.label,
        actionPayload: response.suggestedAction,
      };
      setChatMessages((prev) => [...prev, botMsg]);
    }, 450);
  };

  const clearChat = () => {
    setChatMessages([
      {
        id: 'msg-init',
        sender: 'assistant',
        text: `Hello ${student.fullName.split(' ')[0]}! How can I support your health today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        constitutionRuleRef: 'Rule-A: Non-prescriptive Guidance',
      },
    ]);
  };

  return (
    <AppStoreContext.Provider
      value={{
        student,
        updateStudent,
        language,
        setLanguage,
        records,
        addRecord,
        deleteRecord,
        camp,
        completeStation,
        fabricProviders,
        fabricOrders,
        advanceOrderState,
        createFabricOrder,
        claimAdjudications,
        signClaimAdjudication,
        dismissClaimAnomaly,
        clinicianPatients,
        selectedPatientId,
        setSelectedPatientId,
        addClinicianNote,
        emergencyActive,
        triggerEmergency,
        cancelEmergency,
        chatMessages,
        sendStudentChatMessage,
        clearChat,
      }}
    >
      {children}
    </AppStoreContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppStoreProvider');
  }
  return context;
};
