export type SpeedModeId = "standard" | "fast" | "veryFast";

export type SpeedModeOption = {
  id: SpeedModeId;
  label: string;
  description: string;
  multiplier: number;
};

export type BattleSettings = {
  damageMultiplier: number;
  speedMode: SpeedModeId;
  speedModeOptions: ReadonlyArray<SpeedModeOption>;
};

export type BattleStatus = "idle" | "running" | "victory" | "defeat" | "paused";

export type UnitRole = "teammate" | "enemy";

export type UnitSnapshot = {
  id: string;
  role: UnitRole;
  position: { x: number; y: number };
  hp: number;
  maxHp: number;
  attackTimer: number;
  attackCooldown: number;
  alive: boolean;
};

export type SimulationMetrics = {
  ticks: number;
  elapsedSeconds: number;
  teammateDamageInflicted: number;
  enemyDamageInflicted: number;
};

export type BattleEvent = {
  id: string;
  tick: number;
  timestamp: number;
  summary: string;
  tone: "ally" | "enemy" | "system";
};
