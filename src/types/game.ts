/**
 * Types & Game Definitions for CYBER SWARM: Nanite Protocol
 */

export type GameState = 'MENU' | 'PLAYING' | 'BOSS_FIGHT' | 'VICTORY' | 'GAME_OVER';

export type GateOp = 'multiply' | 'add' | 'subtract';

export interface GateData {
  op: GateOp;
  value: number;
  label: string;
  isPositive: boolean;
}

export interface GatePair {
  id: string;
  z: number;
  leftGate: GateData;
  rightGate: GateData;
  passed: boolean;
}

export interface BossData {
  name: string;
  maxHp: number;
  currentHp: number;
  type: 'CORE' | 'SENTINEL' | 'DREADNOUGHT' | 'QUEEN';
  color: string;
}

export interface UpgradesState {
  fireRateLevel: number;
  unitPowerLevel: number;
  startingUnitsLevel: number;
  coinMultiplierLevel: number;
}

export interface PlayerStats {
  coins: number;
  currentLevel: number;
  highScore: number;
  totalRobotsSpawned: number;
  bossesDestroyed: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  graphicsQuality: 'high' | 'medium';
}
