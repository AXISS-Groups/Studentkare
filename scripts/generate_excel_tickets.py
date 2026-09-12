import pandas as pd
import datetime

categories = [
    'TELE_HEALTH', 'SMART_SENSORS', 'LAB_DIAGNOSTICS', 'SANITATION_FACILITIES',
    'PHARMACY_MEDS', 'INSURANCE_CLAIMS', 'EMERGENCY_SOS', 'AI_DIAGNOSTICS'
]

hostels = ['Hostel Block A', 'Hostel Block B', 'Hostel Block C', 'Hostel Block D', 'PG Residence 1', 'Married Scholar Quarters']
names = [
    'Rohit Sharma', 'Priya Patel', 'Ananya Deshmukh', 'Rahul Verma', 'Aarav Mehta',
    'Sneha Kulkarni', 'Vikram Singh', 'Kavya Nair', 'Devansh Gupta', 'Isha Sundaram',
    'Arjun Reddy', 'Meera Rao', 'Siddharth Joshi', 'Tanvi Saxena', 'Karan Bhatia',
    'Riya Sen', 'Aditya Iyer', 'Nisha Banerjee', 'Tarun Chawla', 'Pooja Agarwal'
]

templates = [
    # Tele-Health
    ('TELE_HEALTH', 'General Fever', 'High fever and shivering post-monsoon study session', 'Student reported 102.4°F temperature. Requested tele-consultation and fever meds.', 'HIGH', 'Campus Clinical Team'),
    ('TELE_HEALTH', 'Mental Health Tele-MANAS', 'Exam anxiety & acute sleep deprivation support request', 'Student requested confidential 24x7 counseling via Tele-MANAS regarding end-semester stress.', 'MEDIUM', 'Tele-MANAS Counseling Desk'),
    ('TELE_HEALTH', 'Dermatology', 'Allergic skin rash on arms after hostel outdoor event', 'Red itchy rash spreading on forearms. Needs video evaluation with dermatologist.', 'MEDIUM', 'Dermatology On-Call Doctor'),
    ('TELE_HEALTH', 'Ophthalmology', 'Severe dry eye & screen glare fatigue after 10hr coding session', 'Eye strain and burning sensation. Needs artificial tear prescription.', 'LOW', 'Digital Ergonomics Desk'),
    ('TELE_HEALTH', 'Orthopedics', 'Sprained ankle during campus badminton tournament', 'Swollen right ankle. Requested cold compress guidance and X-ray slot.', 'HIGH', 'Sports Medicine Unit'),

    # Smart Sensors & Wearables
    ('SMART_SENSORS', 'Heart Rate Alert', 'Resting Heart Rate Spike (138 BPM) detected by Smart Watch', 'Wearable sensor triggered resting tachycardia alert while student was seated in library.', 'CRITICAL', 'Vitals Monitoring AI'),
    ('SMART_SENSORS', 'SpO2 Telemetry', 'Low Blood Oxygen SpO2 (92%) alert during night study', 'RPPG Vitals Camera & Wearables flagged drop in peripheral oxygen saturation.', 'CRITICAL', 'Emergency Response Desk'),
    ('SMART_SENSORS', 'Posture Coach', 'Chronic Slouch Posture warning (3.5 hours continuous neck tilt)', 'Study Posture Coach sensor alerted lumbar strain risk during project coding.', 'LOW', 'Student Wellness AI'),
    ('SMART_SENSORS', 'Step Counter', 'Zero mobility alert (Under 500 steps for 48 hours straight)', 'Mobile Step Counter sensor flagged severe sedentary lock during exam preparation.', 'MEDIUM', 'Health Coach Agent'),

    # Diagnostic Lab Orders
    ('LAB_DIAGNOSTICS', 'Monsoon Dengue NS1', 'NABL Dengue NS1 Antigen & Complete Blood Count (CBC) home sample collection', 'Fever suspect requested hostel room sample collection for CBC platelet count check.', 'HIGH', 'Pathology Lab Partner'),
    ('LAB_DIAGNOSTICS', 'Vitamin D3 & B12', 'Routine Vitamin D3 & Serum B12 deficiency panel booking', 'Student booked discounted lab package under Studentkare Plan B membership.', 'LOW', 'Diagnostic Services Unit'),
    ('LAB_DIAGNOSTICS', 'Water Bacteria Test', 'Hostel Block C Water Dispenser Bacterial Culture Test', 'Randomized 4-hour water sample collected to verify E. coli and coliform absence.', 'HIGH', 'Environmental Safety Lab'),

    # Hostel & Campus Sanitation
    ('SANITATION_FACILITIES', 'Water Purifier', 'Hostel Block B 2nd Floor RO UV Filter replacement required', 'Sanitation sensor indicated UV lamp intensity drop below safety threshold.', 'HIGH', 'Hostel Maintenance Operations'),
    ('SANITATION_FACILITIES', 'Pest Control', 'Mosquito breeding inspection requested around PG Residence garden', 'Stagnant water near cooler drain pipes needs immediate fogging and larvicide treatment.', 'HIGH', 'Campus Sanitation Squad'),

    # Pharmacy & Meds
    ('PHARMACY_MEDS', 'AI Voice Prescription', 'Fulfillment of AI Voice-Parsed Prescription for Anti-Histamines & Paracetamol', 'Prescription parsed via AI Voice Modal. Requested hostel room delivery.', 'MEDIUM', 'Campus Dispensary Pharmacy'),
    ('PHARMACY_MEDS', 'Cold Chain Insulin', 'Cold-chain storage verification for student diabetes medication', 'Insulin pen storage check at hostel pharmacy refrigeration unit.', 'HIGH', 'Pharmacy Cold Chain Desk'),

    # Insurance Claims
    ('INSURANCE_CLAIMS', 'Plan B Reimbursement', 'Insurance claim adjudication for outpatient emergency clinic visit', 'Student submitted ₹1,200 emergency OPD consultation receipt for Plan B 100% claim settlement.', 'MEDIUM', 'Insurance Adjudication AI'),
    ('INSURANCE_CLAIMS', 'Claim Anomaly Review', 'Duplicate bill anomaly flagged on hospitalization claim', 'Claim Adjudication AI flagged potential double-entry invoice for review by signed officer.', 'HIGH', 'Claims Compliance Officer'),

    # Emergency SOS
    ('EMERGENCY_SOS', 'Ambulance Dispatch', 'Emergency 24x7 Ambulance dispatch request for acute abdominal distress', 'Student triggered 24x7 SOS emergency button. Campus medical team dispatched to Hostel Block A.', 'CRITICAL', '24x7 Emergency Dispatch Unit'),
    ('EMERGENCY_SOS', 'Crisis Intervention', 'Panic attack emergency trigger from central library reading room', 'SOS trigger handled by Triage Council AI. Campus counselor dispatched.', 'CRITICAL', 'Crisis Response Team'),

    # AI Diagnostics
    ('AI_DIAGNOSTICS', '4-Hr Scouting Anomaly', '4-Hour Scouting Loop Flagged Seasonal Flu Spike in Hostel Block D', 'Automated 4-hour agent scouting loop detected 4 viral flu cases in 12 hours.', 'HIGH', 'Automated 4-Hr Agent Loop'),
    ('AI_DIAGNOSTICS', 'Weather Alert Sync', 'Monsoon High Humidity Weather Banner Triggered automatically', 'Weather API updated microclimate alert to 85% humidity Dengue risk.', 'LOW', 'Environmental Sensing Agent')
]

