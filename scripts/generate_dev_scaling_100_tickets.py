import pandas as pd
import datetime

# 100 Engineering, Development Scaling, QA Backend, AI & Automation Tickets
dev_templates = [
    # 1. Development Scaling & Infrastructure (25 Templates)
    ("DEV_SCALING", "Database Connection Pool", "Scale BigQuery / PostgreSQL connection pool for 50,000 concurrent student logins", "Database connection pool saturated during morning 09:00 AM class attendance peak. Need to adjust MaxConnections to 500.", "CRITICAL", "DevOps & Infrastructure Team"),
    ("DEV_SCALING", "Redis Cache Layer", "Implement Redis cluster caching for live wearable sensor telemetry endpoints", "Direct DB queries for live heart rate and step counter telemetry causing query latency. Need Redis L2 caching with 60s TTL.", "HIGH", "Backend Engineering"),
    ("DEV_SCALING", "Horizontal Pod Autoscaler", "Configure Kubernetes HPA for API Gateway under 10k RPS load", "Auto-scaling trigger threshold set too high (85% CPU). Lower CPU target to 65% for instant pod spin-up.", "HIGH", "DevOps Team"),
    ("DEV_SCALING", "CDN Asset Optimization", "Static media and bundle asset distribution via Cloudflare / CloudFront CDN", "Static JS bundles exceeding 2.5MB payload on slow 3G mobile devices. Implement Brotli compression & CDN edge caching.", "MEDIUM", "Frontend Performance Team"),
    ("DEV_SCALING", "WebSocket Heartbeat", "Real-time vitals camera streaming WebSocket socket reconnection stability", "WebSocket connections dropping after 5 minutes of idle posture coaching. Implement exponential backoff ping/pong heartbeat.", "HIGH", "Realtime WebSockets Team"),

    # 2. QA Backend & Test Automation (25 Templates)
    ("QA_BACKEND", "Playwright E2E Automation", "Playwright End-to-End browser test suite failing on Signup Step 6 Plan Selection", "Automated Playwright test `tests/e2e/signup_flow.spec.ts` failed due to missing plan selection modal selector `#plan-c-btn`.", "HIGH", "QA Automation Team"),
    ("QA_BACKEND", "Vitest Coverage Gate", "Vitest unit test coverage dropped below mandatory 85% threshold", "New health overview telemetry module added without unit test assertions. Need 100% coverage on `healthExperience.ts`.", "MEDIUM", "QA Quality Engineers"),
    ("QA_BACKEND", "API Contract Testing", "OpenAPI schema validation mismatch on POST /api/v1/telemetry/vitals endpoint", "Contract test flagged missing `sensorAccuracyIndex` field in JSON request payload.", "HIGH", "Backend QA Team"),
    ("QA_BACKEND", "Mock Service Worker (MSW)", "MSW mock server latency simulation for offline mode PWA testing", "Mock service worker failing to intercept offline PWA sync requests in Vitest runner.", "LOW", "QA Tooling Team"),
    ("QA_BACKEND", "Visual Regression Test", "Percy / Chromatic visual regression diff detected on InterfaceBar theme header", "Dark mode pill buttons shifted 2px out of alignment on 1440px viewport displays.", "LOW", "Frontend QA Team"),

    # 3. AI Architecture & LLM Engineering (25 Templates)
    ("AI_ENGINEERING", "Crisis Gate Safety", "Crisis Gate AI deterministic bypass latency under 10ms for URGENT_EMERGENCY prompts", "Crisis detection gate must process self-harm / panic keywords strictly on-device in <10ms without hitting remote LLM.", "CRITICAL", "AI Safety & Ethics Team"),
    ("AI_ENGINEERING", "AI Voice Prescription", "Optimize Speech-to-Text Whisper model latency for medical dosage parsing", "Voice prescription recording parsing taking >3.2 seconds. Need streaming chunk parsing via WebSockets.", "HIGH", "AI Speech Team"),
    ("AI_ENGINEERING", "RAG Vector Store", "Vector DB embedding index sync for 1,000+ medical guidelines & drug interactions", "Pinecone / Qdrant vector index out of sync with new NABL lab test reference values.", "HIGH", "AI Data Engineering"),
    ("AI_ENGINEERING", "Prompt Injection Defense", "Harden AI Health Assistant system prompt against jailbreak injection attacks", "Red team security scan identified prompt bypass attempt targeting system constitution rules.", "CRITICAL", "AI Security Team"),
    ("AI_ENGINEERING", "LLM Token Budget", "Implement token capping and fallback model switching (Gemini Pro to Flash)", "High token consumption on long multi-turn patient chats. Implement auto-summarization at 4,000 tokens.", "MEDIUM", "AI Infra Team"),

    # 4. Automation, CI/CD & SecOps (25 Templates)
    ("SECOPS_AUTOMATION", "4-Hr Scouting Agent Cron", "4-Hour AI Scouting Agent background cron schedule execution monitoring", "Background schedule task `task-524` verified running on `0 */4 * * *` cron schedule pulling campus telemetry.", "HIGH", "Automation & Agent Ops"),
    ("SECOPS_AUTOMATION", "GitHub Actions CI Gate", "GitHub Actions CI pipeline execution time optimization (Reduce from 8m to 2m)", "Cache node_modules and Vitest transform files to accelerate pull request quality gate checks.", "MEDIUM", "DevOps & CI/CD Team"),
    ("SECOPS_AUTOMATION", "Knip Dead Code Audit", "Automated Knip static analysis flagged 14 unused exports in legacy components", "Run `knip --no-exit-code` and tree-shake unused mock data structures to reduce bundle size by 120KB.", "LOW", "Code Quality Team"),
    ("SECOPS_AUTOMATION", "Semgrep SAST Security", "Semgrep security rule scanner flagged potential XSS target in unescaped innerHTML", "Static analysis identified unescaped user note rendering in legacy support widget. Replace with DOMPurify.", "CRITICAL", "Application Security Team"),
    ("SECOPS_AUTOMATION", "OWASP ZAP DAST Scan", "OWASP ZAP dynamic application security test scan report remediation", "Automated DAST scan flagged missing Strict-Transport-Security (HSTS) header on staging deployment.", "HIGH", "SecOps Team")
]

