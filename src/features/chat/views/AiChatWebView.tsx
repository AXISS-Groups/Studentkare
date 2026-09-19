import React from 'react';
import { observer } from 'mobx-react-lite';
import { Bot, Send, Trash2, ShieldAlert, Sparkles, User, AlertTriangle } from 'lucide-react';
import type { ChatViewModel } from '../viewmodel/ChatViewModel';
import './chat.css';

interface AiChatWebViewProps {
  viewModel: ChatViewModel;
}

/**
 * Web View Component for AI Care Copilot Chat & Crisis Gate.
 * Binds reactively to `ChatViewModel` via MobX `observer`.
 */
export const AiChatWebView: React.FC<AiChatWebViewProps> = observer(({ viewModel }) => {
  return (
    <div className="aichat-container">
      {/* Header */}
      <div className="aichat-header">
        <div className="aichat-title-group">
          <div className="bot-avatar">
            <Bot size={24} color="#ffffff" />
          </div>
          <div>
            <h2>AXISS AI Care Copilot</h2>
            <p>Governed by Medical AI Constitution Rules (K1–K4) & Triage Gate</p>
          </div>
        </div>

        <button type="button" className="btn-clear-chat" onClick={() => viewModel.clear()} title="Clear Chat History">
          <Trash2 size={16} />
        </button>
      </div>

      {/* Quick Prompts Bar */}
      <div className="aichat-prompts-bar">
        <span className="prompts-label"><Sparkles size={14} /> Quick Questions:</span>
        <div className="prompts-list">
          {viewModel.quickPrompts.map((prompt, idx) => (
            <button key={idx} type="button" className="prompt-chip" onClick={() => viewModel.sendPrompt(prompt)}>
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="aichat-messages-box">
        {viewModel.bubbles.map((b) => (
          <div key={b.id} className={`chat-row ${b.isUser ? 'user-row' : 'assistant-row'}`}>
            <div className="avatar-mini">
              {b.isUser ? <User size={14} color="#ffffff" /> : <Bot size={14} color="#6366f1" />}
            </div>
            <div className={`message-card ${b.isEmergency ? 'emergency-card' : ''}`}>
              {b.isEmergency && (
                <div className="emergency-alert-banner">
                  <ShieldAlert size={18} color="#dc2626" />
                  <strong>TRIAGE CRISIS GATE TRIGGERED (Rule K3)</strong>
                </div>
              )}

              <p className="message-text">{b.text}</p>

              {b.ruleRef && (
                <span className="rule-tag">Governed under {b.ruleRef}</span>
              )}

              {b.actionPrompt && (
                <div className="action-button-box">
                  <button type="button" className="btn-action-prompt">
                    {b.actionPrompt}
                  </button>
                </div>
              )}

              <span className="timestamp">{b.timestamp}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Input Bar */}
      <div className="aichat-input-bar">
        <input
          type="text"
          placeholder="Ask AXISS about lab reports, symptoms, or campus health..."
          value={viewModel.inputText}
          onChange={(e) => viewModel.setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && viewModel.send()}
        />
        <button
          type="button"
          className="btn-send"
          onClick={() => viewModel.send()}
          disabled={!viewModel.canSend}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
});