data = []
base_time = datetime.datetime.now()

for i in range(100):
    tpl = templates[i % len(templates)]
    hostel = hostels[i % len(hostels)]
    student = names[i % len(names)]
    ticket_id = f"TCK-{1000 + i + 1}"
    student_id = f"STU-2026-{(100 + i):03d}"
    
    timestamp = (base_time - datetime.timedelta(minutes=i * 45)).strftime("%Y-%m-%d %H:%M:%S")
    status = 'OPEN' if i % 5 == 0 else 'IN_PROGRESS' if i % 3 == 0 else 'ESCALATED' if i % 7 == 0 else 'RESOLVED'
    
    data.append({
        'Ticket ID': ticket_id,
        'Student ID': student_id,
        'Student Name': student,
        'Hostel Block': hostel,
        'Category': tpl[0],
        'Sub Category': tpl[1],
        'Priority': tpl[4],
        'Status': status,
        'Title': tpl[2],
        'Description': f"{tpl[3]} (Logged for {student} at {hostel}).",
        'Assigned Team': tpl[5],
        'AI Triaged': 'Yes',
        'Logged Timestamp': timestamp,
        'Resolution Note': 'Processed cleanly by automated workflow & clinical officer.' if status == 'RESOLVED' else ''
    })

df = pd.DataFrame(data)

# Export to Excel
excel_path = '/Users/avks/Desktop/Projects /SA Care/campus_100_tickets.xlsx'
csv_path = '/Users/avks/Desktop/Projects /SA Care/campus_100_tickets.csv'

with pd.ExcelWriter(excel_path, engine='openpyxl') as writer:
    df.to_excel(writer, sheet_name='100 Campus Tickets', index=False)

df.to_csv(csv_path, index=False)
print(f"SUCCESS: Generated {len(df)} tickets in Excel ({excel_path}) and CSV ({csv_path})")
