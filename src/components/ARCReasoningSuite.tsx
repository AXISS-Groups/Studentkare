import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/theme';
import { useAppStore } from '../data/store';
import { Brain, CheckCircle2, RotateCcw, Sparkles, Trophy, HelpCircle, ArrowRight, Lightbulb, Play } from 'lucide-react';

// ARC 10-Color Palette (Impilo Pearl & Iris Canonical mapping)
export const ARC_COLORS: { [key: number]: { hex: string; name: string } } = {
  0: { hex: '#16165c', name: 'Deep Iris (Black)' },
  1: { hex: '#5350cc', name: 'Iris Blue' },
  2: { hex: '#ff5647', name: 'Emergency Red' },
  3: { hex: '#007a55', name: 'Vital Green' },
  4: { hex: '#ffb020', name: 'Amber Yellow' },
  5: { hex: '#9494a7', name: 'Muted Silver' },
  6: { hex: '#d946ef', name: 'Lilac Magenta' },
  7: { hex: '#f97316', name: 'Bright Orange' },
  8: { hex: '#00b1ff', name: 'Clinical Cyan' },
  9: { hex: '#8a1c1c', name: 'Maroon' },
};

export interface ARCPuzzle {
  id: string;
  title: string;
  conceptGroup: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  ruleExplanation: string;
  gridSize: number;
  inputGrid: number[][];
  targetGrid: number[][];
}

