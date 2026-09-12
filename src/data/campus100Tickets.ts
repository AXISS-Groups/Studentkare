export interface CampusTicket {
  id: string;
  studentId: string;
  studentName: string;
  hostelBlock: string;
  category: 'DEV_SCALING' | 'QA_BACKEND' | 'AI_ENGINEERING' | 'SECOPS_AUTOMATION';
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

const TEAMS = [
  'DevOps & Infrastructure Team', 'Backend Engineering', 'QA Automation Team',
  'AI Safety & Ethics Team', 'Application Security (SecOps)', 'Realtime WebSockets Team'
];

const DEV_SCALING_TEMPLATES = [
  // 1. Development Scaling & Infrastructure
  { category: 'DEV_SCALING', subCategory: 'Database Connection Pool', title: 'Scale BigQuery / PostgreSQL connection pool for 50,000 concurrent logins', desc: 'Database connection pool saturated during morning peak. Need MaxConnections=500 and pgBouncer.', priority: 'CRITICAL', assigned: 'DevOps & Infrastructure Team' },
  { category: 'DEV_SCALING', subCategory: 'Redis Cache Layer', title: 'Implement Redis cluster caching for live wearable sensor telemetry', desc: 'Direct DB queries for live heart rate telemetry causing query latency. Need Redis L2 cache with 60s TTL.', priority: 'HIGH', assigned: 'Backend Engineering' },
  { category: 'DEV_SCALING', subCategory: 'Kubernetes HPA', title: 'Configure Kubernetes Horizontal Pod Autoscaler for API Gateway under 10k RPS', desc: 'Auto-scaling trigger threshold set too high (85% CPU). Lower CPU target to 65% for instant pod spin-up.', priority: 'HIGH', assigned: 'DevOps & Infrastructure Team' },
  { category: 'DEV_SCALING', subCategory: 'CDN Asset Cache', title: 'Static media and bundle asset distribution via Cloudflare CDN', desc: 'Static JS bundles exceeding 2.5MB payload on slow 3G mobile devices. Implement Brotli compression & CDN edge caching.', priority: 'MEDIUM', assigned: 'Frontend Performance Team' },
  { category: 'DEV_SCALING', subCategory: 'WebSocket Heartbeat', title: 'Real-time vitals camera streaming WebSocket socket reconnection stability', desc: 'WebSocket connections dropping after 5 minutes of idle posture coaching. Implement exponential backoff ping/pong heartbeat.', priority: 'HIGH', assigned: 'Realtime WebSockets Team' },

  // 2. QA Backend & Test Automation
  { category: 'QA_BACKEND', subCategory: 'Playwright E2E', title: 'Playwright End-to-End browser test suite failing on Signup Step 6 Plan Selection', desc: 'Automated Playwright test `tests/e2e/signup_flow.spec.ts` failed due to missing plan selection modal selector.', priority: 'HIGH', assigned: 'QA Automation Team' },
  { category: 'QA_BACKEND', subCategory: 'Vitest Unit Coverage', title: 'Vitest unit test coverage dropped below mandatory 85% threshold', desc: 'New health overview telemetry module added without unit test assertions. Need 100% coverage on `healthExperience.ts`.', priority: 'MEDIUM', assigned: 'QA Automation Team' },
  { category: 'QA_BACKEND', subCategory: 'API Contract Test', title: 'OpenAPI schema validation mismatch on POST /api/v1/telemetry/vitals endpoint', desc: 'Contract test flagged missing `sensorAccuracyIndex` field in JSON request payload.', priority: 'HIGH', assigned: 'Backend Engineering' },

  // 3. AI Architecture & LLM Engineering
  { category: 'AI_ENGINEERING', subCategory: 'Crisis Gate Safety', title: 'Crisis Gate AI deterministic bypass latency under 10ms for URGENT_EMERGENCY prompts', desc: 'Crisis detection gate must process self-harm / panic keywords strictly on-device in <10ms without hitting remote LLM.', priority: 'CRITICAL', assigned: 'AI Safety & Ethics Team' },
  { category: 'AI_ENGINEERING', subCategory: 'AI Voice Prescription', title: 'Optimize Speech-to-Text Whisper model latency for medical dosage parsing', desc: 'Voice prescription recording parsing taking >3.2 seconds. Need streaming chunk parsing via WebSockets.', priority: 'HIGH', assigned: 'AI Safety & Ethics Team' },
  { category: 'AI_ENGINEERING', subCategory: 'RAG Vector Store', title: 'Vector DB embedding index sync for 1,000+ medical guidelines & drug interactions', desc: 'Pinecone / Qdrant vector index out of sync with new NABL lab test reference values.', priority: 'HIGH', assigned: 'AI Safety & Ethics Team' },
  { category: 'AI_ENGINEERING', subCategory: 'Prompt Injection Defense', title: 'Harden AI Health Assistant system prompt against jailbreak injection attacks', desc: 'Red team security scan identified prompt bypass attempt targeting system constitution rules.', priority: 'CRITICAL', assigned: 'Application Security (SecOps)' },

  // 4. Automation, CI/CD & SecOps
  { category: 'SECOPS_AUTOMATION', subCategory: '4-Hr Scouting Agent', title: '4-Hour AI Scouting Agent background cron schedule execution monitoring', desc: 'Background schedule task `task-524` verified running on `0 */4 * * *` cron schedule pulling campus telemetry.', priority: 'HIGH', assigned: 'DevOps & Infrastructure Team' },
  { category: 'SECOPS_AUTOMATION', subCategory: 'GitHub Actions CI', title: 'GitHub Actions CI pipeline execution time optimization (Reduce from 8m to 2m)', desc: 'Cache node_modules and Vitest transform files to accelerate pull request quality gate checks.', priority: 'MEDIUM', assigned: 'DevOps & Infrastructure Team' },
  { category: 'SECOPS_AUTOMATION', subCategory: 'Knip Dead Code Audit', title: 'Automated Knip static analysis flagged 14 unused exports in legacy components', desc: 'Run `knip --no-exit-code` and tree-shake unused mock data structures to reduce bundle size by 120KB.', priority: 'LOW', assigned: 'QA Automation Team' },
  { category: 'SECOPS_AUTOMATION', subCategory: 'Semgrep SAST Security', title: 'Semgrep security rule scanner flagged potential XSS target in unescaped innerHTML', desc: 'Static analysis identified unescaped user note rendering in legacy support widget. Replace with DOMPurify.', priority: 'CRITICAL', assigned: 'Application Security (SecOps)' }
] as const;

export const CAMPUS_100_TICKETS: CampusTicket[] = Array.from({ length: 100 }).map((_, index) => {
  const tpl = DEV_SCALING_TEMPLATES[index % DEV_SCALING_TEMPLATES.length];
  const ticketId = `DEV-TCK-${2000 + index + 1}`;
  const team = TEAMS[index % TEAMS.length];
  
  const dateObj = new Date(Date.now() - (index * 30 * 60 * 1000));
  const timestamp = `${dateObj.toISOString().split('T')[0]} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  
  const statusOptions: CampusTicket['status'][] = index % 4 === 0 ? ['OPEN'] : index % 3 === 0 ? ['IN_PROGRESS'] : index % 7 === 0 ? ['ESCALATED'] : ['RESOLVED'];

  return {
    id: ticketId,
    studentId: `DEV-ENV-K8S-${(index + 1).toString().padStart(3, '0')}`,
    studentName: `Service Node #${(index % 12) + 1}`,
    hostelBlock: `Cluster Region us-central1-a (Node #${(index % 8) + 1})`,
    category: tpl.category as CampusTicket['category'],
    subCategory: tpl.subCategory,
    title: `${tpl.title} (Ticket #${index + 1})`,
    description: `${tpl.desc} [Production Kubernetes Cluster]`,
    priority: tpl.priority as CampusTicket['priority'],
    status: statusOptions[0],
    timestamp,
    assignedTeam: team,
    aiTriaged: true,
    resolutionNote: statusOptions[0] === 'RESOLVED' ? 'Automated PR merged, passed Vitest regression test suite & deployed to staging.' : undefined
  };
});
