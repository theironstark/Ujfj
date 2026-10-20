/**
 * AdMob Service & Ad Hooks Architecture
 * 
 * Provides production-ready AdMob hooks, simulated interactive ad presentation for web,
 * and standard event dispatchers for Unity C# / Godot 4 AdMob plugins.
 */

export interface AdMobCallbacks {
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: string) => void;
  onAdOpened?: () => void;
  onAdClosed?: () => void;
  onUserEarnedReward?: (amount: number, type: string) => void;
}

class AdMobService {
  // Configuration test IDs (Google AdMob Standard Test IDs)
  public readonly TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';
  public readonly TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712';
  public readonly TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';

  private isInitialized = false;
  private rewardedLoaded = true;
  private interstitialLoaded = true;

  // Active ad modal state for the simulated game UI
  private onAdStateChangeListeners: Array<(state: {
    isOpen: boolean;
    type: 'rewarded' | 'interstitial';
    countdown: number;
    title: string;
    onComplete?: () => void;
  }) => void> = [];

  constructor() {
    this.init();
  }

  public init() {
    this.isInitialized = true;
    // Preload test ads
    this.loadRewardedAd();
    this.loadInterstitialAd();
  }

  public subscribeAdState(callback: (state: {
    isOpen: boolean;
    type: 'rewarded' | 'interstitial';
    countdown: number;
    title: string;
    onComplete?: () => void;
  }) => void) {
    this.onAdStateChangeListeners.push(callback);
    return () => {
      this.onAdStateChangeListeners = this.onAdStateChangeListeners.filter(c => c !== callback);
    };
  }

  private notifyAdState(state: {
    isOpen: boolean;
    type: 'rewarded' | 'interstitial';
    countdown: number;
    title: string;
    onComplete?: () => void;
  }) {
    this.onAdStateChangeListeners.forEach(c => c(state));
  }

  /**
   * Preload Rewarded Video Ad
   */
  public loadRewardedAd(callbacks?: AdMobCallbacks) {
    this.rewardedLoaded = true;
    callbacks?.onAdLoaded?.();
  }

  /**
   * Show Rewarded Ad (e.g. for 2x Coins)
   * In native Unity/Godot, this invokes the platform SDK.
   * In Web, this renders an in-engine simulated ad experience.
   */
  public showRewardedAd(onRewardEarned: () => void, callbacks?: AdMobCallbacks) {
    if (!this.rewardedLoaded) {
      callbacks?.onAdFailedToLoad?.('Rewarded ad not loaded yet');
      return false;
    }

    callbacks?.onAdOpened?.();
    this.notifyAdState({
      isOpen: true,
      type: 'rewarded',
      countdown: 5,
      title: 'SPONSORED HOLO-TRANSMISSION',
      onComplete: () => {
        this.rewardedLoaded = true;
        onRewardEarned();
        callbacks?.onUserEarnedReward?.(2, 'COINS_MULTIPLIER');
        callbacks?.onAdClosed?.();
      }
    });

    return true;
  }

  /**
   * Preload Interstitial Ad
   */
  public loadInterstitialAd(callbacks?: AdMobCallbacks) {
    this.interstitialLoaded = true;
    callbacks?.onAdLoaded?.();
  }

  /**
   * Show Interstitial Ad (called every 3 levels)
   */
  public showInterstitialAd(onFinished?: () => void, callbacks?: AdMobCallbacks) {
    if (!this.interstitialLoaded) {
      callbacks?.onAdFailedToLoad?.('Interstitial not loaded');
      onFinished?.();
      return false;
    }

    callbacks?.onAdOpened?.();
    this.notifyAdState({
      isOpen: true,
      type: 'interstitial',
      countdown: 3,
      title: 'SECTOR CLEARING SPONSOR',
      onComplete: () => {
        this.interstitialLoaded = true;
        callbacks?.onAdClosed?.();
        onFinished?.();
      }
    });

    return true;
  }

  /**
   * Check if level requires an interstitial ad (every 3 levels)
   */
  public shouldShowInterstitial(completedLevel: number): boolean {
    return completedLevel > 0 && completedLevel % 3 === 0;
  }
}

export const adService = new AdMobService();
