export interface CampusTicket {
  id: string;
  studentId: string;
  studentName: string;
  hostelBlock: string;
  category: 'TELE_HEALTH' | 'SMART_SENSORS' | 'LAB_DIAGNOSTICS' | 'SANITATION_FACILITIES' | 'PHARMACY_MEDS' | 'INSURANCE_CLAIMS' | 'EMERGENCY_SOS' | 'AI_DIAGNOSTICS';
  subCategory: string;
  title: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED';
  timestamp: string;
  assignedTeam: string;
  aiTriaged: boolean;
  resolutionNote?: string;
}

const CATEGORIES = [
  'TELE_HEALTH', 'SMART_SENSORS', 'LAB_DIAGNOSTICS', 'SANITATION_FACILITIES',
  'PHARMACY_MEDS', 'INSURANCE_CLAIMS', 'EMERGENCY_SOS', 'AI_DIAGNOSTICS'
] as const;

const HOSTELS = ['Hostel Block A', 'Hostel Block B', 'Hostel Block C', 'Hostel Block D', 'PG Residence 1', 'Married Scholar Quarters'];
const NAMES = [
  'Rohit Sharma', 'Priya Patel', 'Ananya Deshmukh', 'Rahul Verma', 'Aarav Mehta',
  'Sneha Kulkarni', 'Vikram Singh', 'Kavya Nair', 'Devansh Gupta', 'Isha Sundaram',
  'Arjun Reddy', 'Meera Rao', 'Siddharth Joshi', 'Tanvi Saxena', 'Karan Bhatia',
  'Riya Sen', 'Aditya Iyer', 'Nisha Banerjee', 'Tarun Chawla', 'Pooja Agarwal'
];

