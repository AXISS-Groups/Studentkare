/**
 * careerReportPdf.ts
 *
 * Generates a professional, multi-page PDF Career Report using jsPDF.
 * All data is passed in from the Career AI page — no new scoring or
 * API calls are introduced here.
 *
 * Pages:
 *   1. Cover — student name, target role, generation date, platform branding
 *   2. Career Overview — KPI summary (readiness, level, target, profile strength)
 *              + goal banner + progress bar
 *   3. Skill Analysis — radar chart + horizontal bar breakdown for each skill
 *   4. Career Journey — full milestone list with correct page breaks (unlimited)
 *   5. Score Contribution & Next Steps
 */

// Fix 11: GAINS is the single source of truth — imported from shared constants
import { GAINS } from './careerConstants';

// Colours matching the Career AI dark theme (re-stated as RGB for jsPDF)
const PDF_COLORS = {
  bg:       [13, 11, 31]   as [number,number,number],
  bgCard:   [22, 20, 48]   as [number,number,number],
  bgAccent: [35, 28, 70]   as [number,number,number],
  purple:   [109, 40, 217] as [number,number,number],
  purpleL:  [167,139, 250] as [number,number,number],
  purpleXL: [196, 181, 253]as [number,number,number],
  teal:     [45, 212, 191] as [number,number,number],
  blue:     [96, 165, 250] as [number,number,number],
  amber:    [251,191,  36] as [number,number,number],
  green:    [52, 211, 153] as [number,number,number],
  red:      [248,113, 113] as [number,number,number],
  pink:     [244,114, 182] as [number,number,number],
  white:    [240,238, 255] as [number,number,number],
  text2:    [160,155, 200] as [number,number,number],
  dim:      [100, 95, 150] as [number,number,number],
  border:   [40,  36,  80] as [number,number,number],
};

// Skill colour map
const SKILL_COLORS: Record<string, [number,number,number]> = {
  'Technical Excellence':        [94, 234, 212],
  'Professional Communication':  [167,139, 250],
  'Personal Brand':              [244,114, 182],
  'Leadership & Collaboration':  [245,158,  11],
  'Career Preparation':          [59, 130, 246],
  'Industry Presence':           [196,181, 253],
};

const SKILL_KEYS = [
  'Technical Excellence',
  'Professional Communication',
  'Personal Brand',
  'Leadership & Collaboration',
  'Career Preparation',
  'Industry Presence',
];

// Milestone type → colour
const MILESTONE_COLORS: Record<string, [number,number,number]> = {
  RESUME:         [167,139,250],
  PORTFOLIO:      [34, 211, 238],
  PROFILE:        [96, 165, 250],
  NETWORKING:     [45, 212, 191],
  SKILLS:         [245,158, 11],
  MOCK_INTERVIEW: [236, 72, 153],
  PROJECT:        [167,139,250],
  CERTIFICATION:  [16, 185,129],
  LINKEDIN:       [59, 130,246],
  JOB_APPLICATION:[251,191, 36],
};

/* ──────────────────────────────────────────────
   Types for report input data
────────────────────────────────────────────── */
export interface CareerReportData {
  /** User display name */
  studentName: string;
  /** e.g. "Software Engineer" */
  targetRole: string;
  /** e.g. "Top Tech Company" */
  targetCompany: string;
  /** 0-100 */
  readinessScore: number;
  /** e.g. "Builder" */
  readinessLevel: string;
  /** e.g. "Career Ready (61%)" */
  nextGoal: string;
  /** 0-100 */
  bandProgress: number;
  /** 0-100 */
  potentialScore: number;
  /** e.g. "Industry Ready" */
  potentialLevel: string;
  /** 0-100 */
  profileStrength: number;
  /** 0-100 — overall roadmap progress */
  progressPct: number;
  /** Skill streak in days */
  skillStreak?: number;
  /** ISO string */
  generatedAt?: string;
  /** e.g. "~14 Weeks" */
  estimatedWeeks: string;
  /** AI suggestion line */
  suggestion?: string;
  /** { 'Technical Excellence': 35, … } */
  skillScores: Record<string, number>;
  /** Full milestone list */
  milestones: {
    id: string;
    title: string;
    description: string;
    milestone_type: string;
    completed: boolean;
    completed_at?: string;
  }[];
  /** Top ranked actions [{type, title, gain}] */
  rankedActions: { type?: string; milestone_type?: string; title: string; gain: number; description?: string }[];
  /** AI suggestion line */
  aiInsights?: string[];
  /** Recruiter view scores */
  recruiterView?: { overall: number; resume: number; portfolio: number; communication: number; technical: number };
  /** AI recommendation object */
  recommendation?: { category: string; description: string; gain: string };
}

