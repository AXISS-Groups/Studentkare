// Teleconsult & Care 1,000+ Data Generator Engine for Student Kare

export interface TeleconsultDoctor {
  id: string;
  name: string;
  specialty: string;
  councilRef: string;
  campusStation: string;
  experienceYears: number;
  rating: number;
  consultationFee: string;
  availableSlots: string[];
  status: 'AVAILABLE' | 'ON_DUTY' | 'BUSY';
}

export interface PharmacyMedication {
  id: string;
  brandName: string;
  activeMolecule: string;
  category: string;
  price: number;
  prescriptionRequired: boolean;
  deliveryTimeMins: number;
  stockCount: number;
}

export interface DiagnosticLabTest {
  id: string;
  testName: string;
  category: 'BLOOD' | 'RADIOLOGY' | 'DENTAL' | 'VISION';
  vendorName: string;
  price: number;
  turnaroundHours: number;
  samplePickup: string;
}

// Generate 400+ Doctors across Indian Campuses
export const generateDoctorsCatalog = (): TeleconsultDoctor[] => {
  const specialties = [
    'General Internal Medicine',
    'Cardiology & Telemetry',
    'Psychiatry & Student Mental Health',
    'Dermatology & Skin Care',
    'Ophthalmology & Visual Acuity',
    'Dental & Intraoral Surgery',
    'ENT & Allergy Care',
    'Orthopedics & Sports Medicine',
    'Gynecology & Women’s Health',
    'Hostel Clinical Nutrition',
  ];

  const campuses = [
    'Osmania University Medical Pod 1',
    'IIT Hyderabad Health Centre',
    'BITS Pilani Hyderabad Campus Clinic',
    'University of Hyderabad Health Hub',
    'AIIMS Campus Clinic Station',
  ];

  const firstNames = ['Ananya', 'Vikram', 'Radhika', 'Suresh', 'Priya', 'Rajesh', 'Kavita', 'Arun', 'Meera', 'Deepak', 'Sanjay', 'Pooja', 'Amit', 'Neha', 'Rohan'];
  const lastNames = ['Rao', 'Sen', 'Sharma', 'Iyer', 'Reddy', 'Mehta', 'Verma', 'Patel', 'Joshi', 'Gupta', 'Deshmukh', 'Nair', 'Chopra', 'Bhat'];

  const list: TeleconsultDoctor[] = [];
  for (let i = 1; i <= 400; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[i % lastNames.length];
    const spec = specialties[i % specialties.length];
    const camp = campuses[i % campuses.length];

    list.push({
      id: `DOC-NMC-${1000 + i}`,
      name: `Dr. ${fn} ${ln}, MD`,
      specialty: spec,
      councilRef: `NMC/${10000 + i}/2018`,
      campusStation: camp,
      experienceYears: 6 + (i % 18),
      rating: +(4.5 + (i % 5) * 0.1).toFixed(1),
      consultationFee: 'Free (Student Kare Pass)',
      availableSlots: ['10:00 AM', '11:30 AM', '02:00 PM', '04:30 PM', '06:00 PM'],
      status: i % 3 === 0 ? 'AVAILABLE' : 'ON_DUTY',
    });
  }
  return list;
};

// Generate 400+ Pharmacy Medications
export const generateMedicationsCatalog = (): PharmacyMedication[] => {
  

  const drugNames = [
    { brand: 'Dolo 650', mol: 'Paracetamol 650mg', cat: 'Fever & Acute Pain SOS', rx: false, price: 32 },
    { brand: 'Allegra 120', mol: 'Fexofenadine 120mg', cat: 'Allergy & Rhinitis', rx: false, price: 110 },
    { brand: 'Asthalin Inhaler', mol: 'Salbutamol 100mcg', cat: 'Respiratory Asthma Inhalers', rx: true, price: 145 },
    { brand: 'Electral Sachet', mol: 'WHO Formula Salts', cat: 'Hydration & Electrolytes', rx: false, price: 22 },
    { brand: 'Magnesium Glycinate', mol: 'Magnesium 250mg', cat: 'Exam Stress & Sleep Hygiene', rx: false, price: 240 },
    { brand: 'Pantocid 40', mol: 'Pantoprazole 40mg', cat: 'Gastrointestinal Care', rx: false, price: 85 },
    { brand: 'Burnol Ointment', mol: 'Aminacrine + Cetrimide', cat: 'Dermatology & Burn Ointment', rx: false, price: 65 },
    { brand: 'Augmentin 625', mol: 'Amoxicillin + Clavulanate', cat: 'Antibiotics', rx: true, price: 195 },
  ];

  const list: PharmacyMedication[] = [];
  for (let i = 1; i <= 400; i++) {
    const template = drugNames[i % drugNames.length];
    list.push({
      id: `PHARM-${2000 + i}`,
      brandName: `${template.brand} ${i > 8 ? `Batch #${i}` : ''}`,
      activeMolecule: template.mol,
      category: template.cat,
      price: template.price,
      prescriptionRequired: template.rx,
      deliveryTimeMins: 20 + (i % 25),
      stockCount: 50 + (i % 300),
    });
  }
  return list;
};

// Generate 300+ Diagnostic Tests & Scans
export const generateDiagnosticCatalog = (): DiagnosticLabTest[] => {
  const tests = [
    { name: 'Complete Blood Count (CBC) + ESR', cat: 'BLOOD' as const, vendor: 'SRL Diagnostics', price: 450, hrs: 6 },
    { name: 'Dengue NS1 Antigen Elisa Panel', cat: 'BLOOD' as const, vendor: 'Dr. Lal PathLabs', price: 850, hrs: 6 },
    { name: 'HbA1c & Fasting Blood Glucose', cat: 'BLOOD' as const, vendor: 'Apollo Diagnostics', price: 520, hrs: 8 },
    { name: 'Vitamin D3 & B12 Health Shield', cat: 'BLOOD' as const, vendor: 'SRL Diagnostics', price: 1200, hrs: 12 },
    { name: 'Digital Chest X-Ray (PA View)', cat: 'RADIOLOGY' as const, vendor: 'Mahajan Imaging', price: 650, hrs: 2 },
    { name: 'Abdominal & Pelvic Ultrasound', cat: 'RADIOLOGY' as const, vendor: 'Suburban Scans', price: 1400, hrs: 4 },
    { name: 'Ultrasonic Dental Scaling & Caries Check', cat: 'DENTAL' as const, vendor: 'Clove Dental Pods', price: 350, hrs: 1 },
    { name: 'Snellen Visual Acuity & Refractive Test', cat: 'VISION' as const, vendor: 'Lenskart Eye Hub', price: 0, hrs: 1 },
  ];

  const list: DiagnosticLabTest[] = [];
  for (let i = 1; i <= 300; i++) {
    const t = tests[i % tests.length];
    list.push({
      id: `TEST-${3000 + i}`,
      testName: `${t.name} ${i > 8 ? `Code #${i}` : ''}`,
      category: t.cat,
      vendorName: t.vendor,
      price: t.price,
      turnaroundHours: t.hrs,
      samplePickup: t.cat === 'BLOOD' ? 'Free Hostel Room Pickup' : 'Campus Clinic Pod',
    });
  }
  return list;
};
