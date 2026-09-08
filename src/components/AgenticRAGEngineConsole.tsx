import React, { useState } from 'react';
import { useTheme } from '../theme/theme';
import {
  RAGPipelineEngine,
  SimpleReflexAgent,
  ModelBasedReflexAgent,
  GoalBasedAgent,
  UtilityBasedAgent,
  LearningAgent,
  ReActLoopAgent,
  MultiAgentOrchestrator,
  ReActStep,
  MultiAgentMessage,
} from '../ai/agenticRAGEngine';
import { aiApi } from '../data/api';
import {
  Brain,
  Users,
  RefreshCw,
  Database,
  Sliders,
} from 'lucide-react';

export const AgenticRAGEngineConsole: React.FC = () => {
  const { tokens, typography } = useTheme();

  const [activeTab, setActiveTab] = useState<'CLASSICAL' | 'REACT_LOOP' | 'MULTI_AGENT' | 'RAG_VECTOR'>('CLASSICAL');

  // Agent Engines Instances
  const [ragEngine] = useState(() => new RAGPipelineEngine());
  const [simpleAgent] = useState(() => new SimpleReflexAgent());
  const [modelAgent] = useState(() => new ModelBasedReflexAgent());
  const [goalAgent] = useState(() => new GoalBasedAgent());
  const [utilityAgent] = useState(() => new UtilityBasedAgent());
  const [learningAgent] = useState(() => new LearningAgent());
  const [reActAgent] = useState(() => new ReActLoopAgent());
  const [swarmOrchestrator] = useState(() => new MultiAgentOrchestrator());

  // Interactive State Output
  const [reflexOutput, setReflexOutput] = useState<string | null>(null);
  const [modelStateOutput, setModelStateOutput] = useState<{ trend: string; action: string } | null>(null);
  const [goalOutput, setGoalOutput] = useState<string[]>([]);
  const [utilityOutput, setUtilityOutput] = useState<{ bestOption: string; utilityScore: number } | null>(null);
  const [ setLearningOutput ] = useState<string | null>(null);

  // ReAct Loop State
  const [reActSteps, setReActSteps] = useState<ReActStep[]>([]);
  const [isReActRunning, setIsReActRunning] = useState(false);

  // Multi-Agent Swarm Messages
  const [swarmMessages, setSwarmMessages] = useState<MultiAgentMessage[]>([]);

  // RAG Search Query State
  const [ragQuery, setRagQuery] = useState('Dengue fever monsoon protocol & NSAID contraindications');
  const [ragResult, setRagResult] = useState<{ response: string; retrievedChunks: any[] } | null>(null);

  // 1. Run Classical Agent Demonstrations
  const runReflex = () => {
    setReflexOutput(simpleAgent.evaluate(101.2, '142/88'));
  };

  const runModelBased = () => {
    setModelStateOutput(modelAgent.updateStateAndAct(101.4));
  };

  const runGoalBased = () => {
    setGoalOutput(goalAgent.planToReachGoal(8000, 6420));
  };

  const runUtilityBased = () => {
    setUtilityOutput(
      utilityAgent.selectBestClinicRoute([
        { provider: 'Campus Teleconsult', speedMins: 15, cost: 0, rating: 4.9 },
        { provider: 'City Hospital OPD', speedMins: 45, cost: 850, rating: 4.5 },
        { provider: 'Express Hostel Clinic', speedMins: 20, cost: 200, rating: 4.8 },
      ])
    );
  };

  

  // 2. Run ReAct Thought Loop Agent
  const runReActLoop = () => {
    setIsReActRunning(true);
    setReActSteps([]);
    const steps = reActAgent.executeLoop('Inspect student low haemoglobin & generate iron mess plan');
    
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < steps.length) {
        setReActSteps((prev) => [...prev, steps[idx]]);
        idx++;
      } else {
        clearInterval(interval);
        setIsReActRunning(false);
      }
    }, 700);
  };

  // 3. Run Multi-Agent Swarm Orchestrator
  const runSwarmTeam = () => {
    const msgs = swarmOrchestrator.runMultiAgentTeam('Student reporting acute headache & mild fever');
    setSwarmMessages(msgs);
  };

  // 4. Run RAG Vector Search & Synthesis
  const runRAGSearch = () => {
    const res = ragEngine.generateRAGResponse(ragQuery);
    setRagResult(res);
    // Enhance with the on-prem vector store / LLM when reachable.
    aiApi.ragQuery(ragQuery, 2).then((remote) => {
      if (remote && remote.synthesizedResponse) {
        setRagResult({
          response: remote.synthesizedResponse,
          retrievedChunks: remote.retrievedChunks || [],
        });
      }
    });
  };

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: tokens.surface,
        borderRadius: 24,
        border: `1.5px solid ${tokens.rule}`,
        padding: 28,
        boxShadow: '0 10px 32px rgba(83, 80, 204, 0.06)',
      }}
    >
      {/* Console Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: tokens.surface3, border: `1px solid ${tokens.veil}`, display: 'grid', placeItems: 'center' }}>
            <Brain size={24} color={tokens.action} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: tokens.text, letterSpacing: -0.5 }}>
              Agentic AI Framework & RAG Pipeline Engine
            </div>
            <div style={{ fontSize: 12, color: tokens.text2, fontFamily: typography.fontMono }}>
              5 CLASSICAL AGENTS · ReAct THOUGHT LOOPS · MULTI-AGENT SWARM · VECTOR RAG
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'CLASSICAL', label: '5 Classical Agents', icon: <Sliders size={14} /> },
            { id: 'REACT_LOOP', label: 'ReAct Loop Agent', icon: <RefreshCw size={14} /> },
            { id: 'MULTI_AGENT', label: 'Multi-Agent Swarm', icon: <Users size={14} /> },
            { id: 'RAG_VECTOR', label: 'RAG Vector Pipeline', icon: <Database size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 800,
                border: `1px solid ${activeTab === tab.id ? tokens.action : tokens.rule}`,
                backgroundColor: activeTab === tab.id ? tokens.action : tokens.surface2,
                color: activeTab === tab.id ? '#ffffff' : tokens.text,
                cursor: 'pointer',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── TAB 1: 5 CLASSICAL AGENTS PLAYGROUND ─────────────────────── */}
      {activeTab === 'CLASSICAL' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          
          {/* Agent 1: Simple Reflex */}
          <div style={{ backgroundColor: tokens.canvas, borderRadius: 18, padding: 18, border: `1px solid ${tokens.ruleSoft}` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: tokens.action, fontFamily: typography.fontMono, marginBottom: 4 }}>
              1. SIMPLE REFLEX AGENT
            </div>
            <div style={{ fontSize: 14, fontWeight: 900, color: tokens.text, marginBottom: 6 }}>Immediate Condition-Action</div>
            <div style={{ fontSize: 12, color: tokens.text2, lineHeight: 1.4, marginBottom: 12 }}>
              If Temp &gt; 100.4°F $\rightarrow$ Trigger Fever SOS.
            </div>
            <button onClick={runReflex} style={{ width: '100%', padding: 8, borderRadius: 10, backgroundColor: tokens.surface3, color: tokens.action, border: `1px solid ${tokens.veil}`, fontWeight: 800, fontSize: 11, cursor: 'pointer' }}>
              Execute Reflex Rule
            </button>
            {reflexOutput && <div style={{ marginTop: 10, fontSize: 11, color: tokens.positive, fontWeight: 700, backgroundColor: tokens.positiveBg, padding: 8, borderRadius: 8 }}>{reflexOutput}</div>}
          </div>

          {/* Agent 2: Model-Based Reflex */}
          <div style={{ backgroundColor: tokens.canvas, borderRadius: 18, padding: 18, border: `1px solid ${tokens.ruleSoft}` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: tokens.action, fontFamily: typography.fontMono, marginBottom: 4 }}>
              2. MODEL-BASED REFLEX
            </div>
            <div style={{ fontSize: 14, fontWeight: 900, color: tokens.text, marginBottom: 6 }}>Internal State History</div>
            <div style={{ fontSize: 12, color: tokens.text2, lineHeight: 1.4, marginBottom: 12 }}>
              Tracks historical temp changes over 3 consecutive readings.
            </div>
            <button onClick={runModelBased} style={{ width: '100%', padding: 8, borderRadius: 10, backgroundColor: tokens.surface3, color: tokens.action, border: `1px solid ${tokens.veil}`, fontWeight: 800, fontSize: 11, cursor: 'pointer' }}>
              Push New State Reading
            </button>
            {modelStateOutput && (
              <div style={{ marginTop: 10, fontSize: 11, color: tokens.text, backgroundColor: tokens.surface2, padding: 8, borderRadius: 8 }}>
                <b>Trend:</b> {modelStateOutput.trend}<br />
                <b>Action:</b> {modelStateOutput.action}
              </div>
            )}
          </div>

          {/* Agent 3: Goal-Based Agent */}
          <div style={{ backgroundColor: tokens.canvas, borderRadius: 18, padding: 18, border: `1px solid ${tokens.ruleSoft}` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: tokens.action, fontFamily: typography.fontMono, marginBottom: 4 }}>
              3. GOAL-BASED AGENT
            </div>
            <div style={{ fontSize: 14, fontWeight: 900, color: tokens.text, marginBottom: 6 }}>Multi-Step Planning</div>
            <div style={{ fontSize: 12, color: tokens.text2, lineHeight: 1.4, marginBottom: 12 }}>
              Target: Reach 8,000 Pedometer Steps.
            </div>
            <button onClick={runGoalBased} style={{ width: '100%', padding: 8, borderRadius: 10, backgroundColor: tokens.surface3, color: tokens.action, border: `1px solid ${tokens.veil}`, fontWeight: 800, fontSize: 11, cursor: 'pointer' }}>
              Formulate Plan to Goal
            </button>
            {goalOutput.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 11, color: tokens.text, backgroundColor: tokens.surface2, padding: 8, borderRadius: 8 }}>
                {goalOutput.map((step, i) => (
                  <div key={i} style={{ marginBottom: 2 }}>{step}</div>
                ))}
              </div>
            )}
          </div>

          {/* Agent 4: Utility-Based Agent */}
          <div style={{ backgroundColor: tokens.canvas, borderRadius: 18, padding: 18, border: `1px solid ${tokens.ruleSoft}` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: tokens.action, fontFamily: typography.fontMono, marginBottom: 4 }}>
              4. UTILITY-BASED AGENT
            </div>
            <div style={{ fontSize: 14, fontWeight: 900, color: tokens.text, marginBottom: 6 }}>Utility Function U(x)</div>
            <div style={{ fontSize: 12, color: tokens.text2, lineHeight: 1.4, marginBottom: 12 }}>
              Optimizes Rating, Speed &amp; Cost tradeoff.
            </div>
            <button onClick={runUtilityBased} style={{ width: '100%', padding: 8, borderRadius: 10, backgroundColor: tokens.surface3, color: tokens.action, border: `1px solid ${tokens.veil}`, fontWeight: 800, fontSize: 11, cursor: 'pointer' }}>
              Calculate Best Utility Option
            </button>
            {utilityOutput && (
              <div style={{ marginTop: 10, fontSize: 11, color: tokens.positive, fontWeight: 700, backgroundColor: tokens.positiveBg, padding: 8, borderRadius: 8 }}>
                {utilityOutput.bestOption}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ─── TAB 2: REACT LOOP AGENT VISUALIZER ────────────────────────── */}
      {activeTab === 'REACT_LOOP' && (
        <div style={{ backgroundColor: tokens.canvas, borderRadius: 20, padding: 24, border: `1.5px solid ${tokens.ruleSoft}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: tokens.text }}>
                ReAct (Reasoning + Acting) Thought Loop Visualizer
              </div>
              <div style={{ fontSize: 12, color: tokens.text2, marginTop: 2 }}>
                Executes Thought $\rightarrow$ Action $\rightarrow$ Observation loops until final clinical goal is reached.
              </div>
            </div>
            <button
              onClick={runReActLoop}
              disabled={isReActRunning}
              style={{
                backgroundColor: tokens.action,
                color: '#ffffff',
                border: 'none',
                borderRadius: 12,
                padding: '10px 20px',
                fontWeight: 800,
                fontSize: 12,
                cursor: isReActRunning ? 'wait' : 'pointer',
              }}
            >
              {isReActRunning ? 'Running Loop...' : 'Execute ReAct Loop'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {reActSteps.map((step) => (
              <div key={step.step} style={{ backgroundColor: tokens.surface, borderRadius: 16, padding: 16, border: `1px solid ${tokens.rule}` }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: tokens.action, fontFamily: typography.fontMono, marginBottom: 4 }}>
                  STEP {step.step}: REASONING &amp; TOOL CALL
                </div>
                <div style={{ fontSize: 13, color: tokens.text, marginBottom: 8 }}>
                  <b>Thought:</b> {step.thought}
                </div>
                {step.action && (
                  <div style={{ fontSize: 12, fontFamily: typography.fontMono, color: tokens.positive, backgroundColor: tokens.positiveBg, padding: '6px 12px', borderRadius: 8, marginBottom: 6 }}>
                    <b>Action:</b> {step.action}
                  </div>
                )}
                {step.observation && (
                  <div style={{ fontSize: 12, color: tokens.text2, backgroundColor: tokens.surface2, padding: '6px 12px', borderRadius: 8 }}>
                    <b>Observation:</b> {step.observation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 3: MULTI-AGENT SWARM ORCHESTRATOR ──────────────────────── */}
      {activeTab === 'MULTI_AGENT' && (
        <div style={{ backgroundColor: tokens.canvas, borderRadius: 20, padding: 24, border: `1.5px solid ${tokens.ruleSoft}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: tokens.text }}>
                Autonomous Multi-Agent Team Orchestrator
              </div>
              <div style={{ fontSize: 12, color: tokens.text2, marginTop: 2 }}>
                4 Specialized Agents collaborating: Diagnostics $\rightarrow$ Pharma $\rightarrow$ Claims $\rightarrow$ Campus Logistics.
              </div>
            </div>
            <button
              onClick={runSwarmTeam}
              style={{
                backgroundColor: tokens.action,
                color: '#ffffff',
                border: 'none',
                borderRadius: 12,
                padding: '10px 20px',
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Trigger Swarm Team Handshake
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {swarmMessages.map((msg, i) => (
              <div key={i} style={{ backgroundColor: tokens.surface, borderRadius: 16, padding: 16, border: `1px solid ${tokens.rule}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: tokens.action }}>{msg.sender}</div>
                  <div style={{ fontSize: 11, color: tokens.text3, fontFamily: typography.fontMono }}>Role: {msg.role}</div>
                  <div style={{ fontSize: 13, color: tokens.text, marginTop: 6 }}>{msg.message}</div>
                </div>
                <span style={{ fontSize: 10, fontFamily: typography.fontMono, color: tokens.text3 }}>{msg.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 4: RAG VECTOR PIPELINE ENGINE ──────────────────────────── */}
      {activeTab === 'RAG_VECTOR' && (
        <div style={{ backgroundColor: tokens.canvas, borderRadius: 20, padding: 24, border: `1.5px solid ${tokens.ruleSoft}` }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: tokens.text, marginBottom: 6 }}>
            Vector Embedding Search &amp; RAG LLM Generation Pipeline
          </div>
          <div style={{ fontSize: 12, color: tokens.text2, marginBottom: 16 }}>
            Queries clinical vector database using Cosine Similarity to retrieve top-$K$ medical guidelines and synthesize answers.
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <input
              type="text"
              value={ragQuery}
              onChange={(e) => setRagQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 12,
                border: `1px solid ${tokens.rule}`,
                backgroundColor: tokens.surface,
                color: tokens.text,
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              onClick={runRAGSearch}
              style={{
                backgroundColor: tokens.action,
                color: '#ffffff',
                border: 'none',
                borderRadius: 12,
                padding: '10px 22px',
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Retrieve &amp; Generate RAG
            </button>
          </div>

          {ragResult && (
            <div style={{ backgroundColor: tokens.surface, borderRadius: 16, padding: 20, border: `1px solid ${tokens.rule}` }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: tokens.positive, fontFamily: typography.fontMono, marginBottom: 8 }}>
                RETRIEVED VECTOR CONTEXT CHUNKS ({ragResult.retrievedChunks.length} Chunks)
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {ragResult.retrievedChunks.map((c) => (
                  <div key={c.id} style={{ backgroundColor: tokens.surface2, padding: 12, borderRadius: 10, fontSize: 12, color: tokens.text2 }}>
                    <b>{c.title}:</b> "{c.content}"
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 12, fontWeight: 800, color: tokens.action, fontFamily: typography.fontMono, marginBottom: 4 }}>
                SYNTHESIZED RAG LLM RESPONSE
              </div>
              <div style={{ fontSize: 13, color: tokens.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {ragResult.response}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