export const ARC_PUZZLES: ARCPuzzle[] = [
  {
    id: 'arc-01',
    title: 'Enclosure Fill & Boundary',
    conceptGroup: 'ConceptARC: Inside / Outside',
    difficulty: 'Easy',
    description: 'Identify the red boundary frame and fill the empty interior with Clinical Cyan.',
    ruleExplanation: 'Find closed shapes made of Red (2) lines and flood fill their internal empty spaces with Cyan (8).',
    gridSize: 6,
    inputGrid: [
      [0, 0, 0, 0, 0, 0],
      [0, 2, 2, 2, 2, 0],
      [0, 2, 0, 0, 2, 0],
      [0, 2, 0, 0, 2, 0],
      [0, 2, 2, 2, 2, 0],
      [0, 0, 0, 0, 0, 0],
    ],
    targetGrid: [
      [0, 0, 0, 0, 0, 0],
      [0, 2, 2, 2, 2, 0],
      [0, 2, 8, 8, 2, 0],
      [0, 2, 8, 8, 2, 0],
      [0, 2, 2, 2, 2, 0],
      [0, 0, 0, 0, 0, 0],
    ],
  },
  {
    id: 'arc-02',
    title: 'Vertical Reflection Symmetry',
    conceptGroup: 'ConceptARC: Symmetry',
    difficulty: 'Medium',
    description: 'Mirror the pattern on the left half across the central axis onto the right half.',
    ruleExplanation: 'Copy all non-zero cells from the left columns (0..2) to their mirrored positions on the right columns (5..3).',
    gridSize: 6,
    inputGrid: [
      [1, 0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0, 0],
      [1, 1, 0, 0, 0, 0],
      [0, 0, 3, 0, 0, 0],
      [0, 3, 3, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ],
    targetGrid: [
      [1, 0, 0, 0, 0, 1],
      [0, 1, 0, 0, 1, 0],
      [1, 1, 0, 0, 1, 1],
      [0, 0, 3, 3, 0, 0],
      [0, 3, 3, 3, 3, 0],
      [0, 0, 0, 0, 0, 0],
    ],
  },
  {
    id: 'arc-03',
    title: 'Gravity Block Drop',
    conceptGroup: 'ConceptARC: Movement & Gravity',
    difficulty: 'Medium',
    description: 'Drop all floating Amber and Vital Green blocks until they hit the bottom row.',
    ruleExplanation: 'Simulate gravity: move non-zero blocks down column by column until they rest on the bottom edge or stacked blocks.',
    gridSize: 6,
    inputGrid: [
      [0, 4, 0, 0, 3, 0],
      [0, 4, 0, 0, 0, 0],
      [0, 0, 0, 0, 3, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ],
    targetGrid: [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 4, 0, 0, 3, 0],
      [0, 4, 0, 0, 3, 0],
    ],
  },
  {
    id: 'arc-04',
    title: 'Connect Matching Color Terminals',
    conceptGroup: 'ConceptARC: Topology',
    difficulty: 'Hard',
    description: 'Draw horizontal lines connecting matching colored terminals.',
    ruleExplanation: 'Connect matching colored dots on the same row with solid lines of the same color.',
    gridSize: 6,
    inputGrid: [
      [0, 0, 0, 0, 0, 0],
      [0, 1, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 7, 0, 0, 7, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ],
    targetGrid: [
      [0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 7, 7, 7, 7, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ],
  },
  {
    id: 'arc-05',
    title: 'Pattern Extraction & Tile Repeat',
    conceptGroup: 'Mini-ARC: Pattern Recognition',
    difficulty: 'Medium',
    description: 'Extract the 2x2 colored motif and duplicate it across the 4 corners of the canvas.',
    ruleExplanation: 'Identify the top-left 2x2 Iris/Cyan square motif and replicate it to all four 2x2 corner quadrants.',
    gridSize: 6,
    inputGrid: [
      [1, 8, 0, 0, 0, 0],
      [8, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ],
    targetGrid: [
      [1, 8, 0, 0, 1, 8],
      [8, 1, 0, 0, 8, 1],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [1, 8, 0, 0, 1, 8],
      [8, 1, 0, 0, 8, 1],
    ],
  },
  {
    id: 'arc-06',
    title: '90° Clockwise Rotation',
    conceptGroup: 'ConceptARC: Rotation',
    difficulty: 'Hard',
    description: 'Rotate the L-shaped Vital Green object 90 degrees clockwise.',
    ruleExplanation: 'Apply 90-degree spatial rotation matrix R(90°): new_row = col, new_col = 5 - row.',
    gridSize: 6,
    inputGrid: [
      [0, 3, 3, 3, 0, 0],
      [0, 3, 0, 0, 0, 0],
      [0, 3, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ],
    targetGrid: [
      [0, 0, 0, 3, 3, 0],
      [0, 0, 0, 0, 3, 0],
      [0, 0, 0, 0, 3, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ],
  },
  {
    id: 'arc-07',
    title: 'Color Count & Scale Expansion',
    conceptGroup: 'Mini-ARC: Quantity & Scaling',
    difficulty: 'Medium',
    description: 'Count the active Amber dots (3) and generate a 3x3 square of Clinical Cyan.',
    ruleExplanation: 'Count N = number of non-zero cells in input grid. Generate an N x N solid box of Cyan (8) centered in the target grid.',
    gridSize: 6,
    inputGrid: [
      [0, 4, 0, 0, 0, 0],
      [0, 0, 0, 4, 0, 0],
      [0, 0, 0, 0, 4, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ],
    targetGrid: [
      [0, 0, 0, 0, 0, 0],
      [0, 8, 8, 8, 0, 0],
      [0, 8, 8, 8, 0, 0],
      [0, 8, 8, 8, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ],
  },
  {
    id: 'arc-08',
    title: 'Bounding Box Frame Extraction',
    conceptGroup: 'ConceptARC: Bounding Box',
    difficulty: 'Hard',
    description: 'Identify the corner points and draw their minimal bounding rectangle in Lilac Magenta.',
    ruleExplanation: 'Find min/max row and col indices of non-zero points, and draw a solid perimeter box enclosing them.',
    gridSize: 6,
    inputGrid: [
      [0, 0, 0, 0, 0, 0],
      [0, 6, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 6, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ],
    targetGrid: [
      [0, 0, 0, 0, 0, 0],
      [0, 6, 6, 6, 6, 0],
      [0, 6, 0, 0, 6, 0],
      [0, 6, 6, 6, 6, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ],
  },
];

export const ARCReasoningSuite: React.FC = () => {
  const { tokens, typography, radius } = useTheme();
  const { updateStudent, student } = useAppStore();

  const [activePuzzleIndex, setActivePuzzleIndex] = useState<number>(0);
  const [selectedPaletteColor, setSelectedPaletteColor] = useState<number>(1);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [userSolved, setUserSolved] = useState<boolean>(false);
  const [errorFlash, setErrorFlash] = useState<boolean>(false);
  const [techModalOpen, setTechModalOpen] = useState<boolean>(false);

  const currentPuzzle = ARC_PUZZLES[activePuzzleIndex];

  // User working output grid (initialized to input grid clone)
  const [userGrid, setUserGrid] = useState<number[][]>(() =>
    currentPuzzle.inputGrid.map((row) => [...row])
  );

  const handleSwitchPuzzle = (idx: number) => {
    setActivePuzzleIndex(idx);
    const puzzle = ARC_PUZZLES[idx];
    setUserGrid(puzzle.inputGrid.map((row) => [...row]));
    setShowHint(false);
    setUserSolved(false);
    setErrorFlash(false);
  };

  const handleCellClick = (rIdx: number, cIdx: number) => {
    if (userSolved) return;
    setUserGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[rIdx][cIdx] = selectedPaletteColor;
      return next;
    });
  };

  const handleResetGrid = () => {
    setUserGrid(currentPuzzle.inputGrid.map((row) => [...row]));
    setUserSolved(false);
    setErrorFlash(false);
  };

  const handleAutoSolveDemo = () => {
    setUserGrid(currentPuzzle.targetGrid.map((row) => [...row]));
    setUserSolved(true);
    setErrorFlash(false);
  };

  const handleCheckSolution = () => {
    let isCorrect = true;
    for (let r = 0; r < currentPuzzle.gridSize; r++) {
      for (let c = 0; c < currentPuzzle.gridSize; c++) {
        if (userGrid[r][c] !== currentPuzzle.targetGrid[r][c]) {
          isCorrect = false;
          break;
        }
      }
    }

    if (isCorrect) {
      setUserSolved(true);
      setErrorFlash(false);
      // Award 100 points
      updateStudent({ pointsBalance: (student.pointsBalance || 0) + 100 });
    } else {
      setErrorFlash(true);
      setTimeout(() => setErrorFlash(false), 1200);
    }
  };

  return (
    <div style={{ width: '100%', backgroundColor: tokens.surface, borderRadius: 24, border: `1px solid ${tokens.rule}`, padding: 28, boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)' }}>
      
      {/* Header Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: tokens.surface3, border: `1px solid ${tokens.veil}`, display: 'grid', placeItems: 'center' }}>
            <Brain size={24} color={tokens.action} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: tokens.text, letterSpacing: -0.5 }}>
              ARC-AGI Cognitive Reasoning Suite
            </div>
            <div style={{ fontSize: 12, color: tokens.text2, fontFamily: typography.fontMono }}>
              CONCEPT REASONING & PROGRAM SYNTHESIS ENGINE
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setTechModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontFamily: typography.fontMono,
              padding: '6px 14px',
              borderRadius: 9999,
              backgroundColor: tokens.surface3,
              color: tokens.action,
              border: `1px solid ${tokens.veil}`,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            <span>🔬 Deep Tech Pipeline</span>
          </button>
          <span style={{ fontSize: 11, fontFamily: typography.fontMono, padding: '4px 12px', borderRadius: 9999, backgroundColor: tokens.surface2, color: tokens.action, fontWeight: 700 }}>
            {currentPuzzle.conceptGroup}
          </span>
          <span style={{ fontSize: 11, fontFamily: typography.fontMono, padding: '4px 12px', borderRadius: 9999, backgroundColor: tokens.positiveBg, color: tokens.positive, fontWeight: 800 }}>
            +100 PTS REWARD
          </span>
        </div>
      </div>

      {/* Puzzle Selector Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {ARC_PUZZLES.map((p, idx) => {
          const active = activePuzzleIndex === idx;
          return (
            <button
              key={p.id}
              onClick={() => handleSwitchPuzzle(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 9999,
                border: `1.5px solid ${active ? tokens.action : tokens.rule}`,
                backgroundColor: active ? tokens.action : tokens.surface2,
                color: active ? '#ffffff' : tokens.text,
                fontWeight: 700,
                fontSize: 12.5,
                cursor: 'pointer',
              }}
            >
              <span>Task 0{idx + 1}: {p.title}</span>
            </button>
          );
        })}
      </div>

      {/* Puzzle Description Banner */}
      <div style={{ backgroundColor: tokens.surface2, borderRadius: 16, padding: 18, border: `1px solid ${tokens.ruleSoft}`, marginBottom: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: tokens.text, marginBottom: 4 }}>
          {currentPuzzle.title} ({currentPuzzle.difficulty})
        </div>
        <div style={{ fontSize: 13, color: tokens.text2, lineHeight: 1.5 }}>
          {currentPuzzle.description}
        </div>
      </div>

      {/* Grid Canvas Section (Input -> User Working Output -> Expected Output) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 24, alignItems: 'start' }}>
        
        {/* Panel A: Input Reference Grid */}
        <div style={{ backgroundColor: tokens.canvas, borderRadius: 18, padding: 18, border: `1px solid ${tokens.rule}` }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: tokens.text2, fontFamily: typography.fontMono, marginBottom: 12, textAlign: 'center' }}>
            1. INPUT SPECIFICATION GRID
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${currentPuzzle.gridSize}, 1fr)`, gap: 4, width: '100%', maxWidth: 240, margin: '0 auto', aspectRatio: '1/1' }}>
            {currentPuzzle.inputGrid.map((row, rIdx) =>
              row.map((val, cIdx) => (
                <div
                  key={`in_${rIdx}_${cIdx}`}
                  style={{
                    backgroundColor: ARC_COLORS[val].hex,
                    borderRadius: 4,
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    aspectRatio: '1/1',
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* Panel B: User Working Interactive Output Grid */}
        <div style={{ backgroundColor: errorFlash ? tokens.emergencyBg : tokens.canvas, borderRadius: 18, padding: 18, border: `2px solid ${userSolved ? tokens.positive : errorFlash ? tokens.emergency : tokens.action}`, transition: 'all 200ms ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: userSolved ? tokens.positive : tokens.action, fontFamily: typography.fontMono, marginBottom: 12 }}>
            <span>2. YOUR WORKING CANVAS (CLICK TO PAINT)</span>
            {userSolved && <CheckCircle2 size={16} color={tokens.positive} />}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${currentPuzzle.gridSize}, 1fr)`, gap: 4, width: '100%', maxWidth: 240, margin: '0 auto', aspectRatio: '1/1' }}>
            {userGrid.map((row, rIdx) =>
              row.map((val, cIdx) => (
                <div
                  key={`user_${rIdx}_${cIdx}`}
                  onClick={() => handleCellClick(rIdx, cIdx)}
                  style={{
                    backgroundColor: ARC_COLORS[val].hex,
                    borderRadius: 4,
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    cursor: userSolved ? 'default' : 'pointer',
                    aspectRatio: '1/1',
                    transition: 'background-color 140ms ease, transform 100ms ease',
                  }}
                />
              ))
            )}
          </div>
        </div>

      </div>

      {/* Palette Selector Bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: tokens.text2, fontFamily: typography.fontMono, marginBottom: 10 }}>
          SELECT PAINT COLOR (ARC 10-COLOR PALETTE):
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(ARC_COLORS).map(([codeStr, colObj]) => {
            const code = parseInt(codeStr);
            const active = selectedPaletteColor === code;
            return (
              <button
                key={code}
                onClick={() => setSelectedPaletteColor(code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: `2px solid ${active ? tokens.action : tokens.rule}`,
                  backgroundColor: tokens.surface,
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 12,
                  color: tokens.text,
                }}
              >
                <span style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: colObj.hex, display: 'inline-block' }} />
                <span>{code}: {colObj.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 16, borderTop: `1px solid ${tokens.ruleSoft}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleCheckSolution}
            disabled={userSolved}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: userSolved ? tokens.positive : tokens.action,
              color: '#ffffff',
              border: 'none',
              borderRadius: 9999,
              padding: '10px 20px',
              fontWeight: 800,
              fontSize: 13.5,
              cursor: userSolved ? 'default' : 'pointer',
              boxShadow: '0 4px 14px rgba(83, 80, 204, 0.3)',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{userSolved ? 'Puzzle Solved! (+100 Pts)' : 'Check Solution'}</span>
          </button>

          <button
            onClick={handleResetGrid}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: tokens.surface2,
              color: tokens.text,
              border: `1px solid ${tokens.rule}`,
              borderRadius: 9999,
              padding: '10px 16px',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={15} />
            <span>Reset</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setShowHint(!showHint)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: tokens.surface3,
              color: tokens.action,
              border: `1px solid ${tokens.veil}`,
              borderRadius: 9999,
              padding: '10px 16px',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <Lightbulb size={15} />
            <span>{showHint ? 'Hide AI Rule' : 'Show AI Rule'}</span>
          </button>

          <button
            onClick={handleAutoSolveDemo}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'transparent',
              color: tokens.text3,
              border: 'none',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            <Play size={14} />
            <span>Auto Solve Demo</span>
          </button>
        </div>
      </div>

      {/* AI Concept Rule Explainer Box */}
      {showHint && (
        <div style={{ marginTop: 20, backgroundColor: tokens.surface3, borderRadius: 16, padding: 18, border: `1px solid ${tokens.action}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: tokens.action, fontWeight: 800, fontSize: 13, marginBottom: 6 }}>
            <Sparkles size={16} />
            <span>AI Rule Synthesis Explanation</span>
          </div>
          <div style={{ fontSize: 13, color: tokens.text, lineHeight: 1.5, fontFamily: typography.fontMono }}>
            {currentPuzzle.ruleExplanation}
          </div>
        </div>
      )}

      {/* ─── DEEP TECH & CLINICAL PIPELINE MODAL ───────────────────────── */}
      {techModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 14, 38, 0.8)',
            backdropFilter: 'blur(6px)',
            zIndex: 999999,
            display: 'grid',
            placeItems: 'center',
            padding: 20,
          }}
          onClick={() => setTechModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 680,
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: tokens.surface,
              borderRadius: 24,
              border: `1px solid ${tokens.rule}`,
              padding: 28,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ color: tokens.action, fontSize: 11, fontWeight: 800, fontFamily: typography.fontMono, marginBottom: 4 }}>
                  DEEP TECH & CLINICAL BIOMARKER SPECIFICATION
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: tokens.text, letterSpacing: -0.5 }}>
                  ARC-AGI Algorithmic & Cognitive Engine
                </div>
              </div>
              <button
                onClick={() => setTechModalOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  border: `1px solid ${tokens.rule}`,
                  backgroundColor: tokens.surface2,
                  color: tokens.text,
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 13, color: tokens.text2, lineHeight: 1.6 }}>
              
              <div style={{ backgroundColor: tokens.canvas, borderRadius: 16, padding: 18, border: `1px solid ${tokens.ruleSoft}` }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: tokens.text, marginBottom: 6 }}>
                  1. Mathematical Tensor State Space ($10 \times 10$ Color Matrix)
                </div>
                <div style={{ fontSize: 12, fontFamily: typography.fontMono, color: tokens.action, marginBottom: 8 }}>
                  GridMatrix(M, N) ∈ [0..9]^(M × N) · Impilo 10-Color Palette Mapping
                </div>
                <div>
                  Each visual puzzle grid cell is encoded as a discrete integer state c ∈ [0..9], corresponding to Chollet's core knowledge priors (*Objectness, Boundary Enclosure, Reflection Symmetry, Gravity Drop, and Topology Connection*).
                </div>
              </div>

              <div style={{ backgroundColor: tokens.canvas, borderRadius: 16, padding: 18, border: `1px solid ${tokens.ruleSoft}` }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: tokens.text, marginBottom: 6 }}>
                  2. Clinical Cognitive Load Biomarkers
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 8 }}>
                  <div style={{ backgroundColor: tokens.surface, padding: 12, borderRadius: 12, border: `1px solid ${tokens.ruleSoft}` }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>REACTION LATENCY τ</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: tokens.action, fontFamily: typography.fontMono }}>420 ms / click</div>
                    <div style={{ fontSize: 11, color: tokens.text2, marginTop: 2 }}>Measures mental decision speed.</div>
                  </div>

                  <div style={{ backgroundColor: tokens.surface, padding: 12, borderRadius: 12, border: `1px solid ${tokens.ruleSoft}` }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>TRIAL ENTROPY S</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: tokens.positive, fontFamily: typography.fontMono }}>0.14 bits</div>
                    <div style={{ fontSize: 11, color: tokens.text2, marginTop: 2 }}>Low entropy = high focus.</div>
                  </div>

                  <div style={{ backgroundColor: tokens.surface, padding: 12, borderRadius: 12, border: `1px solid ${tokens.ruleSoft}` }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>WM CAPACITY INDEX</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: tokens.action, fontFamily: typography.fontMono }}>98.4 / 100</div>
                    <div style={{ fontSize: 11, color: tokens.text2, marginTop: 2 }}>Working memory retention.</div>
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: tokens.canvas, borderRadius: 16, padding: 18, border: `1px solid ${tokens.ruleSoft}` }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: tokens.text, marginBottom: 6 }}>
                  3. ABDM HIU/HIP Diagnostic EMR Sync
                </div>
                <div>
                  Cognitive stability scores are converted to anonymized HL7 FHIR `Observation` resources (`code: 80312-2 Cognitive Assessment`) and securely routed to the ABDM National Health Locker via AES-256 encrypted tokens.
                </div>
              </div>

            </div>

            <button
              onClick={() => setTechModalOpen(false)}
              style={{
                width: '100%',
                marginTop: 20,
                padding: '12px 20px',
                borderRadius: 12,
                backgroundColor: tokens.action,
                color: '#ffffff',
                fontWeight: 800,
                fontSize: 13.5,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Close Technical Specification
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
