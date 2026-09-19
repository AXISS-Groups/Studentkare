import React from 'react';
import { observer } from 'mobx-react-lite';
import { Award, Flame, Gift, CheckCircle2, Trophy, ArrowRight } from 'lucide-react';
import type { RewardsViewModel } from '../viewmodel/RewardsViewModel';
import './rewards.css';

interface RewardsWebViewProps {
  viewModel: RewardsViewModel;
}

/**
 * Web View Component for Student Health Rewards & LifePoints Engine.
 * Binds reactively to `RewardsViewModel` via MobX `observer`.
 */
export const RewardsWebView: React.FC<RewardsWebViewProps> = observer(({ viewModel }) => {
  return (
    <div className="rewards-container">
      <div className="rewards-header">
        <span className="rewards-eyebrow">LIFEPOINTS & WELLNESS GAMIFICATION</span>
        <h2>Student Health Rewards & Pass Wallet</h2>
        <p>Earn LifePoints for completing campus health milestones & redeem partner vouchers.</p>
      </div>

      {/* Points & Streak Dashboard */}
      <div className="rewards-dash-grid">
        <div className="points-card">
          <div className="card-top">
            <Trophy size={32} color="#f59e0b" />
            <span className="card-label">Active LifePoints</span>
          </div>
          <div className="points-number">{viewModel.pointsBalance}</div>
          <span className="points-sub">100 LifePoints = ₹100 Health Pass Discount</span>
        </div>

        <div className="streak-card">
          <div className="card-top">
            <Flame size={32} color="#ef4444" />
            <span className="card-label">Daily Wellness Streak</span>
          </div>
          <div className="streak-number">{viewModel.streakDays} Days</div>
          <span className="streak-sub">Active logging on campus health passport</span>
        </div>
      </div>

      {/* Success Notification */}
      {viewModel.redeemedSuccessMessage && (
        <div className="reward-success-banner">
          <CheckCircle2 size={20} color="#16a34a" />
          <span>{viewModel.redeemedSuccessMessage}</span>
        </div>
      )}

      {/* Active Health Challenges */}
      <div className="rewards-section">
        <h3>Active Health Challenges</h3>
        <div className="challenges-list">
          {viewModel.activeChallenges.map((ch) => (
            <div key={ch.id} className={`challenge-item ${ch.completed ? 'completed' : ''}`}>
              <div className="ch-icon">
                {ch.completed ? <CheckCircle2 size={24} color="#16a34a" /> : <Award size={24} color="#4f46e5" />}
              </div>

              <div className="ch-details">
                <h4>{ch.title}</h4>
                <p>{ch.description}</p>
                <div className="ch-progress-bar">
                  <div className="ch-progress-fill" style={{ width: `${ch.progressPercent}%` }} />
                </div>
              </div>

              <div className="ch-action">
                <span className="reward-pts">+{ch.pointsReward} Pts</span>
                {!ch.completed && (
                  <button
                    type="button"
                    className="btn-complete-ch"
                    onClick={() => viewModel.completeChallenge(ch.id)}
                  >
                    Claim Reward
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reward Vouchers */}
      <div className="rewards-section">
        <h3>Redeem LifePoints Vouchers</h3>
        <div className="vouchers-grid">
          {viewModel.redemptionOptions.map((opt) => {
            const canAfford = viewModel.pointsBalance >= opt.pointsRequired;
            return (
              <div key={opt.id} className="voucher-card">
                <div className="voucher-header">
                  <Gift size={20} color="#4f46e5" />
                  <span className="voucher-discount">{opt.discountValue}</span>
                </div>

                <h4>{opt.title}</h4>
                <span className="partner-name">Partner: {opt.partnerName}</span>

                <div className="voucher-footer">
                  <span className="pts-req">{opt.pointsRequired} Pts</span>
                  <button
                    type="button"
                    className="btn-redeem"
                    onClick={() => viewModel.redeemOption(opt)}
                    disabled={!canAfford}
                  >
                    {canAfford ? 'Redeem Voucher' : 'Insufficient Pts'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