/* ──────────────────────────────────────────────
   Helpers
────────────────────────────────────────────── */
type RGB = [number, number, number];

function setFill(doc: any, rgb: RGB) { doc.setFillColor(...rgb); }
function setDraw(doc: any, rgb: RGB) { doc.setDrawColor(...rgb); }
function setTxt(doc: any, rgb: RGB)  { doc.setTextColor(...rgb); }
function setFont(doc: any, size: number, style: 'normal'|'bold' = 'normal') {
  doc.setFontSize(size);
  doc.setFont('helvetica', style);
}

/** Filled rounded rectangle */
function roundRect(doc: any, x: number, y: number, w: number, h: number, r: number, fill: RGB, stroke?: RGB) {
  setFill(doc, fill);
  if (stroke) { setDraw(doc, stroke); doc.roundedRect(x, y, w, h, r, r, 'FD'); }
  else { doc.roundedRect(x, y, w, h, r, r, 'F'); }
}

/** Horizontal progress bar */
function progressBar(
  doc: any,
  x: number, y: number, w: number, h: number,
  pct: number,
  trackColor: RGB, fillColor: RGB,
) {
  roundRect(doc, x, y, w, h, h / 2, trackColor);
  if (pct > 0) {
    const fw = Math.max(h, (pct / 100) * w);
    roundRect(doc, x, y, fw, h, h / 2, fillColor);
  }
}

/** Status badge pill */
function badge(doc: any, x: number, y: number, label: string, bg: RGB, fg: RGB) {
  setFont(doc, 7, 'bold');
  const tw = doc.getTextWidth(label);
  const bw = tw + 6; const bh = 6;
  roundRect(doc, x, y - 4, bw, bh, 2, bg);
  setTxt(doc, fg);
  doc.text(label, x + 3, y);
}

/** Section header bar */
function sectionHeader(doc: any, x: number, y: number, w: number, title: string) {
  roundRect(doc, x, y - 5, w, 10, 2, PDF_COLORS.bgAccent);
  setTxt(doc, PDF_COLORS.purpleXL);
  setFont(doc, 9, 'bold');
  doc.text(title, x + 6, y + 1);
  return y + 10;
}

/** Page background */
function drawPageBg(doc: any, pageW: number, pageH: number) {
  setFill(doc, PDF_COLORS.bg);
  doc.rect(0, 0, pageW, pageH, 'F');
}

/**
 * Fix 14: Vector radar/spider chart drawn with jsPDF primitives.
 * Renders a hexagonal radar chart for 6 skill dimensions.
 */
