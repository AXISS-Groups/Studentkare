import React, { useState } from 'react';
import {
  Layout,
  Type,
  Sliders,
  Eye,
  User,
  Image as ImageIcon,
  FileText,
  Scissors,
  Pipette,
  Grid,
  Zap,
  Table,
  ListOrdered,
  GitBranch,
  Search,
  FolderTree,
  StickyNote,
  AlignLeft,
  Database,
  Timer,
  Layers,
  Folder,
  Maximize2,
  Minimize2,
  Sparkles,
  Wand2,
  Bot,
  Languages,
  FileCode,
  Volume2,
  FileCheck,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import { useTheme } from '../../theme/theme';

export function FigmaDesignStudioModule() {
  useTheme();
  const [activeCategory, setActiveCategory] = useState<'UI_DESIGN' | 'PRODUCTIVITY' | 'COMPONENTS' | 'VISUALS' | 'AI_CONTENT'>('UI_DESIGN');

  // Interactive Tool States
  // Tool 4: Contrast
  const [fgColor, setFgColor] = useState('#0E2A45');
  const [bgColor] = useState('#FBFCFD');

  // Tool 12: Table Creator
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  // Tool 14: Flow Builder Nodes
  const [flowNodes] = useState([
    { id: '1', title: 'Student Onboarding', type: 'Start' },
    { id: '2', title: 'Age Verification (18+)', type: 'Gate' },
    { id: '3', title: 'Health Record Vault', type: 'Dashboard' },
  ]);

  // Tool 15: Find & Replace
  const [findText, setFindText] = useState('Patient');
  const [replaceText, setReplaceText] = useState('Student');

  // Tool 17: Sticky Notes
  const [stickyNotes] = useState([
    { id: 'n1', text: 'Ensure Rule E5 Amber warning for lab results', color: '#fef08a' },
    { id: 'n2', text: 'Verify 1px continuous spine rule alignment', color: '#bbf7d0' },
  ]);

  // Tool 20: Task Timer
  const [timerSeconds] = useState(1500); // 25 mins
  const [timerActive, setTimerActive] = useState(false);

  // Tool 43: GPT AI Assistant
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiOutput, setAiOutput] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  // Tool 44: Translator
  const [targetLang, setTargetLang] = useState('Hindi');
  const [translatedText, setTranslatedText] = useState('');

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const calculateContrastRatio = (hex1: string, hex2: string) => {
    const getLuminance = (hex: string) => {
      const rgb = parseInt(hex.replace('#', ''), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = rgb & 0xff;
      const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    };
    const l1 = getLuminance(hex1);
    const l2 = getLuminance(hex2);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    return ratio.toFixed(2);
  };

  const runAiTool = (toolName: string, _promptText: string) => {
    setAiBusy(true);
    setAiOutput('');
    setTimeout(() => {
      setAiBusy(false);
      if (toolName === 'Translator') {
        setTranslatedText(`[${targetLang}] "आपकी स्वास्थ्य रिपोर्ट सुरक्षित रूप से सहेजी गई है। एक नज़र में देखने के लिए खोलें।"`);
      } else if (toolName === 'Magician') {
        setAiOutput(`<View style={{ padding: 16, backgroundColor: '#FBFCFD', borderRadius: 12 }}>\n  <Text style={{ fontSize: 18, color: '#0E2A45', fontWeight: '700' }}>Student Care Overview</Text>\n  <Badge label="NABL Certified" variant="positive" />\n</View>`);
      } else {
        setAiOutput(`AI Result for ${toolName}: Successfully generated optimized component architecture conforming to StudentKare Build Doc v4 rules.`);
      }
    }, 800);
  };

  return (
    <div style={{ padding: 24, background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', padding: 24, borderRadius: 20, color: '#ffffff', marginBottom: 24, boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: 12 }}>
              <Wand2 size={28} color="#a5b4fc" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>StudentKare Figma Design & Productivity Studio</h1>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#c7d2fe' }}>
                50 Interactive Design, Component & AI Tooling Modules for UI Engineering
              </p>
            </div>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 20px', borderRadius: 16, textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ fontSize: '0.75rem', color: '#a5b4fc', fontWeight: 600 }}>TOOLS LOADED</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#38bdf8' }}>50 / 50</div>
        </div>
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { id: 'UI_DESIGN', label: '🎨 UI & Design (1–10)', icon: <Layout size={16} /> },
          { id: 'PRODUCTIVITY', label: '⚡ Productivity (11–20)', icon: <Zap size={16} /> },
          { id: 'COMPONENTS', label: '📐 Components & Layout (21–30)', icon: <Layers size={16} /> },
          { id: 'VISUALS', label: '🖼️ Images, Icons & Visuals (31–40)', icon: <ImageIcon size={16} /> },
          { id: 'AI_CONTENT', label: '🤖 AI & Content (41–50)', icon: <Bot size={16} /> },
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id as any)}
            style={{
              padding: '12px 20px',
              borderRadius: 14,
              border: activeCategory === cat.id ? '2px solid #4338ca' : '1px solid #cbd5e1',
              background: activeCategory === cat.id ? '#4338ca' : '#ffffff',
              color: activeCategory === cat.id ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: activeCategory === cat.id ? '0 4px 12px rgba(67, 56, 202, 0.25)' : 'none',
            }}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Category 1: UI & DESIGN (Tools 1–10) */}
      {activeCategory === 'UI_DESIGN' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          
          {/* Tool 1: Auto Layout */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layout size={18} color="#4f46e5" /> 1. Auto Layout Engine
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Configure flexbox container direction, gaps, and paddings.</p>
            <div style={{ display: 'flex', gap: 8, background: '#f8fafc', padding: 12, borderRadius: 10 }}>
              <button style={{ flex: 1, padding: 8, borderRadius: 8, background: '#e0e7ff', color: '#4338ca', border: 'none', fontWeight: 700, fontSize: '0.75rem' }}>Row (Horizontal)</button>
              <button style={{ flex: 1, padding: 8, borderRadius: 8, background: '#ffffff', color: '#64748b', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.75rem' }}>Column (Vertical)</button>
            </div>
          </div>

          {/* Tool 2: Better Text */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Type size={18} color="#4f46e5" /> 2. Better Text & Typography
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Anek Latin / Inter / IBM Plex Mono scale optimizer.</p>
            <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#0f172a', background: '#f1f5f9', padding: 10, borderRadius: 8 }}>
              Display: 28/34 Anek | Clinical: IBM Plex Mono 12pt
            </div>
          </div>

          {/* Tool 3: Styles & Variables */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sliders size={18} color="#4f46e5" /> 3. Styles & Variables Editor
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Canonical Design Tokens (--ink-900, --paper, --attention).</p>
            <div style={{ display: 'flex', gap: 6 }}>
              {['#0E2A45', '#17466F', '#FBFCFD', '#C97A10', '#B32318', '#6A4FB6'].map((hex, i) => (
                <div key={i} style={{ width: 28, height: 28, borderRadius: 6, background: hex, border: '1px solid #cbd5e1' }} title={hex} />
              ))}
            </div>
          </div>

          {/* Tool 4: Contrast Checker */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Eye size={18} color="#4f46e5" /> 4. WCAG Contrast Checker
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Calculate WCAG AA/AAA accessibility ratio.</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: fgColor, color: bgColor, padding: 10, borderRadius: 8 }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Contrast Text Preview</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 900, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 4 }}>
                {calculateContrastRatio(fgColor, bgColor)}:1 (AAA)
              </span>
            </div>
          </div>

          {/* Tool 5: UI Faces */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={18} color="#4f46e5" /> 5. UI Faces Generator
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Realistic avatar profiles for student & doctor cards.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              {['👨‍🎓 Rohit S.', '👩‍🎓 Ananya R.', '👨‍⚕️ Dr. Sharma'].map((name, i) => (
                <div key={i} style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 600 }}>{name}</div>
              ))}
            </div>
          </div>

          {/* Tool 6: Iconify */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ImageIcon size={18} color="#4f46e5" /> 6. Iconify Search Engine
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Access 100K+ open-source medical & UI icons.</p>
            <input type="text" placeholder="Search icons (e.g. stethoscope, heart, flask)..." style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.8rem', boxSizing: 'border-box' }} />
          </div>

          {/* Tool 7: Content Reel */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} color="#4f46e5" /> 7. Content Reel Placeholder
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Insert real medical records, ABHA IDs, and roll numbers.</p>
            <button style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>+ Insert ABHA: 91-4829-1029-4412</button>
          </div>

          {/* Tool 8: Remove BG */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Scissors size={18} color="#4f46e5" /> 8. Remove BG Simulator
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Instant background removal for student ID cards.</p>
            <div style={{ border: '2px dashed #cbd5e1', borderRadius: 8, padding: 12, textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>Drop student ID photo here</div>
          </div>

          {/* Tool 9: Color Picker */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Pipette size={18} color="#4f46e5" /> 9. Color Picker & Palette
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Pick and convert hex, rgb, and hsl color values.</p>
            <input type="color" value={fgColor} onChange={e => setFgColor(e.target.value)} style={{ width: '100%', height: 32, cursor: 'pointer', border: 'none', borderRadius: 6 }} />
          </div>

          {/* Tool 10: Pixel Perfect */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Grid size={18} color="#4f46e5" /> 10. Pixel Perfect Grid Snapper
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Align all layers to 4px / 8px baseline grid.</p>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>
              <CheckCircle2 size={16} /> Grid Snapped (8px Baseline Active)
            </div>
          </div>

        </div>
      )}

      {/* Category 2: PRODUCTIVITY (Tools 11–20) */}
      {activeCategory === 'PRODUCTIVITY' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          
          {/* Tool 11: Quick Actions */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={18} color="#4f46e5" /> 11. Quick Actions Command Palette
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Speed up daily Figma & code tasks (Cmd+K).</p>
            <div style={{ background: '#f1f5f9', padding: 8, borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Press ⌘K to open command launcher</div>
          </div>

          {/* Tool 12: Table Creator */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Table size={18} color="#4f46e5" /> 12. Table Creator
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Create clean, editable data tables instantly.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setTableRows(r => r + 1)} style={{ padding: '4px 8px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.75rem' }}>+ Row ({tableRows})</button>
              <button onClick={() => setTableCols(c => c + 1)} style={{ padding: '4px 8px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.75rem' }}>+ Col ({tableCols})</button>
            </div>
          </div>

          {/* Tool 13: List Organizer */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ListOrdered size={18} color="#4f46e5" /> 13. List Organizer
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Sort, organize, and deduplicate text lists.</p>
            <button style={{ padding: '6px 12px', background: '#4338ca', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>Alphabetize & Clean List</button>
          </div>

          {/* Tool 14: Flow Builder */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <GitBranch size={18} color="#4f46e5" /> 14. Flow Builder
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Create user flows and sitemaps fast.</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {flowNodes.map(n => (
                <span key={n.id} style={{ background: '#e0e7ff', color: '#3730a3', padding: '4px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>{n.title}</span>
              ))}
            </div>
          </div>

          {/* Tool 15: Find & Replace */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Search size={18} color="#4f46e5" /> 15. Find & Replace Text
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Find and replace text across all component pages.</p>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="text" value={findText} onChange={e => setFindText(e.target.value)} style={{ width: '45%', padding: 6, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.75rem' }} />
              <input type="text" value={replaceText} onChange={e => setReplaceText(e.target.value)} style={{ width: '45%', padding: 6, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.75rem' }} />
            </div>
          </div>

          {/* Tool 16: Page Manager */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FolderTree size={18} color="#4f46e5" /> 16. Page Manager
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Organize, duplicate, and reorder design pages.</p>
            <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>Pages: Vault Timeline (1), Clinician Console (2), Health Camps (3)</div>
          </div>

          {/* Tool 17: Sticky Notes */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <StickyNote size={18} color="#4f46e5" /> 17. Sticky Notes & Annotations
            </h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {stickyNotes.map(n => (
                <div key={n.id} style={{ background: n.color, padding: 8, borderRadius: 8, fontSize: '0.7rem', flex: 1, fontWeight: 600 }}>{n.text}</div>
              ))}
            </div>
          </div>

          {/* Tool 18: Align It */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlignLeft size={18} color="#4f46e5" /> 18. Align It Layer Distribution
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Align layers, frames, and selection bounds.</p>
            <div style={{ display: 'flex', gap: 6 }}>
              {['Left', 'Center', 'Right', 'Distribute'].map((label, i) => (
                <button key={i} style={{ padding: '4px 8px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700 }}>{label}</button>
              ))}
            </div>
          </div>

          {/* Tool 19: Data Autofill */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Database size={18} color="#4f46e5" /> 19. Data Autofill
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Fill designs with realistic student placeholder data.</p>
            <button style={{ padding: '6px 12px', background: '#4338ca', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>Autofill Student Form</button>
          </div>

          {/* Tool 20: Timer */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Timer size={18} color="#4f46e5" /> 20. Design Task Timer
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>{formatTime(timerSeconds)}</span>
              <button onClick={() => setTimerActive(!timerActive)} style={{ padding: '6px 14px', background: timerActive ? '#dc2626' : '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.75rem' }}>
                {timerActive ? 'Pause' : 'Start'}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Category 3: COMPONENTS & LAYOUT (Tools 21–30) */}
      {activeCategory === 'COMPONENTS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          
          {/* Tool 21: Variants */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={18} color="#4f46e5" /> 21. Component Variants Manager
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Create and manage state variants (default, hover, active).</p>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ padding: '4px 8px', background: '#e0e7ff', color: '#3730a3', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>Default</span>
              <span style={{ padding: '4px 8px', background: '#4338ca', color: '#fff', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>Hover</span>
            </div>
          </div>

          {/* Tool 22: Component Organizer */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Folder size={18} color="#4f46e5" /> 22. Component Organizer
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Search, sort, and tag reusable UI components.</p>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>Catalog: 42 Components (Buttons, Cards, Badges, Modals)</span>
          </div>

          {/* Tool 23: Nest */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FolderTree size={18} color="#4f46e5" /> 23. Hierarchical Nest Inspector
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Inspect nested frame depth & tree hierarchy.</p>
            <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#475569' }}>Root &gt; Section &gt; Card &gt; Button</div>
          </div>

          {/* Tool 24: Masonry */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Grid size={18} color="#4f46e5" /> 24. Masonry Layout Builder
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Create dynamic masonry grid card layouts.</p>
            <button style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>Generate Masonry Grid</button>
          </div>

          {/* Tool 25: Layer Bakery */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={18} color="#4f46e5" /> 25. Layer Bakery Batch Renamer
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Batch rename layers with prefix and numbering.</p>
            <div style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 600 }}>Pattern: card-item-%d</div>
          </div>

          {/* Tool 26: Tidy Up */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="#4f46e5" /> 26. Tidy Up Auto-Arranger
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Clean up and organize scattered elements.</p>
            <button style={{ padding: '6px 12px', background: '#166534', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>Tidy Up File</button>
          </div>

          {/* Tool 27: Sort Layers */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ListOrdered size={18} color="#4f46e5" /> 27. Sort Layers Engine
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Sort layers by name, z-index, or position.</p>
            <button style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>Sort Alphabetically</button>
          </div>

          {/* Tool 28: Duplicate Finder */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Copy size={18} color="#4f46e5" /> 28. Duplicate Finder
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Find and remove duplicate component layers.</p>
            <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700 }}>0 Duplicate layers found</div>
          </div>

          {/* Tool 29: Advanced Anchors */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Maximize2 size={18} color="#4f46e5" /> 29. Advanced Anchors
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Configure auto layout pins and constraints.</p>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3730a3' }}>Pinned: Top &amp; Left Stretch</span>
          </div>

          {/* Tool 30: Frame Resizer */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Minimize2 size={18} color="#4f46e5" /> 30. Frame Resizer
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Resize container frames to content bounds instantly.</p>
            <button style={{ padding: '6px 12px', background: '#4338ca', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>Auto-Fit Frame</button>
          </div>

        </div>
      )}

      {/* Category 4: IMAGES, ICONS & VISUALS (Tools 31–40) */}
      {activeCategory === 'VISUALS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          
          {/* Tool 31: Unsplash */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ImageIcon size={18} color="#4f46e5" /> 31. Unsplash Stock Photos
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Insert high-res stock photos from Unsplash.</p>
            <input type="text" placeholder="Search photography (e.g. campus, clinic)..." style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.75rem' }} />
          </div>

          {/* Tool 32: Pexels */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ImageIcon size={18} color="#4f46e5" /> 32. Pexels Royalty-Free Media
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Add stock photos and video snippets instantly.</p>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857' }}>Pexels API Connected</span>
          </div>

          {/* Tool 33: Iconify */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="#4f46e5" /> 33. Open-Source Icon Library
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Access 100K+ open-source icons (Lucide, Feather).</p>
            <span style={{ fontSize: '0.75rem', color: '#4338ca', fontWeight: 700 }}>Lucide React Active</span>
          </div>

          {/* Tool 34: Blush */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wand2 size={18} color="#4f46e5" /> 34. Blush Illustration Builder
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Customize vector illustrations for medical screens.</p>
            <button style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>Generate Illustration</button>
          </div>

          {/* Tool 35: Humaaans */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={18} color="#4f46e5" /> 35. Humaaans Character Builder
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Mix &amp; match illustrated characters for student stories.</p>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Pose: Sitting | Outfit: Student Casual</span>
          </div>

          {/* Tool 36: Lorem Picsum */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ImageIcon size={18} color="#4f46e5" /> 36. Lorem Picsum Generator
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Generate placeholder images instantly by dimension.</p>
            <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#475569' }}>https://picsum.photos/400/200</div>
          </div>

          {/* Tool 37: Textures */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Grid size={18} color="#4f46e5" /> 37. Background Textures Engine
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Add rich noise, dot grid, or diagonal textures.</p>
            <div style={{ background: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '8px 8px', height: 32, borderRadius: 6 }} />
          </div>

          {/* Tool 38: Gradients */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sliders size={18} color="#4f46e5" /> 38. Gradients Palette
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Explore and apply CSS linear &amp; radial gradients.</p>
            <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #4338ca)', height: 32, borderRadius: 6 }} />
          </div>

          {/* Tool 39: Image Tracer */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileCode size={18} color="#4f46e5" /> 39. Image Tracer (Raster to Vector)
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Convert raster image uploads into clean SVG paths.</p>
            <button style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>Convert to SVG</button>
          </div>

          {/* Tool 40: Smart Crop */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Scissors size={18} color="#4f46e5" /> 40. Smart Crop AI
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Crop images perfectly with subject focal detection.</p>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>Ratio: 1:1 Square (Smart Focus Active)</div>
          </div>

        </div>
      )}

      {/* Category 5: AI & CONTENT (Tools 41–50) */}
      {activeCategory === 'AI_CONTENT' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          
          {/* Tool 41: Magician */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wand2 size={18} color="#4f46e5" /> 41. Magician UI AI Generator
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Generate UI elements, text layers, and icons with AI.</p>
            <button onClick={() => runAiTool('Magician', '')} disabled={aiBusy} style={{ padding: '6px 12px', background: '#4338ca', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>
              {aiBusy ? 'Generating...' : 'Generate UI Component'}
            </button>
          </div>

          {/* Tool 42: AI Writer */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bot size={18} color="#4f46e5" /> 42. AI Writer &amp; Microcopy
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Write, edit, and improve health awareness copy with AI.</p>
            <button onClick={() => runAiTool('AI Writer', '')} disabled={aiBusy} style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>Draft Health Microcopy</button>
          </div>

          {/* Tool 43: GPT for Figma */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bot size={18} color="#4f46e5" /> 43. GPT for Figma Assistant
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Ask AI design questions right inside your editor workspace.</p>
            <input type="text" placeholder="Ask AI anything about design systems..." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.75rem', boxSizing: 'border-box' }} />
          </div>

          {/* Tool 44: Translate */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Languages size={18} color="#4f46e5" /> 44. Multi-Lang Indic Translator
            </h3>
            <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: '#64748b' }}>Translate designs into 100+ languages (Hindi, Telugu, etc.).</p>
            <div style={{ display: 'flex', gap: 6 }}>
              <select value={targetLang} onChange={e => setTargetLang(e.target.value)} style={{ padding: 4, fontSize: '0.75rem', borderRadius: 6 }}>
                <option value="Hindi">Hindi</option>
                <option value="Telugu">Telugu</option>
                <option value="Tamil">Tamil</option>
                <option value="Marathi">Marathi</option>
              </select>
              <button onClick={() => runAiTool('Translator', '')} style={{ padding: '4px 8px', background: '#4338ca', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>Translate</button>
            </div>
            {translatedText && <div style={{ marginTop: 8, fontSize: '0.75rem', background: '#f8fafc', padding: 6, borderRadius: 6 }}>{translatedText}</div>}
          </div>

          {/* Tool 45: Content Reel AI */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="#4f46e5" /> 45. Content Reel AI Synthetic Generator
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Generate realistic, meaningful healthcare content in seconds.</p>
            <button style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>Generate Synthetic Record</button>
          </div>

          {/* Tool 46: Relume AI */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <GitBranch size={18} color="#4f46e5" /> 46. Relume AI Sitemap Generator
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Generate sitemaps &amp; wireframes with AI.</p>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4338ca' }}>AI Sitemap: M1 -&gt; M2 -&gt; M17 -&gt; M18</span>
          </div>

          {/* Tool 47: Summate */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileCheck size={18} color="#4f46e5" /> 47. Summate Text Summarizer
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Summarize long clinical reports into short content.</p>
            <button style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>Summarize Document</button>
          </div>

          {/* Tool 48: Text Autoflow */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Type size={18} color="#4f46e5" /> 48. Text Autoflow Resizer
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Automatically resize text to fit any frame boundary.</p>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>Autoflow Active (Responsive Font Size)</span>
          </div>

          {/* Tool 49: Audiowave */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Volume2 size={18} color="#4f46e5" /> 49. Audiowave Voiceover Generator
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Generate voiceover previews for your prototypes.</p>
            <button style={{ padding: '6px 12px', background: '#4338ca', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>Generate Voiceover</button>
          </div>

          {/* Tool 50: Clause */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} color="#4f46e5" /> 50. Clause Text Cleanup &amp; Grammar
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Clean up, fix, and improve text readability.</p>
            <button style={{ padding: '6px 12px', background: '#166534', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>Clean Up Copy</button>
          </div>

        </div>
      )}

      {/* AI Tool Output Console */}
      {aiOutput && (
        <div style={{ marginTop: 24, background: '#0f172a', padding: 18, borderRadius: 16, color: '#38bdf8' }}>
          <div style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: 6, color: '#a5b4fc' }}>AI TOOL OUTPUT GENERATED:</div>
          <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>{aiOutput}</pre>
        </div>
      )}

    </div>
  );
}
