/**
 * AdMob Simulated Interactive Ad Overlay
 */

import React, { useEffect, useState } from 'react';
import { Sparkles, X, ShieldAlert, Award, PlayCircle } from 'lucide-react';
import { sound } from '../services/sound';

interface AdOverlayProps {
  isOpen: boolean;
  type: 'rewarded' | 'interstitial';
  countdown: number;
  title: string;
  onComplete?: () => void;
  onClose: () => void;
}

export const AdOverlay: React.FC<AdOverlayProps> = ({
  isOpen,
  type,
  countdown: initialCountdown,
  title,
  onComplete,
  onClose,
}) => {
  const [timeLeft, setTimeLeft] = useState(initialCountdown);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTimeLeft(initialCountdown);
    setRewardClaimed(false);

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setRewardClaimed(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, initialCountdown]);

  if (!isOpen) return null;

  const handleClaim = () => {
    sound.playCoin();
    onComplete?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-2xl border border-cyan-500/40 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-6 shadow-2xl shadow-cyan-500/20 text-center">
        
        {/* Ad Tag Badge */}
        <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-[11px] font-mono-code text-cyan-400">
          <PlayCircle className="w-3 h-3 text-cyan-400" />
          <span>{type === 'rewarded' ? 'REWARDED AD (TEST)' : 'INTERSTITIAL AD (TEST)'}</span>
        </div>

        {/* Close Button (enabled when countdown hits 0 or for skippable interstitial) */}
        {timeLeft === 0 && (
          <button
            onClick={handleClaim}
            className="absolute top-4 right-4 p-1 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Ad Content */}
        <div className="mt-8 mb-5">
          <div className="relative mx-auto w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-300/30 mb-4 animate-bounce">
            {type === 'rewarded' ? (
              <Award className="w-10 h-10 text-white" />
            ) : (
              <ShieldAlert className="w-10 h-10 text-white" />
            )}
          </div>

          <h3 className="font-orbitron font-bold text-lg text-white tracking-wider">
            {title}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {type === 'rewarded' 
              ? 'Watch to the end to claim your 2x Coins Booster!'
              : 'Cleared sector briefing. Continuing operation in a moment...'}
          </p>
        </div>

        {/* Ad Mock Video Frame */}
        <div className="relative w-full h-32 rounded-xl border border-cyan-500/20 bg-slate-900/90 overflow-hidden flex flex-col items-center justify-center p-3">
          <div className="absolute inset-0 bg-[radial-gradient(#00f3ff_1px,transparent_1px)] [background-size:12px_12px] opacity-15" />
          <div className="text-cyan-400 font-orbitron text-xs tracking-widest uppercase">
            Cyber Defense Systems
          </div>
          <div className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
            High-velocity autonomous nanite combat frameworks.
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-cyan-900/50 text-cyan-300 border border-cyan-500/40">
              AdMob Unit: 394025...
            </span>
          </div>
        </div>

        {/* Timer / Reward action */}
        <div className="mt-5">
          {timeLeft > 0 ? (
            <div className="flex items-center justify-center gap-2 text-sm text-cyan-300 font-mono-code py-2.5 px-4 rounded-xl bg-cyan-950/40 border border-cyan-800/40">
              <span>Reward unlocked in:</span>
              <span className="font-bold text-base text-white">{timeLeft}s</span>
            </div>
          ) : (
            <button
              onClick={handleClaim}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-orbitron font-bold text-sm bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 hover:brightness-110 active:scale-95 shadow-lg shadow-emerald-500/25 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>CLAIM 2X COINS & RESUME</span>
            </button>
          )}
        </div>

        <div className="mt-3 text-[10px] text-slate-500 font-mono-code">
          Google Mobile Ads SDK Hook Simulator (AdMob Ready)
        </div>
      </div>
    </div>
  );
};