function drawRadarChart(
  doc: any,
  cx: number,
  cy: number,
  radius: number,
  skills: { key: string; score: number; color: [number,number,number] }[],
) {
  const n = skills.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2; // start at top

  const toXY = (level: number, i: number) => ({
    x: cx + radius * level * Math.cos(startAngle + i * angleStep),
    y: cy + radius * level * Math.sin(startAngle + i * angleStep),
  });

  // 1. Draw grid rings (20%, 40%, 60%, 80%, 100%)
  [0.2, 0.4, 0.6, 0.8, 1.0].forEach((lvl) => {
    const pts = skills.map((_, i) => toXY(lvl, i));
    setDraw(doc, lvl === 1.0 ? PDF_COLORS.border : [30, 25, 60]);
    doc.setLineWidth(0.25);
    pts.forEach((pt, i) => {
      const next = pts[(i + 1) % n];
      if (i === 0) doc.moveTo(pt.x, pt.y);
      doc.line(pt.x, pt.y, next.x, next.y);
    });
  });

  // 2. Spoke lines
  skills.forEach((_, i) => {
    const outer = toXY(1, i);
    setDraw(doc, PDF_COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(cx, cy, outer.x, outer.y);
  });

  // 3. Data polygon (filled with purple, semi-transparent approximation via alpha)
  const dataPoints = skills.map((sk, i) => toXY(sk.score / 100, i));
  setFill(doc, [109, 40, 217]);
  setDraw(doc, PDF_COLORS.purpleL);
  doc.setLineWidth(0.8);
  doc.setFillColor(109, 40, 217);
  doc.setDrawColor(...PDF_COLORS.purpleL);
  doc.setGState && doc.setGState(new (doc.GState || Object)({ opacity: 0.35 }));
  
  // Use lines to draw polygon
  if (dataPoints.length > 0) {
    doc.setFillColor(109, 40, 217);
    doc.setDrawColor(...PDF_COLORS.purpleL);
    doc.lines(
      dataPoints.slice(1).map((p, i) => [p.x - dataPoints[i].x, p.y - dataPoints[i].y]),
      dataPoints[0].x, dataPoints[0].y,
      [1, 1], 'FD', true,
    );
  }
  doc.setGState && doc.setGState(new (doc.GState || Object)({ opacity: 1.0 }));

  // 4. Draw vertex dots and skill labels
  skills.forEach((sk, i) => {
    
    const data_pt = toXY(sk.score / 100, i);

    // Data dot
    setFill(doc, sk.color);
    doc.circle(data_pt.x, data_pt.y, 1.5, 'F');

    // Label (positioned outside the outer ring)
    const labelPt = toXY(1.28, i);
    const shortKey = sk.key.replace(' & ', ' &\n').replace('Professional ', 'Prof. ');
    setTxt(doc, PDF_COLORS.text2);
    setFont(doc, 6);
    doc.text(shortKey, labelPt.x, labelPt.y, { align: 'center', baseline: 'middle' });

    // Score % next to dot
    setTxt(doc, sk.color);
    setFont(doc, 6.5, 'bold');
    const scorePt = toXY(sk.score / 100 + 0.12, i);
    doc.text(`${sk.score}%`, scorePt.x, scorePt.y, { align: 'center', baseline: 'middle' });
  });
}

/** Footer line */
function drawFooter(doc: any, pageW: number, pageH: number, pageNum: number, totalPages: number) {
  const y = pageH - 10;
  setDraw(doc, PDF_COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(14, y - 3, pageW - 14, y - 3);
  setTxt(doc, PDF_COLORS.dim);
  setFont(doc, 7);
  doc.text('Student Alumni AI • AI Career Roadmap', 14, y);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageW - 14, y, { align: 'right' });
}

export async function generateCareerReportPdf(data: CareerReportData): Promise<void> {
  // Dynamic script injection to bypass Metro bundler's strict AMD require parsing
  let jsPDF = (window as any).jspdf?.jsPDF;
  if (!jsPDF) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.integrity = "sha512-qZvrmS2ekKPF2mSznTQsxqPgnpkI4DNTlrdUmTzrDgektczlKNRRhy5X5AAOnx5S09ydFYWWNSfcEqDTTHgtNA==";
      script.crossOrigin = "anonymous";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    jsPDF = (window as any).jspdf.jsPDF;
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentW = pageW - marginX * 2;

  // We'll track pages: 1=Cover, 2=Overview, 3=Skills, 4=Journey, 5=Actions
  // Build all pages then set footer with correct totalPages

  /* ═══════════════════════════════════════════
     PAGE 1 – Cover
  ═══════════════════════════════════════════ */
  drawPageBg(doc, pageW, pageH);

  // Large gradient-ish top band
  setFill(doc, [35, 22, 80]);
  doc.rect(0, 0, pageW, 80, 'F');

  // Purple accent strip
  setFill(doc, PDF_COLORS.purple);
  doc.rect(0, 0, 5, 80, 'F');

  // Platform label
  setTxt(doc, PDF_COLORS.purpleL);
  setFont(doc, 9, 'bold');
  doc.text('STUDENT ALUMNI PLATFORM', marginX + 4, 18);

  // Main title
  setTxt(doc, PDF_COLORS.white);
  setFont(doc, 26, 'bold');
  doc.text('AI Career', marginX + 4, 38);
  setTxt(doc, PDF_COLORS.purpleL);
  doc.text('Roadmap Report', marginX + 4, 52);

  // Suggestion / tagline
  if (data.suggestion) {
    setTxt(doc, PDF_COLORS.text2);
    setFont(doc, 9);
    doc.text(`"${data.suggestion}"`, marginX + 4, 65, { maxWidth: contentW - 4 });
  }

  // Online indicator
  roundRect(doc, pageW - 50, 12, 36, 8, 3, [25, 60, 45]);
  setFill(doc, PDF_COLORS.green);
  doc.circle(pageW - 44, 16.5, 2, 'F');
  setTxt(doc, PDF_COLORS.green);
  setFont(doc, 8, 'bold');
  doc.text('ONLINE', pageW - 40, 17);

  // Student info card
  let cy = 96;
  roundRect(doc, marginX, cy, contentW, 38, 4, PDF_COLORS.bgCard, PDF_COLORS.border);
  setTxt(doc, PDF_COLORS.purpleXL);
  setFont(doc, 8, 'bold');
  doc.text('STUDENT', marginX + 8, cy + 9);
  setTxt(doc, PDF_COLORS.white);
  setFont(doc, 14, 'bold');
  doc.text(data.studentName, marginX + 8, cy + 20);
  setTxt(doc, PDF_COLORS.text2);
  setFont(doc, 9);
  doc.text('AI Readiness Report', marginX + 8, cy + 30);

  // Generation date on right
  setTxt(doc, PDF_COLORS.dim);
  setFont(doc, 8);
  const genDate = data.generatedAt
    ? new Date(data.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(genDate, pageW - marginX - 8, cy + 20, { align: 'right' });

  // Target role card
  cy += 50;
  roundRect(doc, marginX, cy, contentW, 28, 4, [30, 18, 70], PDF_COLORS.border);
  setFill(doc, PDF_COLORS.purple);
  doc.circle(marginX + 10, cy + 14, 6, 'F');
  setTxt(doc, PDF_COLORS.white);
  setFont(doc, 9, 'bold');
  doc.text('●', marginX + 7, cy + 16);  // briefcase placeholder
  setTxt(doc, PDF_COLORS.purpleXL);
  setFont(doc, 7, 'bold');
  doc.text('CURRENT GOAL', marginX + 22, cy + 9);
  setTxt(doc, PDF_COLORS.white);
  setFont(doc, 13, 'bold');
  doc.text(`${data.targetRole} at a ${data.targetCompany}`, marginX + 22, cy + 20, { maxWidth: contentW - 30 });

  // KPI summary row (4 tiles)
  cy += 40;
  const tileW = (contentW - 9) / 4;
  const tiles = [
    { label: 'READINESS', value: `${data.readinessScore}%`, sub: data.readinessLevel, color: PDF_COLORS.purpleL },
    { label: 'CAREER LEVEL', value: data.readinessLevel, sub: 'Current', color: PDF_COLORS.amber, smallVal: true },
    { label: 'TARGET', value: `${data.potentialScore}%`, sub: data.potentialLevel, color: PDF_COLORS.teal },
    { label: 'PROFILE', value: `${data.profileStrength}%`, sub: 'Strength', color: PDF_COLORS.blue },
  ];

  tiles.forEach((tile, i) => {
    const tx = marginX + i * (tileW + 3);
    roundRect(doc, tx, cy, tileW, 36, 3, PDF_COLORS.bgCard, PDF_COLORS.border);
    setTxt(doc, PDF_COLORS.dim);
    setFont(doc, 6.5, 'bold');
    doc.text(tile.label, tx + 5, cy + 8);
    setTxt(doc, tile.color);
    setFont(doc, tile.smallVal ? 11 : 14, 'bold');
    doc.text(tile.value, tx + 5, cy + 20, { maxWidth: tileW - 6 });
    setTxt(doc, PDF_COLORS.text2);
    setFont(doc, 7);
    doc.text(tile.sub, tx + 5, cy + 29);
  });

  // Progress bar section
  cy += 48;
  roundRect(doc, marginX, cy, contentW, 28, 4, PDF_COLORS.bgCard, PDF_COLORS.border);
  setTxt(doc, PDF_COLORS.text2);
  setFont(doc, 7, 'bold');
  doc.text('OVERALL CAREER PROGRESS', marginX + 8, cy + 9);
  setTxt(doc, PDF_COLORS.purpleXL);
  doc.text(`${data.progressPct}%`, pageW - marginX - 8, cy + 9, { align: 'right' });
  progressBar(doc, marginX + 8, cy + 15, contentW - 16, 5, data.progressPct, PDF_COLORS.bgAccent, PDF_COLORS.purpleL);
  setTxt(doc, PDF_COLORS.dim);
  setFont(doc, 7);
  doc.text(`Level: ${data.readinessLevel}   •   Target: ${data.potentialLevel}   •   ETA: ${data.estimatedWeeks}`, marginX + 8, cy + 25);

  // Cover footer note
  cy = pageH - 40;
  setTxt(doc, PDF_COLORS.dim);
  setFont(doc, 7);
  doc.text('This report was generated by the Student Alumni AI engine. Scores reflect real-time profile', marginX, cy, { align: 'left' });
  doc.text('completion, LLM analysis, and roadmap milestone progress.', marginX, cy + 5);

  /* ═══════════════════════════════════════════
     PAGE 2 – Skill Analysis
  ═══════════════════════════════════════════ */
  doc.addPage();
  drawPageBg(doc, pageW, pageH);

  let y = 20;
  // Page heading
  setTxt(doc, PDF_COLORS.white);
  setFont(doc, 16, 'bold');
  doc.text('Skill Intelligence Analysis', marginX, y);
  setTxt(doc, PDF_COLORS.text2);
  setFont(doc, 9);
  doc.text('Calculated from profile completion, projects, credentials & links', marginX, y + 8);
  y += 20;

  // Overall readiness score circle (simulated as large text)
  roundRect(doc, marginX, y, 50, 50, 6, PDF_COLORS.bgCard, PDF_COLORS.border);
  setTxt(doc, PDF_COLORS.purpleL);
  setFont(doc, 22, 'bold');
  doc.text(`${data.readinessScore}%`, marginX + 25, y + 24, { align: 'center' });
  setTxt(doc, PDF_COLORS.text2);
  setFont(doc, 7);
  doc.text('Overall Score', marginX + 25, y + 34, { align: 'center' });
  setTxt(doc, PDF_COLORS.purpleXL);
  setFont(doc, 8, 'bold');
  doc.text(data.readinessLevel, marginX + 25, y + 42, { align: 'center' });

  // Progress ring (drawn as concentric arcs using rect trick)
  progressBar(doc, marginX + 55, y + 18, contentW - 56, 4, data.readinessScore, PDF_COLORS.bgAccent, PDF_COLORS.purpleL);
  setTxt(doc, PDF_COLORS.dim);
  setFont(doc, 7);
  doc.text('Band progress towards next level', marginX + 55, y + 27);
  setTxt(doc, PDF_COLORS.purpleXL);
  setFont(doc, 8, 'bold');
  doc.text(`Next: ${data.nextGoal}`, marginX + 55, y + 36);

  y = sectionHeader(doc, marginX, y, contentW, 'SKILL ANALYSIS');

  // Fix 14: Add radar chart to skill analysis page
  const radarSkills = SKILL_KEYS.map(key => ({
    key,
    score: Math.round(data.skillScores[key] ?? 0),
    color: (SKILL_COLORS[key] || PDF_COLORS.purpleL) as [number,number,number],
  }));
  const radarCx = marginX + 42;
  const radarCy = y + 44;
  const radarR  = 36;
  drawRadarChart(doc, radarCx, radarCy, radarR, radarSkills);

  // Horizontal bars on the right side
  const barsX = marginX + 95;
  const barsW = contentW - 95;
  SKILL_KEYS.forEach((key, idx) => {
    const score = Math.round(data.skillScores[key] ?? 0);
    const colour = SKILL_COLORS[key] || PDF_COLORS.purpleL;
    const isStrong = score >= 60;
    const barY = y + idx * 16;

    setTxt(doc, PDF_COLORS.white);
    setFont(doc, 7.5, 'bold');
    doc.text(key, barsX, barY + 6);

    const statusLabel = isStrong ? 'Strong' : score >= 40 ? 'Developing' : 'Needs Focus';
    const statusBg: RGB = isStrong ? [16,100,60] : score >= 40 ? [100,80,10] : [100,30,30];
    const statusFg: RGB = isStrong ? PDF_COLORS.green : score >= 40 ? PDF_COLORS.amber : PDF_COLORS.red;
    badge(doc, barsX + 60, barY + 7, statusLabel, statusBg, statusFg);

    setTxt(doc, colour);
    setFont(doc, 8, 'bold');
    doc.text(`${score}%`, barsX + barsW, barY + 6, { align: 'right' });

    progressBar(doc, barsX, barY + 9, barsW - 4, 3, score, PDF_COLORS.bgAccent, colour);
  });

  y += Math.max(radarCy + radarR + 8 - (y + 60), SKILL_KEYS.length * 16 + 12) + 52;

  // Goal-awareness note
  roundRect(doc, marginX, y, contentW, 20, 3, [25, 16, 60], PDF_COLORS.border);
  setTxt(doc, PDF_COLORS.purpleXL);
  setFont(doc, 8, 'bold');
  doc.text('Score Methodology', marginX + 8, y + 8);
  setTxt(doc, PDF_COLORS.text2);
  setFont(doc, 7.5);
  doc.text(
    'Scores are weighted by goal profile, profile completion, uploaded credentials, and AI roadmap progress.',
    marginX + 8, y + 16, { maxWidth: contentW - 12 }
  );

  /* ═══════════════════════════════════════════
     PAGE 4+ – Career Journey  (Fix 6: cursor-tracked loop, unlimited milestones)
  ═══════════════════════════════════════════ */
  doc.addPage();
  drawPageBg(doc, pageW, pageH);

  // Page header helper
  const journeyPageHeader = () => {
    setTxt(doc, PDF_COLORS.white);
    setFont(doc, 16, 'bold');
    doc.text('Career Journey', marginX, 18);
    setTxt(doc, PDF_COLORS.text2);
    setFont(doc, 9);
    doc.text(
      `${data.targetRole} — ${data.milestones.filter(m => m.completed).length} of ${data.milestones.length} steps completed`,
      marginX, 26,
    );
    return 36; // cursorY after header
  };

  let cursorY = journeyPageHeader();
  const ROW_H      = 22;   // height of one milestone row
  const PAGE_GUARD = 18;   // bottom margin before forcing a new page
  const firstPendingIdx = data.milestones.findIndex(m => !m.completed);

  data.milestones.forEach((m, idx) => {
    // Fix 6: check if next row fits before drawing it
    if (cursorY + ROW_H > pageH - PAGE_GUARD) {
      doc.addPage();
      drawPageBg(doc, pageW, pageH);
      cursorY = journeyPageHeader();
    }

    const rowY = cursorY;
    const isCompleted = m.completed;
    const isActive    = !isCompleted && idx === firstPendingIdx;
    const gain = GAINS[m.milestone_type] || 3;

    // Alternating row bg
    if (idx % 2 === 0) roundRect(doc, marginX, rowY - 2, contentW, ROW_H, 2, [18, 15, 45]);

    // Step number circle
    const dotColor: RGB = isCompleted ? PDF_COLORS.green : isActive ? PDF_COLORS.purpleL : PDF_COLORS.dim;
    setFill(doc, dotColor);
    doc.circle(marginX + 7, rowY + 9, 5, 'F');
    setTxt(doc, PDF_COLORS.bg);
    setFont(doc, 6, 'bold');
    doc.text(`${idx + 1}`, marginX + 7, rowY + 11, { align: 'center' });

    // Step label
    setTxt(doc, isActive ? PDF_COLORS.purpleL : PDF_COLORS.dim);
    setFont(doc, 6.5, 'bold');
    doc.text(`STEP ${idx + 1}`, marginX + 16, rowY + 6);

    // Status badge
    if (isCompleted) {
      badge(doc, marginX + 36, rowY + 6, 'Completed', [16,80,50], PDF_COLORS.green);
    } else if (isActive) {
      badge(doc, marginX + 36, rowY + 6, 'Next Action', [60,30,120], PDF_COLORS.purpleL);
    } else {
      badge(doc, marginX + 36, rowY + 6, 'Locked', [40,38,60], PDF_COLORS.dim);
    }

    // Title
    setTxt(doc, isCompleted ? PDF_COLORS.text2 : PDF_COLORS.white);
    setFont(doc, 9, 'bold');
    doc.text(m.title, marginX + 16, rowY + 14, { maxWidth: contentW - 55 });

    // Description
    setTxt(doc, PDF_COLORS.text2);
    setFont(doc, 7.5);
    doc.text(m.description || '', marginX + 16, rowY + 20, { maxWidth: contentW - 55 });

    // Gain pill
    const gainX = pageW - marginX - 20;
    setFill(doc, [20, 80, 70]);
    doc.roundedRect(gainX - 2, rowY + 5, 22, 8, 2, 2, 'F');
    setTxt(doc, PDF_COLORS.teal);
    setFont(doc, 7.5, 'bold');
    doc.text(`+${gain}%`, gainX + 9, rowY + 11, { align: 'center' });

    // Timeline connector (bottom of dot to top of next)
    if (idx < data.milestones.length - 1) {
      setDraw(doc, isCompleted ? PDF_COLORS.green : PDF_COLORS.border);
      doc.setLineWidth(0.5);
      doc.line(marginX + 7, rowY + 14, marginX + 7, rowY + ROW_H);
    }

    cursorY += ROW_H; // advance cursor
  });

  /* ═══════════════════════════════════════════
     PAGE 4 – Score Contribution & Next Steps
  ═══════════════════════════════════════════ */
  doc.addPage();
  drawPageBg(doc, pageW, pageH);

  y = 20;
  setTxt(doc, PDF_COLORS.white);
  setFont(doc, 16, 'bold');
  doc.text('Score Contribution & Next Steps', marginX, y);
  setTxt(doc, PDF_COLORS.text2);
  setFont(doc, 9);
  doc.text('Top pending actions ranked by expected readiness gain', marginX, y + 8);
  y += 20;

  y = sectionHeader(doc, marginX, y, contentW, 'HIGHEST IMPACT ACTIONS');

  // Action cards in 2-column grid
  const colW = (contentW - 8) / 2;
  data.rankedActions.slice(0, 4).forEach((act, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const cardX = marginX + col * (colW + 8);
    const cardY = y + row * 42;
    const gain  = act.gain ?? GAINS[act.type || ''] ?? 3;
    const mType = (act.type || act.milestone_type || '').toUpperCase();
    const colour = MILESTONE_COLORS[mType] || PDF_COLORS.purpleL;
    const impactLabel = gain >= 10 ? 'High Impact' : gain >= 6 ? 'Medium Impact' : 'Low Impact';
    const impactColor: RGB = gain >= 10 ? PDF_COLORS.purpleL : gain >= 6 ? PDF_COLORS.teal : PDF_COLORS.amber;

    roundRect(doc, cardX, cardY, colW, 36, 4, PDF_COLORS.bgCard, PDF_COLORS.border);

    // Colour indicator bar on left
    setFill(doc, colour);
    doc.roundedRect(cardX, cardY, 3, 36, 1.5, 1.5, 'F');

    // Gain
    setTxt(doc, colour);
    setFont(doc, 16, 'bold');
    doc.text(`+${gain}%`, cardX + 10, cardY + 16);

    // Title
    setTxt(doc, PDF_COLORS.white);
    setFont(doc, 8.5, 'bold');
    doc.text(act.title || mType, cardX + 10, cardY + 25, { maxWidth: colW - 16 });

    // Impact badge
    setTxt(doc, impactColor);
    setFont(doc, 7, 'bold');
    doc.text(impactLabel, cardX + 10, cardY + 33);
  });

  y += Math.ceil(data.rankedActions.slice(0, 4).length / 2) * 42 + 14;

  // AI Recommendation box
  if (data.recommendation) {
    y = sectionHeader(doc, marginX, y, contentW, 'AI RECOMMENDATION');
    roundRect(doc, marginX, y, contentW, 40, 4, [25, 15, 60], PDF_COLORS.border);
    setFill(doc, PDF_COLORS.purple);
    doc.roundedRect(marginX, y, 3, 40, 1.5, 1.5, 'F');

    setTxt(doc, PDF_COLORS.purpleL);
    setFont(doc, 8, 'bold');
    doc.text((data.recommendation.category || '').toUpperCase(), marginX + 10, y + 10);

    setTxt(doc, PDF_COLORS.purpleXL);
    setFont(doc, 7, 'bold');
    doc.text(`Gain: ${data.recommendation.gain}`, pageW - marginX - 8, y + 10, { align: 'right' });

    setTxt(doc, PDF_COLORS.white);
    setFont(doc, 9);
    doc.text(data.recommendation.description || '', marginX + 10, y + 20, { maxWidth: contentW - 16 });
    y += 50;
  }

  // Potential score summary
  y = sectionHeader(doc, marginX, y, contentW, 'CAREER POTENTIAL SUMMARY');
  const summaryRows = [
    { label: 'Current Readiness', value: `${data.readinessScore}%`, color: PDF_COLORS.purpleL },
    { label: 'Target Readiness', value: `${data.potentialScore}%`, color: PDF_COLORS.teal },
    { label: 'Readiness Gap', value: `${Math.max(0, data.potentialScore - data.readinessScore)}%`, color: PDF_COLORS.amber },
    { label: 'Pending Steps', value: `${data.milestones.filter(m => !m.completed).length}`, color: PDF_COLORS.blue },
    { label: 'Estimated Timeline', value: data.estimatedWeeks, color: PDF_COLORS.green },
    { label: 'Profile Strength', value: `${data.profileStrength}%`, color: PDF_COLORS.pink },
  ];

  const sumW = (contentW - 8) / 3;
  summaryRows.forEach((row, idx) => {
    const col = idx % 3;
    const row_ = Math.floor(idx / 3);
    const cx_ = marginX + col * (sumW + 4);
    const cy_ = y + row_ * 26;
    roundRect(doc, cx_, cy_, sumW, 22, 3, PDF_COLORS.bgCard, PDF_COLORS.border);
    setTxt(doc, PDF_COLORS.dim);
    setFont(doc, 7);
    doc.text(row.label, cx_ + 6, cy_ + 9);
    setTxt(doc, row.color);
    setFont(doc, 11, 'bold');
    doc.text(row.value, cx_ + 6, cy_ + 19);
  });

  // Closing statement
  y += 62;
  roundRect(doc, marginX, y, contentW, 22, 3, [20, 14, 50], PDF_COLORS.border);
  setTxt(doc, PDF_COLORS.text2);
  setFont(doc, 7.5);
  doc.text(
    'This report was generated by Student Alumni AI and reflects your current profile state, LLM-analysed roadmap,',
    marginX + 8, y + 9, { maxWidth: contentW - 12 }
  );
  doc.text(
    `and real-time skill intelligence. Generated on ${genDate}.`,
    marginX + 8, y + 17, { maxWidth: contentW - 12 }
  );

  /* ── Footer on all pages ── */
  const totalPages = (doc.internal as any).getNumberOfPages?.() ?? 4;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, pageW, pageH, p, totalPages);
  }

  /* ── Save ── */
  const safeRole = (data.targetRole || 'career').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`career-report-${safeRole}-${dateStr}.pdf`);
}
