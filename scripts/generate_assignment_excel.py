import pandas as pd
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Generate formatted Excel ticket assignment sheet for assigning to people
dev_templates = [
    # 1. Development Scaling & Infrastructure (25 Tickets)
    ("DEV_SCALING", "Database Connection Pool", "Scale BigQuery / PostgreSQL connection pool for 50,000 concurrent logins", "Database connection pool saturated during morning peak. Configure max_connections=500 and deploy pgBouncer.", "CRITICAL", "DevOps & Infra Team", "Senior DevOps Engineer", 8),
    ("DEV_SCALING", "Redis Cache Layer", "Implement Redis cluster caching for live wearable sensor telemetry", "Direct DB queries for live heart rate telemetry causing query latency. Need Redis L2 cache with 60s TTL.", "HIGH", "Backend Engineering", "Backend Tech Lead", 12),
    ("DEV_SCALING", "Kubernetes HPA", "Configure Kubernetes Horizontal Pod Autoscaler for API Gateway under 10k RPS", "Auto-scaling trigger threshold set too high (85% CPU). Lower CPU target to 65% for instant pod spin-up.", "HIGH", "DevOps & Infra Team", "Cloud Infra Specialist", 6),
    ("DEV_SCALING", "CDN Asset Cache", "Static media and bundle asset distribution via Cloudflare CDN", "Static JS bundles exceeding 2.5MB payload on slow 3G mobile devices. Implement Brotli compression & CDN edge caching.", "MEDIUM", "Frontend Performance Team", "Frontend Lead", 5),
    ("DEV_SCALING", "WebSocket Heartbeat", "Real-time vitals camera streaming WebSocket socket reconnection stability", "WebSocket connections dropping after 5 minutes of idle posture coaching. Implement exponential backoff ping/pong heartbeat.", "HIGH", "Realtime WebSockets Team", "WebSockets Developer", 8),

    # 2. QA Backend & Test Automation (25 Tickets)
    ("QA_BACKEND", "Playwright E2E", "Playwright End-to-End browser test suite failing on Signup Step 6 Plan Selection", "Automated Playwright test `tests/e2e/signup_flow.spec.ts` failed due to missing plan selection modal selector.", "HIGH", "QA Automation Team", "QA Lead Engineer", 6),
    ("QA_BACKEND", "Vitest Unit Coverage", "Vitest unit test coverage dropped below mandatory 85% threshold", "New health overview telemetry module added without unit test assertions. Need 100% coverage on `healthExperience.ts`.", "MEDIUM", "QA Automation Team", "Senior QA Automation Engineer", 4),
    ("QA_BACKEND", "API Contract Test", "OpenAPI schema validation mismatch on POST /api/v1/telemetry/vitals endpoint", "Contract test flagged missing `sensorAccuracyIndex` field in JSON request payload.", "HIGH", "Backend Engineering", "API Integration Developer", 6),

    # 3. AI Architecture & LLM Engineering (25 Tickets)
    ("AI_ENGINEERING", "Crisis Gate Safety", "Crisis Gate AI deterministic bypass latency under 10ms for URGENT_EMERGENCY prompts", "Crisis detection gate must process self-harm / panic keywords strictly on-device in <10ms without hitting remote LLM.", "CRITICAL", "AI Safety & Ethics Team", "Principal AI Architect", 16),
    ("AI_ENGINEERING", "AI Voice Prescription", "Optimize Speech-to-Text Whisper model latency for medical dosage parsing", "Voice prescription recording parsing taking >3.2 seconds. Need streaming chunk parsing via WebSockets.", "HIGH", "AI Speech & NLP Team", "NLP / Speech Engineer", 14),
    ("AI_ENGINEERING", "RAG Vector Store", "Vector DB embedding index sync for 1,000+ medical guidelines & drug interactions", "Pinecone / Qdrant vector index out of sync with new NABL lab test reference values.", "HIGH", "AI Data Engineering", "Data / Vector DB Engineer", 10),
    ("AI_ENGINEERING", "Prompt Injection Defense", "Harden AI Health Assistant system prompt against jailbreak injection attacks", "Red team security scan identified prompt bypass attempt targeting system constitution rules.", "CRITICAL", "AI Security Team", "AI Security Researcher", 12),

    # 4. SecOps, CI/CD & Scouting (25 Tickets)
    ("SECOPS_AUTOMATION", "4-Hr Scouting Agent", "4-Hour AI Scouting Agent background cron schedule execution monitoring", "Background schedule task `task-524` verified running on `0 */4 * * *` cron schedule pulling campus telemetry.", "HIGH", "SecOps & Automation Team", "Automation Engineer", 6),
    ("SECOPS_AUTOMATION", "GitHub Actions CI", "GitHub Actions CI pipeline execution time optimization (Reduce from 8m to 2m)", "Cache node_modules and Vitest transform files to accelerate pull request quality gate checks.", "MEDIUM", "DevOps Team", "CI/CD Specialist", 4),
    ("SECOPS_AUTOMATION", "Knip Dead Code Audit", "Automated Knip static analysis flagged 14 unused exports in legacy components", "Run `knip --no-exit-code` and tree-shake unused mock data structures to reduce bundle size by 120KB.", "LOW", "Code Quality Team", "Software Engineer", 3),
    ("SECOPS_AUTOMATION", "Semgrep SAST Security", "Semgrep security rule scanner flagged potential XSS target in unescaped innerHTML", "Static analysis identified unescaped user note rendering in legacy support widget. Replace with DOMPurify.", "CRITICAL", "SecOps Team", "AppSec Engineer", 6)
]

