import { runInAction, makeObservable, observable, action } from 'mobx';
import type { ViewModel } from '../../../core/store/ViewModel';
import type { HealthChallenge, RewardRedemptionOption, ReferralRecord, ReferralInfo } from '../domain/entities';

export type { HealthChallenge, RewardRedemptionOption, ReferralRecord, ReferralInfo };

export class RewardsViewModel implements ViewModel {
  public pointsBalance = 450;
  public streakDays = 7;
  public referralInfo: ReferralInfo = {
    referralCode: 'STUDENT-CARE-50',
    referralLink: 'https://studentkare.co/ref/STUDENT-CARE-50',
    totalReferred: 2,
    referralPointsEarned: 100,
    referralHistory: [
      {
        id: 'ref-1',
        referredUserEmail: 'rahul.s@iitd.ac.in',
        dateReferred: '15 Sep 2026',
        pointsAwarded: 50,
        status: 'COMPLETED',
      },
      {
        id: 'ref-2',
        referredUserEmail: 'priya.m@bits.edu',
        dateReferred: '18 Sep 2026',
        pointsAwarded: 50,
        status: 'COMPLETED',
      },
    ],
  };

  public activeChallenges: HealthChallenge[] = [
    {
      id: 'ch-1',
      title: '10,000 Steps Campus Fitness Walk',
      description: 'Log 10,000 daily steps for 5 consecutive days on campus.',
      pointsReward: 150,
      progressPercent: 80,
      completed: false,
      category: 'WALK',
    },
    {
      id: 'ch-2',
      title: 'Annual Diagnostic Camp Passport Verification',
      description: 'Complete all 5 screening stations at the campus health camp.',
      pointsReward: 200,
      progressPercent: 100,
      completed: true,
      category: 'CAMP',
    },
    {
      id: 'ch-3',
      title: 'Adult Influenza Vaccine Shield',
      description: 'Log annual quadrivalent flu vaccine in your digital vault.',
      pointsReward: 100,
      progressPercent: 0,
      completed: false,
      category: 'VACCINE',
    },
  ];

  public redemptionOptions: RewardRedemptionOption[] = [
    {
      id: 'red-1',
      title: 'Free Full Body Health Checkup Voucher',
      pointsRequired: 300,
      partnerName: 'Metropolis Healthcare',
      discountValue: '₹500 OFF',
    },
    {
      id: 'red-2',
      title: 'Campus Pharmacy OTC Wellness Discount',
      pointsRequired: 150,
      partnerName: 'Studentkare Care Pass',
      discountValue: '15% OFF',
    },
    {
      id: 'red-3',
      title: 'Teleconsultation Video Voucher',
      pointsRequired: 100,
      partnerName: 'Senior Physician Network',
      discountValue: 'FREE CONSULT',
    },
  ];

  public redeemedSuccessMessage = '';

  constructor() {
    makeObservable(this, {
      pointsBalance: observable,
      streakDays: observable,
      referralInfo: observable,
      activeChallenges: observable,
      redemptionOptions: observable,
      redeemedSuccessMessage: observable,
      completeChallenge: action,
      referFriend: action,
      redeemOption: action,
      reset: action,
    });
  }



  public completeChallenge(challengeId: string): void {
    const ch = this.activeChallenges.find((c) => c.id === challengeId);
    if (!ch || ch.completed) return;

    ch.completed = true;
    ch.progressPercent = 100;
    this.pointsBalance += ch.pointsReward;
  }

  public referFriend(emailOrPhone: string): void {
    const cleanContact = emailOrPhone.trim();
    if (!cleanContact) return;

    const newRecord: ReferralRecord = {
      id: `ref-${Date.now()}`,
      referredUserEmail: cleanContact,
      dateReferred: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      pointsAwarded: 50,
      status: 'COMPLETED',
    };

    this.pointsBalance += 50;
    this.referralInfo.totalReferred += 1;
    this.referralInfo.referralPointsEarned += 50;
    this.referralInfo.referralHistory.unshift(newRecord);

    this.redeemedSuccessMessage = `🎉 50 LifePoints credited for referring ${cleanContact}! Redeemable on any package.`;

    setTimeout(() => {
      runInAction(() => {
        this.redeemedSuccessMessage = '';
      });
    }, 4000);
  }

  public copyReferralLink(): string {
    return this.referralInfo.referralLink;
  }

  public redeemOption(option: RewardRedemptionOption): void {
    if (this.pointsBalance < option.pointsRequired) return;

    this.pointsBalance -= option.pointsRequired;
    this.redeemedSuccessMessage = `Voucher unlocked for ${option.title}! Added to your Health Pass Wallet.`;

    setTimeout(() => {
      runInAction(() => {
        this.redeemedSuccessMessage = '';
      });
    }, 4000);
  }

  public reset(): void {
    this.pointsBalance = 450;
    this.streakDays = 7;
    this.redeemedSuccessMessage = '';
  }

  public dispose(): void {
    // Cleanup if needed
  }
}