tickets = []
base_time = datetime.datetime.now()

for i in range(100):
    tpl = dev_templates[i % len(dev_templates)]
    ticket_id = f"DEV-TCK-{(2000 + i + 1)}"
    
    # Categories distribution
    cat_type = "Development Scaling & Infrastructure" if tpl[0] == "DEV_SCALING" else \
               "QA Backend & Test Automation" if tpl[0] == "QA_BACKEND" else \
               "AI Architecture & LLM Engineering" if tpl[0] == "AI_ENGINEERING" else \
               "Automation, CI/CD & SecOps"
    
    timestamp = (base_time - datetime.timedelta(minutes=i * 30)).strftime("%Y-%m-%d %H:%M:%S")
    status = 'OPEN' if i % 4 == 0 else 'IN_PROGRESS' if i % 3 == 0 else 'ESCALATED' if i % 7 == 0 else 'RESOLVED'
    
    tickets.append({
        'Ticket ID': ticket_id,
        'Domain Category': cat_type,
        'Sub System': tpl[1],
        'Priority': tpl[4],
        'Status': status,
        'Issue Title': f"{tpl[2]} (#{i + 1})",
        'Technical Specifications & Description': f"{tpl[3]} [Target Environment: Production / Staging Kubernetes Cluster]",
        'Assigned Engineering Team': tpl[5],
        'Automation Automated Test Triaged': 'Yes (CI/CD Quality Gate Verified)',
        'Logged Timestamp': timestamp,
        'Resolution & Deployment Notes': 'Automated PR merged, passed Vitest regression test suite & deployed to staging.' if status == 'RESOLVED' else 'Pending sprint execution / code review.'
    })

df = pd.DataFrame(tickets)

excel_dev_path = '/Users/avks/Desktop/Projects /SA Care/campus_development_scaling_100_tickets.xlsx'
excel_main_path = '/Users/avks/Desktop/Projects /SA Care/campus_100_tickets.xlsx'
csv_main_path = '/Users/avks/Desktop/Projects /SA Care/campus_100_tickets.csv'

with pd.ExcelWriter(excel_dev_path, engine='openpyxl') as writer:
    df.to_excel(writer, sheet_name='100 Dev & QA Scaling Tickets', index=False)

with pd.ExcelWriter(excel_main_path, engine='openpyxl') as writer:
    df.to_excel(writer, sheet_name='100 Dev Scaling & QA Tickets', index=False)

df.to_csv(csv_main_path, index=False)

print(f"SUCCESS: Created 100 Engineering Development Scaling, QA Backend & AI Tickets in Excel:")
print(f" - Excel Path 1: {excel_dev_path}")
print(f" - Excel Path 2: {excel_main_path}")
print(f" - CSV Path: {csv_main_path}")