const TICKET_TEMPLATES: { category: CampusTicket['category']; subCategory: string; title: string; desc: string; priority: CampusTicket['priority']; assigned: string }[] = [
  // 1. Tele-Health & Clinical Consultations
  { category: 'TELE_HEALTH', subCategory: 'General Fever', title: 'High fever and shivering post-monsoon study session', desc: 'Student reported 102.4°F temperature. Requested tele-consultation and fever meds.', priority: 'HIGH', assigned: 'Campus Clinical Team' },
  { category: 'TELE_HEALTH', subCategory: 'Mental Health Tele-MANAS', title: 'Exam anxiety & acute sleep deprivation support request', desc: 'Student requested confidential 24x7 counseling via Tele-MANAS regarding end-semester stress.', priority: 'MEDIUM', assigned: 'Tele-MANAS Counseling Desk' },
  { category: 'TELE_HEALTH', subCategory: 'Dermatology', title: 'Allergic skin rash on arms after hostel outdoor event', desc: 'Red itchy rash spreading on forearms. Needs video evaluation with dermatologist.', priority: 'MEDIUM', assigned: 'Dermatology On-Call Doctor' },
  { category: 'TELE_HEALTH', subCategory: 'Ophthalmology', title: 'Severe dry eye & screen glare fatigue after 10hr coding session', desc: 'Eye strain and burning sensation. Needs artificial tear prescription.', priority: 'LOW', assigned: 'Digital Ergonomics Desk' },
  { category: 'TELE_HEALTH', subCategory: 'Orthopedics', title: 'Sprained ankle during campus badminton tournament', desc: 'Swollen right ankle. Requested cold compress guidance and X-ray slot.', priority: 'HIGH', assigned: 'Sports Medicine Unit' },

  // 2. Smart Sensors & Wearables Telemetry
  { category: 'SMART_SENSORS', subCategory: 'Heart Rate Alert', title: 'Resting Heart Rate Spike (138 BPM) detected by Smart Watch', desc: 'Wearable sensor triggered resting tachycardia alert while student was seated in library.', priority: 'CRITICAL', assigned: 'Vitals Monitoring AI' },
  { category: 'SMART_SENSORS', subCategory: 'SpO2 Telemetry', title: 'Low Blood Oxygen SpO2 (92%) alert during night study', desc: 'RPPG Vitals Camera & Wearables flagged drop in peripheral oxygen saturation.', priority: 'CRITICAL', assigned: 'Emergency Response Desk' },
  { category: 'SMART_SENSORS', subCategory: 'Posture Coach', title: 'Chronic Slouch Posture warning (3.5 hours continuous neck tilt)', desc: 'Study Posture Coach sensor alerted lumbar strain risk during project coding.', priority: 'LOW', assigned: 'Student Wellness AI' },
  { category: 'SMART_SENSORS', subCategory: 'Step Counter', title: 'Zero mobility alert (Under 500 steps for 48 hours straight)', desc: 'Mobile Step Counter sensor flagged severe sedentary lock during exam preparation.', priority: 'MEDIUM', assigned: 'Health Coach Agent' },

  // 3. Diagnostic Lab Orders & Sampling
  { category: 'LAB_DIAGNOSTICS', subCategory: 'Monsoon Dengue NS1', title: 'NABL Dengue NS1 Antigen & Complete Blood Count (CBC) home sample collection', desc: 'Fever suspect requested hostel room sample collection for CBC platelet count check.', priority: 'HIGH', assigned: 'Pathology Lab Partner' },
  { category: 'LAB_DIAGNOSTICS', subCategory: 'Vitamin D3 & B12', title: 'Routine Vitamin D3 & Serum B12 deficiency panel booking', desc: 'Student booked discounted lab package under Studentkare Plan B membership.', priority: 'LOW', assigned: 'Diagnostic Services Unit' },
  { category: 'LAB_DIAGNOSTICS', subCategory: 'Water Bacteria Test', title: 'Hostel Block C Water Dispenser Bacterial Culture Test', desc: 'Randomized 4-hour water sample collected to verify E. coli and coliform absence.', priority: 'HIGH', assigned: 'Environmental Safety Lab' },

  // 4. Hostel & Campus Sanitation
  { category: 'SANITATION_FACILITIES', subCategory: 'Water Purifier', title: 'Hostel Block B 2nd Floor RO UV Filter replacement required', desc: 'Sanitation sensor indicated UV lamp intensity drop below safety threshold.', priority: 'HIGH', assigned: 'Hostel Maintenance Operations' },
  { category: 'SANITATION_FACILITIES', subCategory: 'Pest Control', title: 'Mosquito breeding inspection requested around PG Residence garden', desc: 'Stagnant water near cooler drain pipes needs immediate fogging and larvicide treatment.', priority: 'HIGH', assigned: 'Campus Sanitation Squad' },

  // 5. Pharmacy & Prescription Orders
  { category: 'PHARMACY_MEDS', subCategory: 'AI Voice Prescription', title: 'Fulfillment of AI Voice-Parsed Prescription for Anti-Histamines & Paracetamol', desc: 'Prescription parsed via AI Voice Modal. Requested hostel room delivery.', priority: 'MEDIUM', assigned: 'Campus Dispensary Pharmacy' },
  { category: 'PHARMACY_MEDS', subCategory: 'Cold Chain Insulin', title: 'Cold-chain storage storage verification for student diabetes medication', desc: 'Insulin pen storage check at hostel pharmacy refrigeration unit.', priority: 'HIGH', assigned: 'Pharmacy Cold Chain Desk' },

  // 6. Insurance Claims & Settlement
  { category: 'INSURANCE_CLAIMS', subCategory: 'Plan B Reimbursement', title: 'Insurance claim adjudication for outpatient emergency clinic visit', desc: 'Student submitted ₹1,200 emergency OPD consultation receipt for Plan B 100% claim settlement.', priority: 'MEDIUM', assigned: 'Insurance Adjudication AI' },
  { category: 'INSURANCE_CLAIMS', subCategory: 'Claim Anomaly Review', title: 'Duplicate bill anomaly flagged on hospitalization claim', desc: 'Claim Adjudication AI flagged potential double-entry invoice for review by signed officer.', priority: 'HIGH', assigned: 'Claims Compliance Officer' },

  // 7. 24x7 Emergency SOS & Crisis
  { category: 'EMERGENCY_SOS', subCategory: 'Ambulance Dispatch', title: 'Emergency 24x7 Ambulance dispatch request for acute abdominal distress', desc: 'Student triggered 24x7 SOS emergency button. Campus medical team dispatched to Hostel Block A.', priority: 'CRITICAL', assigned: '24x7 Emergency Dispatch Unit' },
  { category: 'EMERGENCY_SOS', subCategory: 'Crisis Intervention', title: 'Panic attack emergency trigger from central library reading room', desc: 'SOS trigger handled by Triage Council AI. Campus counselor dispatched.', priority: 'CRITICAL', assigned: 'Crisis Response Team' },

  // 8. AI Agent System Diagnostics
  { category: 'AI_DIAGNOSTICS', subCategory: '4-Hr Scouting Anomaly', title: '4-Hour Scouting Loop Flagged Seasonal Flu Spike in Hostel Block D', desc: 'Automated 4-hour agent scouting loop detected 4 viral flu cases in 12 hours.', priority: 'HIGH', assigned: 'Automated 4-Hr Agent Loop' },
  { category: 'AI_DIAGNOSTICS', subCategory: 'Weather Alert Sync', title: 'Monsoon High Humidity Weather Banner Triggered automatically', desc: 'Weather API updated microclimate alert to 85% humidity Dengue risk.', priority: 'LOW', assigned: 'Environmental Sensing Agent' }
];

export const CAMPUS_100_TICKETS: CampusTicket[] = Array.from({ length: 100 }).map((_, index) => {
  const tpl = TICKET_TEMPLATES[index % TICKET_TEMPLATES.length];
  const hostel = HOSTELS[index % HOSTELS.length];
  const student = NAMES[index % NAMES.length];
  const ticketId = `TCK-${1000 + index + 1}`;
  
  // Generate realistic staggered dates within past 7 days
  const dateObj = new Date(Date.now() - (index * 45 * 60 * 1000));
  const timestamp = `${dateObj.toISOString().split('T')[0]} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  
  const statusOptions: CampusTicket['status'][] = index % 5 === 0 ? ['OPEN'] : index % 3 === 0 ? ['IN_PROGRESS'] : index % 7 === 0 ? ['ESCALATED'] : ['RESOLVED'];

  return {
    id: ticketId,
    studentId: `STU-2026-${(100 + index).toString().padStart(3, '0')}`,
    studentName: student,
    hostelBlock: hostel,
    category: tpl.category,
    subCategory: tpl.subCategory,
    title: tpl.title,
    description: `${tpl.desc} (Logged for ${student} at ${hostel}).`,
    priority: tpl.priority,
    status: statusOptions[0],
    timestamp,
    assignedTeam: tpl.assigned,
    aiTriaged: true,
    resolutionNote: statusOptions[0] === 'RESOLVED' ? 'Processed cleanly by automated workflow & clinical officer.' : undefined
  };
});