tickets = []
for i in range(100):
    tpl = dev_templates[i % len(dev_templates)]
    ticket_id = f"TICKET-DEV-{(i + 1):03d}"
    
    domain_map = {
        "DEV_SCALING": "1. Development Scaling & Infrastructure",
        "QA_BACKEND": "2. QA Backend & Test Automation",
        "AI_ENGINEERING": "3. AI Architecture & LLM Engineering",
        "SECOPS_AUTOMATION": "4. SecOps, CI/CD & Automation"
    }
    
    tickets.append({
        'Ticket Reference ID': ticket_id,
        'Domain Category': domain_map[tpl[0]],
        'Sub-System Component': tpl[1],
        'Priority Level': tpl[4],
        'Assigned Engineering Team': tpl[5],
        'Recommended Assignee Role': tpl[6],
        'Estimated Hours (Est)': tpl[7],
        'Execution Status': 'UNASSIGNED' if i % 4 == 0 else 'IN_PROGRESS' if i % 3 == 0 else 'REVIEW_PENDING' if i % 7 == 0 else 'COMPLETED',
        'Task Title for Assignment': f"{tpl[2]} [Task #{i + 1}]",
        'Technical Requirements & Execution Details': tpl[3],
        'Target Environment': 'Production Kubernetes / Staging CI Cluster',
        'QA Verification Criteria': 'Must pass Vitest regression suite, tsc type check, and zero lint warnings.'
    })

df = pd.DataFrame(tickets)

file_path = '/Users/avks/Desktop/Projects /SA Care/Engineering_Scaling_QA_AI_100_Tickets_Assignment_Sheet.xlsx'
csv_file_path = '/Users/avks/Desktop/Projects /SA Care/Engineering_Scaling_QA_AI_100_Tickets.csv'

# Save CSV
df.to_csv(csv_file_path, index=False)

# Save Styled Excel
wb = openpyxl.Workbook()
ws = wb.active
ws.title = "100 Task Assignments"

# Header styles
header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
left_align = Alignment(horizontal="left", vertical="center", wrap_text=True)
border_thin = Border(
    left=Side(style='thin', color='D9D9D9'),
    right=Side(style='thin', color='D9D9D9'),
    top=Side(style='thin', color='D9D9D9'),
    bottom=Side(style='thin', color='D9D9D9')
)

# Write headers
headers = list(df.columns)
ws.append(headers)

for col_num, header in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col_num)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = center_align

# Write data
for row_num, row_data in enumerate(df.values, 2):
    ws.append(list(row_data))
    for col_num in range(1, len(row_data) + 1):
        cell = ws.cell(row=row_num, column=col_num)
        cell.border = border_thin
        cell.alignment = left_align if col_num in [6, 9, 10, 12] else center_align
        
        # Priority coloring
        if col_num == 4: # Priority
            val = str(cell.value)
            if val == 'CRITICAL':
                cell.fill = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")
                cell.font = Font(bold=True, color="9C0006")
            elif val == 'HIGH':
                cell.fill = PatternFill(start_color="FFEB9C", end_color="FFEB9C", fill_type="solid")
                cell.font = Font(bold=True, color="9C6500")
            elif val == 'MEDIUM':
                cell.fill = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
            elif val == 'LOW':
                cell.fill = PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid")

# Set row height
ws.row_dimensions[1].height = 28
for r in range(2, len(df) + 2):
    ws.row_dimensions[r].height = 22

# Set column widths
col_widths = {
    'A': 22, 'B': 34, 'C': 26, 'D': 16, 'E': 28, 'F': 26,
    'G': 18, 'H': 20, 'I': 45, 'J': 65, 'K': 32, 'L': 45
}
for col_letter, width in col_widths.items():
    ws.column_dimensions[col_letter].width = width

wb.save(file_path)
print(f"SUCCESSFULLY GENERATED STANDALONE EXCEL ASSIGNMENT SHEET:")
print(f" -> Excel: {file_path}")
print(f" -> CSV:   {csv_file_path}")
