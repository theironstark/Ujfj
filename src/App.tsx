/**
 * CYBER SWARM: Nanite Protocol
 * Main Application Component
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  RotateCcw, 
  ArrowRight, 
  Maximize2, 
  Smartphone, 
  ShieldAlert, 
  Sparkles, 
  Tv, 
  Play, 
  Info,
  Code,
  Flame,
  Volume2,
  VolumeX
} from 'lucide-react';
import { CyberSwarmEngine } from './game/CyberSwarmScene';
import { GameState, UpgradesState } from './types/game';
import { UpgradeDock } from './components/UpgradeDock';
import { AdOverlay } from './components/AdOverlay';
import { GodotCodeModal } from './components/GodotCodeModal';
import { adService } from './services/admob';
import { sound } from './services/sound';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CyberSwarmEngine | null>(null);

  // Game UI State
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [coins, setCoins] = useState<number>(120);
  const [unitCount, setUnitCount] = useState<number>(1);
  const [bossHp, setBossHp] = useState<{ current: number; max: number }>({ current: 100, max: 100 });
  const [floatingTexts, setFloatingTexts] = useState<Array<{ id: number; text: string; isPositive: boolean }>>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isPortraitFrame, setIsPortraitFrame] = useState<boolean>(true);
  const [isGodotModalOpen, setIsGodotModalOpen] = useState<boolean>(false);

  // Upgrades State
  const [upgrades, setUpgrades] = useState<UpgradesState>({
    fireRateLevel: 1,
    unitPowerLevel: 1,
    startingUnitsLevel: 1,
    coinMultiplierLevel: 1,
  });

  // AdMob State
  const [adState, setAdState] = useState<{
    isOpen: boolean;
    type: 'rewarded' | 'interstitial';
    countdown: number;
    title: string;
    onComplete?: () => void;
  }>({
    isOpen: false,
    type: 'rewarded',
    countdown: 5,
    title: '',
  });

  // Floating text feedback (+5, x2, etc.)
  const addFloatingText = useCallback((text: string, isPositive: boolean) => {
    const id = Date.now() + Math.random();
    setFloatingTexts(prev => [...prev.slice(-3), { id, text, isPositive }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(item => item.id !== id));
    }, 1200);
  }, []);

  // Initialize Three.js Engine
  useEffect(() => {
    if (!mountRef.current) return;

    const engine = new CyberSwarmEngine(mountRef.current, {
      onScoreUpdate: (count) => setUnitCount(count),
      onBossHpUpdate: (current, max) => setBossHp({ current, max }),
      onStateChange: (state) => {
        setGameState(state);
        if (state === 'VICTORY') {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#00f3ff', '#00ffaa', '#ff0055', '#ffaa00'],
          });
        }
      },
      onCoinEarned: (amount) => {
        setCoins(prev => prev + amount);
      },
      onFloatingText: (text, isPositive) => {
        addFloatingText(text, isPositive);
      },
    });

    engineRef.current = engine;

    // Subscribe to AdMob Service
    const unsubscribeAds = adService.subscribeAdState((state) => {
      setAdState(state);
    });

    return () => {
      unsubscribeAds();
      engine.dispose();
      engineRef.current = null;
    };
  }, [addFloatingText]);

  // Synchronize upgrades to engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.upgrades = upgrades;
    }
  }, [upgrades]);

  // Upgrade handlers
  const handleUpgrade = (type: keyof UpgradesState) => {
    const currentLvl = upgrades[type];
    const cost = Math.round(35 * Math.pow(1.5, currentLvl - 1));
    if (coins >= cost) {
      setCoins(prev => prev - cost);
      setUpgrades(prev => ({
        ...prev,
        [type]: prev[type] + 1,
      }));
      sound.playCoin();
    }
  };

  const handleStartGame = () => {
    sound.unlockAudio();
    sound.playClick();
    if (engineRef.current) {
      engineRef.current.startGame();
    }
  };

  const handleRestart = () => {
    sound.playClick();
    if (engineRef.current) {
      engineRef.current.restartLevel();
    }
  };

  const handleNextLevel = () => {
    sound.playClick();
    const nextLvl = currentLevel + 1;
    setCurrentLevel(nextLvl);

    // Check if Interstitial Ad should trigger (every 3 levels completed)
    if (adService.shouldShowInterstitial(currentLevel)) {
      adService.showInterstitialAd(() => {
        if (engineRef.current) {
          engineRef.current.nextLevel();
        }
      });
    } else {
      if (engineRef.current) {
        engineRef.current.nextLevel();
      }
    }
  };

  const handleDoubleCoinsReward = () => {
    const bonus = 100 + currentLevel * 50;
    setCoins(prev => prev + bonus);
    sound.playCoin();
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.enabled = next;
  };

  return (
    <div className="relative w-screen h-screen bg-[#030611] flex items-center justify-center overflow-hidden select-none">
      
      {/* Background Cyber Ambient Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#0e1e38_0%,#030611_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00f3ff08_1px,transparent_1px),linear-gradient(to_bottom,#00f3ff08_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Top Header Bar (Desktop & Tablet) */}
      <header className="absolute top-3 left-4 right-4 z-40 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 border border-cyan-400/40 shadow-lg shadow-cyan-500/20">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-orbitron font-black text-sm sm:text-base text-white tracking-widest flex items-center gap-2">
              <span className="text-cyan-400">CYBER</span> SWARM
              <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono-code font-normal">
                SECTOR {currentLevel}
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">Robots vs Aliens Multiplier Runner</p>
          </div>
        </div>

        {/* Viewport & Code Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => {
              sound.playClick();
              setIsPortraitFrame(!isPortraitFrame);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-xs font-rajdhani font-semibold text-slate-300 transition cursor-pointer"
            title="Toggle between Mobile Phone Frame and Responsive View"
          >
            {isPortraitFrame ? (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Wide View</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Phone Frame</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setIsGodotModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/50 hover:to-blue-600/50 border border-cyan-500/50 text-xs font-orbitron font-bold text-cyan-300 shadow-md shadow-cyan-500/10 transition cursor-pointer"
          >
            <Code className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">GODOT 4 CODE & SETUP</span>
            <span className="sm:hidden">GODOT</span>
          </button>
        </div>
      </header>

      {/* Main Viewport Container */}
      <div 
        className={`relative transition-all duration-300 flex items-center justify-center ${
          isPortraitFrame 
            ? 'w-[390px] h-[780px] max-h-[92vh] max-w-[96vw] rounded-[44px] p-3 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border-4 border-slate-700/80 shadow-[0_0_50px_rgba(0,243,255,0.18)]' 
            : 'w-full h-full'
        }`}
      >
        {/* Mobile Phone Speaker & Island Notch */}
        {isPortraitFrame && (
          <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 flex items-center justify-center w-28 h-5 rounded-full bg-black/90 border border-slate-700/60 pointer-events-none">
            <div className="w-3 h-3 rounded-full bg-cyan-950 border border-cyan-500/40 mr-2" />
            <div className="w-8 h-1.5 rounded-full bg-slate-800" />
          </div>
        )}

        {/* 3D WebGL Canvas Mount */}
        <div 
          ref={mountRef}
          className={`relative w-full h-full overflow-hidden ${isPortraitFrame ? 'rounded-[32px]' : ''}`}
          style={{ touchAction: 'none' }}
        />

        {/* In-Game Floating HUD (Over WebGL canvas) */}
        <div className="absolute top-14 left-4 right-4 z-20 flex items-start justify-between pointer-events-none">
          {/* Swarm Counter Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-950/80 border border-cyan-500/40 shadow-lg shadow-cyan-500/20 backdrop-blur-md">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-cyan-300 font-mono-code leading-none">NANITE SWARM</span>
              <span className="font-orbitron font-black text-base text-white leading-tight">
                {unitCount}
              </span>
            </div>
          </div>

          {/* Boss Target Meter */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-950/80 border border-pink-500/40 shadow-lg shadow-pink-500/20 backdrop-blur-md">
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-pink-300 font-mono-code leading-none">XENOCORE HP</span>
              <span className="font-orbitron font-black text-base text-pink-400 leading-tight">
                {bossHp.current} <span className="text-xs text-slate-400">/ {bossHp.max}</span>
              </span>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-pink-500" />
          </div>
        </div>

        {/* Floating Multiplier Popups (+5, x2, -3) */}
        <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
          {floatingTexts.map(item => (
            <div
              key={item.id}
              className={`animate-bounce font-orbitron font-black text-3xl sm:text-4xl drop-shadow-[0_0_16px_rgba(0,0,0,0.9)] ${
                item.isPositive ? 'text-cyan-300 neon-glow-cyan' : 'text-red-500 neon-glow-crimson'
              }`}
            >
              {item.text}
            </div>
          ))}
        </div>

        {/* Drag Hint on Menu / Initial Play */}
        {gameState === 'MENU' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-6 text-center">
            <div className="p-4 rounded-3xl bg-slate-900/90 border border-cyan-500/40 shadow-2xl max-w-xs animate-in zoom-in-95">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 mb-3">
                <Play className="w-7 h-7 fill-cyan-400" />
              </div>
              <h2 className="font-orbitron font-black text-xl text-white">
                CYBER SWARM
              </h2>
              <p className="mt-1 text-xs text-cyan-300 font-semibold tracking-wide">
                NANITE PROTOCOL
              </p>
              <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                Drag horizontally to aim your cannon. Pass through <span className="text-cyan-400 font-bold">Multiplier Gates</span> to replicate your nanite squad and shatter the Alien Core!
              </p>
              <button
                onClick={handleStartGame}
                className="mt-5 w-full py-3 rounded-xl font-orbitron font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 hover:brightness-110 active:scale-95 shadow-lg shadow-cyan-500/25 transition cursor-pointer"
              >
                LAUNCH MISSION
              </button>
            </div>
          </div>
        )}

        {/* Victory Modal */}
        {gameState === 'VICTORY' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-xs rounded-3xl bg-slate-900/95 border border-emerald-500/50 p-6 text-center shadow-2xl shadow-emerald-500/20 animate-in zoom-in-90">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 mb-3">
                <Trophy className="w-8 h-8" />
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-mono-code text-emerald-300">
                SECTOR {currentLevel} CLEARED
              </span>
              <h2 className="mt-2 font-orbitron font-black text-2xl text-white">
                VICTORY!
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Alien Xenocore neutralized. Next sector unlocked!
              </p>

              {/* Rewarded Ad Option */}
              <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-amber-500/30">
                <div className="text-[11px] text-amber-300 font-semibold flex items-center justify-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Double Sector Bonus!</span>
                </div>
                <button
                  onClick={() => {
                    sound.playClick();
                    adService.showRewardedAd(() => {
                      handleDoubleCoinsReward();
                    });
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-orbitron font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>WATCH AD FOR 2X COINS</span>
                </button>
              </div>

              {/* Next Level Button */}
              <button
                onClick={handleNextLevel}
                className="mt-3 w-full py-3 rounded-xl font-orbitron font-bold text-sm bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 hover:brightness-110 active:scale-95 shadow-lg shadow-emerald-500/25 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>NEXT SECTOR</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Game Over Modal */}
        {gameState === 'GAME_OVER' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-xs rounded-3xl bg-slate-900/95 border border-red-500/50 p-6 text-center shadow-2xl shadow-red-500/20 animate-in zoom-in-90">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/20 border border-red-400/50 flex items-center justify-center text-red-300 mb-3">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h2 className="font-orbitron font-black text-xl text-white">
                SWARM DEPLETED
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Units overwhelmed by alien defenses. Upgrade fire rate or unit power!
              </p>
              <button
                onClick={handleRestart}
                className="mt-5 w-full py-3 rounded-xl font-orbitron font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 hover:brightness-110 active:scale-95 shadow-lg shadow-cyan-500/25 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RETRY SECTOR</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ergonomic Collapsible Upgrade Dock */}
      <UpgradeDock
        coins={coins}
        upgrades={upgrades}
        onUpgrade={handleUpgrade}
        onDoubleCoinsRewarded={handleDoubleCoinsReward}
        onOpenGodotModal={() => setIsGodotModalOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onRestart={handleRestart}
      />

      {/* AdMob Simulator Overlay */}
      <AdOverlay
        isOpen={adState.isOpen}
        type={adState.type}
        countdown={adState.countdown}
        title={adState.title}
        onComplete={adState.onComplete}
        onClose={() => setAdState(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Complete Godot 4 3D Implementation & Architecture Modal */}
      <GodotCodeModal
        isOpen={isGodotModalOpen}
        onClose={() => setIsGodotModalOpen(false)}
      />
    </div>
  );
}
