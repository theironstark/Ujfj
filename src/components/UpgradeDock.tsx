/**
 * Sleek Ergonomic Upgrade Dock
 * Collapsible bottom control bar conforming to Three.js UI layout directives
 */

import React, { useState } from 'react';
import { 
  Zap, 
  Crosshair, 
  Users, 
  Coins, 
  Tv, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Volume2,
  VolumeX,
  Code
} from 'lucide-react';
import { UpgradesState } from '../types/game';
import { sound } from '../services/sound';
import { adService } from '../services/admob';

interface UpgradeDockProps {
  coins: number;
  upgrades: UpgradesState;
  onUpgrade: (type: keyof UpgradesState) => void;
  onDoubleCoinsRewarded: () => void;
  onOpenGodotModal: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onRestart: () => void;
}

export const UpgradeDock: React.FC<UpgradeDockProps> = ({
  coins,
  upgrades,
  onUpgrade,
  onDoubleCoinsRewarded,
  onOpenGodotModal,
  soundEnabled,
  onToggleSound,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getUpgradeCost = (level: number) => Math.round(35 * Math.pow(1.5, level - 1));

  const fireRateCost = getUpgradeCost(upgrades.fireRateLevel);
  const unitPowerCost = getUpgradeCost(upgrades.unitPowerLevel);
  const startingUnitsCost = getUpgradeCost(upgrades.startingUnitsLevel);
  const coinMultiplierCost = getUpgradeCost(upgrades.coinMultiplierLevel);

  const handleUpgradeClick = (type: keyof UpgradesState) => {
    sound.playClick();
    onUpgrade(type);
  };

  const handleWatchAd = () => {
    sound.playClick();
    adService.showRewardedAd(() => {
      onDoubleCoinsRewarded();
    });
  };

  return (
    <div 
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 w-full max-w-xl px-2 transition-all duration-300 pointer-events-auto"
      style={{
        transform: isCollapsed ? 'translate(-50%, calc(100% - 34px))' : 'translate(-50%, 0)',
      }}
    >
      {/* Collapse/Expand Toggle Tab */}
      <div className="flex justify-center mb-1">
        <button
          onClick={() => {
            sound.playClick();
            setIsCollapsed(!isCollapsed);
          }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-slate-900/90 hover:bg-slate-800 border-t border-x border-cyan-500/40 text-[11px] font-orbitron font-semibold text-cyan-300 shadow-md backdrop-blur-md cursor-pointer transition"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>UPGRADES & AD HOOKS</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>HIDE DOCK</span>
            </>
          )}
        </button>
      </div>

      {/* Main Glassmorphic Dock Container */}
      <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/90 p-3 shadow-2xl shadow-cyan-950/40 backdrop-blur-md">
        
        {/* Top Mini Bar: Coins & Quick Actions */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/15">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 font-orbitron text-xs font-bold">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>{coins}</span>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">Nanite Core Credits</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Rewarded Ad 2x Coins Button */}
            <button
              onClick={handleWatchAd}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-orbitron font-bold text-[11px] shadow-sm shadow-amber-500/20 active:scale-95 transition cursor-pointer"
              title="Watch sponsored holo-ad for 2x Coins"
            >
              <Tv className="w-3.5 h-3.5 text-slate-950" />
              <span>2X COINS (AD)</span>
            </button>

            {/* View Godot 4 Code Button */}
            <button
              onClick={() => {
                sound.playClick();
                onOpenGodotModal();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900 font-orbitron font-semibold text-[11px] transition cursor-pointer"
              title="Open Complete Godot 4 3D source code & setup"
            >
              <Code className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">GODOT 4 CODE</span>
              <span className="sm:hidden">GODOT</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => {
                sound.playClick();
                onToggleSound();
              }}
              className="p-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title={soundEnabled ? "Mute audio" : "Unmute audio"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
          </div>
        </div>

        {/* Upgrades Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Upgrade 1: Fire Rate */}
          <button
            onClick={() => handleUpgradeClick('fireRateLevel')}
            disabled={coins < fireRateCost}
            className={`flex flex-col items-center justify-between p-2 rounded-xl border text-center transition cursor-pointer ${
              coins >= fireRateCost
                ? 'bg-slate-900/80 border-cyan-500/30 hover:border-cyan-400 hover:bg-slate-900 text-slate-200'
                : 'bg-slate-950/60 border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="flex items-center gap-1 text-[11px] font-orbitron text-cyan-300">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>FIRE RATE</span>
            </div>
            <div className="my-0.5 text-[10px] text-slate-400">
              Lv. {upgrades.fireRateLevel} ({(4.0 + (upgrades.fireRateLevel - 1) * 1.2).toFixed(1)}/s)
            </div>
            <div className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[10px] font-mono-code text-amber-300">
              <Coins className="w-2.5 h-2.5" />
              <span>{fireRateCost}</span>
            </div>
          </button>

          {/* Upgrade 2: Unit Power */}
          <button
            onClick={() => handleUpgradeClick('unitPowerLevel')}
            disabled={coins < unitPowerCost}
            className={`flex flex-col items-center justify-between p-2 rounded-xl border text-center transition cursor-pointer ${
              coins >= unitPowerCost
                ? 'bg-slate-900/80 border-cyan-500/30 hover:border-cyan-400 hover:bg-slate-900 text-slate-200'
                : 'bg-slate-950/60 border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="flex items-center gap-1 text-[11px] font-orbitron text-pink-300">
              <Crosshair className="w-3.5 h-3.5 text-pink-400" />
              <span>UNIT POWER</span>
            </div>
            <div className="my-0.5 text-[10px] text-slate-400">
              Lv. {upgrades.unitPowerLevel} ({(1 + (upgrades.unitPowerLevel - 1) * 0.5).toFixed(1)} dmg)
            </div>
            <div className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[10px] font-mono-code text-amber-300">
              <Coins className="w-2.5 h-2.5" />
              <span>{unitPowerCost}</span>
            </div>
          </button>

          {/* Upgrade 3: Starting Units */}
          <button
            onClick={() => handleUpgradeClick('startingUnitsLevel')}
            disabled={coins < startingUnitsCost}
            className={`flex flex-col items-center justify-between p-2 rounded-xl border text-center transition cursor-pointer ${
              coins >= startingUnitsCost
                ? 'bg-slate-900/80 border-cyan-500/30 hover:border-cyan-400 hover:bg-slate-900 text-slate-200'
                : 'bg-slate-950/60 border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="flex items-center gap-1 text-[11px] font-orbitron text-emerald-300">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>START SWARM</span>
            </div>
            <div className="my-0.5 text-[10px] text-slate-400">
              Lv. {upgrades.startingUnitsLevel} ({upgrades.startingUnitsLevel} bots)
            </div>
            <div className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[10px] font-mono-code text-amber-300">
              <Coins className="w-2.5 h-2.5" />
              <span>{startingUnitsCost}</span>
            </div>
          </button>

          {/* Upgrade 4: Coin Multiplier */}
          <button
            onClick={() => handleUpgradeClick('coinMultiplierLevel')}
            disabled={coins < coinMultiplierCost}
            className={`flex flex-col items-center justify-between p-2 rounded-xl border text-center transition cursor-pointer ${
              coins >= coinMultiplierCost
                ? 'bg-slate-900/80 border-cyan-500/30 hover:border-cyan-400 hover:bg-slate-900 text-slate-200'
                : 'bg-slate-950/60 border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="flex items-center gap-1 text-[11px] font-orbitron text-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>COIN BOOST</span>
            </div>
            <div className="my-0.5 text-[10px] text-slate-400">
              Lv. {upgrades.coinMultiplierLevel} (+{((upgrades.coinMultiplierLevel - 1) * 25)}%)
            </div>
            <div className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[10px] font-mono-code text-amber-300">
              <Coins className="w-2.5 h-2.5" />
              <span>{coinMultiplierCost}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
