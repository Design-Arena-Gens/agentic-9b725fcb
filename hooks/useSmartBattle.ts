import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  BattleEvent,
  BattleSettings,
  BattleStatus,
  SimulationMetrics,
  SpeedModeOption,
  UnitRole,
  UnitSnapshot
} from "../types";

type RuntimeUnit = {
  id: string;
  role: UnitRole;
  position: { x: number; y: number };
  hp: number;
  maxHp: number;
  baseSpeed: number;
  speed: number;
  attackCooldown: number;
  attackTimer: number;
  baseDamage: number;
  alive: boolean;
  targetId: string | null;
};

const teammateSpawns = [
  { x: 120, y: 140 },
  { x: 110, y: 260 },
  { x: 130, y: 380 }
] as const;

const enemySpawns = [
  { x: 660, y: 160 },
  { x: 680, y: 260 },
  { x: 650, y: 360 }
] as const;

const ATTACK_RANGE = 48;
const MAX_DELTA_SECONDS = 0.08;
const EVENT_LIMIT = 36;

const defaultMetrics = (): SimulationMetrics => ({
  ticks: 0,
  elapsedSeconds: 0,
  teammateDamageInflicted: 0,
  enemyDamageInflicted: 0
});

const createUnits = (settings: BattleSettings): RuntimeUnit[] => {
  const speedMultiplier = resolveSpeedOption(settings.speedModeOptions, settings.speedMode);

  const teammates: RuntimeUnit[] = teammateSpawns.map((spawn, idx) => ({
    id: `ally-${idx}`,
    role: "teammate",
    position: { ...spawn },
    hp: 180,
    maxHp: 180,
    baseSpeed: 110,
    speed: 110 * speedMultiplier,
    attackCooldown: 0.75,
    attackTimer: 0,
    baseDamage: 26,
    alive: true,
    targetId: null
  }));

  const enemies: RuntimeUnit[] = enemySpawns.map((spawn, idx) => ({
    id: `enemy-${idx}`,
    role: "enemy",
    position: { ...spawn },
    hp: 160,
    maxHp: 160,
    baseSpeed: 90,
    speed: 90,
    attackCooldown: 0.95,
    attackTimer: 0,
    baseDamage: 18,
    alive: true,
    targetId: null
  }));

  return [...teammates, ...enemies];
};

const resolveSpeedOption = (
  options: ReadonlyArray<SpeedModeOption>,
  current: BattleSettings["speedMode"]
): number => options.find(opt => opt.id === current)?.multiplier ?? 1;

const toSnapshot = (units: RuntimeUnit[]): UnitSnapshot[] =>
  units.map(unit => ({
    id: unit.id,
    role: unit.role,
    position: { ...unit.position },
    hp: unit.hp,
    maxHp: unit.maxHp,
    attackTimer: unit.attackTimer,
    attackCooldown: unit.attackCooldown,
    alive: unit.alive
  }));

const createEvent = (
  id: string,
  tick: number,
  timestamp: number,
  summary: string,
  tone: BattleEvent["tone"]
): BattleEvent => ({
  id,
  tick,
  timestamp,
  summary,
  tone
});

const formatTargetName = (id: string, role: UnitRole) =>
  role === "teammate" ? `Союзник ${id.split("-")[1] as string}` : `Противник ${id.split("-")[1] as string}`;

export const useSmartBattle = (settings: BattleSettings) => {
  const [status, setStatus] = useState<BattleStatus>("idle");
  const statusRef = useRef<BattleStatus>("idle");
  const settingsRef = useRef(settings);
  const initialUnitsRef = useRef<RuntimeUnit[] | null>(null);
  if (initialUnitsRef.current === null) {
    initialUnitsRef.current = createUnits(settings);
  }
  const [snapshot, setSnapshot] = useState<UnitSnapshot[]>(() => toSnapshot(initialUnitsRef.current!));
  const unitsRef = useRef<RuntimeUnit[]>(initialUnitsRef.current);
  const [events, setEvents] = useState<BattleEvent[]>([]);
  const [metrics, setMetrics] = useState<SimulationMetrics>(() => defaultMetrics());
  const metricsRef = useRef<SimulationMetrics>(defaultMetrics());
  const isRunningRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const eventCounterRef = useRef(0);

  const applySettingsToRuntime = useCallback(
    (runtimeUnits: RuntimeUnit[]) => {
      const speedMultiplier = resolveSpeedOption(settingsRef.current.speedModeOptions, settingsRef.current.speedMode);
      runtimeUnits.forEach(unit => {
        if (unit.role === "teammate") {
          unit.speed = unit.baseSpeed * speedMultiplier;
        } else {
          unit.speed = unit.baseSpeed;
        }
      });
    },
    []
  );

  const pushEvents = useCallback((batch: BattleEvent[]) => {
    if (!batch.length) {
      return;
    }
    setEvents(prev => {
      const combined = [...batch, ...prev].slice(0, EVENT_LIMIT);
      return combined;
    });
  }, []);

  const setStatusManaged = useCallback((next: BattleStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const cancelAnimation = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    lastTimestampRef.current = null;
  }, []);

  const resetRuntime = useCallback(() => {
    cancelAnimation();
    const freshUnits = createUnits(settingsRef.current);
    unitsRef.current = freshUnits;
    setSnapshot(toSnapshot(freshUnits));
    metricsRef.current = defaultMetrics();
    setMetrics(defaultMetrics());
    setEvents([]);
    setStatusManaged("idle");
    isRunningRef.current = false;
  }, [cancelAnimation, setStatusManaged]);

  const finalizeBattle = useCallback(
    (battleStatus: Extract<BattleStatus, "victory" | "defeat">, tick: number, timestamp: number) => {
      isRunningRef.current = false;
      cancelAnimation();
      setStatusManaged(battleStatus);
      const summary = battleStatus === "victory" ? "Союзники подавили сопротивление." : "Союзники уничтожены.";
      const tone = battleStatus === "victory" ? "ally" : "enemy";
      pushEvents([createEvent(`final-${battleStatus}-${eventCounterRef.current++}`, tick, timestamp, summary, tone)]);
    },
    [cancelAnimation, pushEvents, setStatusManaged]
  );

  const stepSimulation = useCallback(
    (timestamp: number) => {
      if (!isRunningRef.current) {
        cancelAnimation();
        return;
      }

      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }

      const rawDelta = (timestamp - lastTimestampRef.current) / 1000;
      const deltaSeconds = Math.min(rawDelta, MAX_DELTA_SECONDS);
      lastTimestampRef.current = timestamp;

      const units = unitsRef.current;
      applySettingsToRuntime(units);

      const eventsBatch: BattleEvent[] = [];
      const settingsSnapshot = settingsRef.current;

      const aliveTeammates = units.filter(unit => unit.role === "teammate" && unit.alive);
      const aliveEnemies = units.filter(unit => unit.role === "enemy" && unit.alive);

      if (!aliveTeammates.length || !aliveEnemies.length) {
        finalizeBattle(aliveEnemies.length ? "defeat" : "victory", metricsRef.current.ticks, metricsRef.current.elapsedSeconds);
        return;
      }

      metricsRef.current.elapsedSeconds += deltaSeconds;
      metricsRef.current.ticks += 1;

      const selectTarget = (unit: RuntimeUnit, candidates: RuntimeUnit[]): RuntimeUnit | null => {
        if (!candidates.length) {
          return null;
        }
        const current = candidates.find(candidate => candidate.id === unit.targetId && candidate.alive);
        if (current) {
          return current;
        }
        const nearest = candidates.reduce((closest, candidate) => {
          if (!candidate.alive) {
            return closest;
          }
          const currDist = distance(unit.position, candidate.position);
          if (!closest) {
            return { candidate, dist: currDist };
          }
          return currDist < closest.dist ? { candidate, dist: currDist } : closest;
        }, null as { candidate: RuntimeUnit; dist: number } | null);
        unit.targetId = nearest?.candidate.id ?? null;
        return nearest?.candidate ?? null;
      };

      units.forEach(unit => {
        if (!unit.alive) {
          return;
        }

        const targets = unit.role === "teammate" ? aliveEnemies : aliveTeammates;
        const target = selectTarget(unit, targets);

        if (!target) {
          return;
        }

        const dist = distance(unit.position, target.position);
        if (dist > 1) {
          const travel = Math.min(unit.speed * deltaSeconds, dist);
          const dirX = (target.position.x - unit.position.x) / dist;
          const dirY = (target.position.y - unit.position.y) / dist;
          unit.position.x += dirX * travel;
          unit.position.y += dirY * travel;
        }

        unit.attackTimer = Math.max(0, unit.attackTimer - deltaSeconds);

        if (dist <= ATTACK_RANGE && unit.attackTimer <= 0 && target.alive) {
          const multiplier = unit.role === "teammate" ? settingsSnapshot.damageMultiplier : 1;
          const damage = unit.baseDamage * multiplier;
          target.hp = Math.max(0, target.hp - damage);
          target.alive = target.hp > 0;
          unit.attackTimer = unit.attackCooldown;

          const attackTone = unit.role === "teammate" ? "ally" : "enemy";
          const summary = `${formatTargetName(unit.id, unit.role)} наносит ${damage.toFixed(0)} урона по ${formatTargetName(
            target.id,
            target.role
          )}.`;
          eventsBatch.unshift(
            createEvent(`hit-${eventCounterRef.current++}`, metricsRef.current.ticks, metricsRef.current.elapsedSeconds, summary, attackTone)
          );

          if (unit.role === "teammate") {
            metricsRef.current.teammateDamageInflicted += damage;
          } else {
            metricsRef.current.enemyDamageInflicted += damage;
          }

          if (!target.alive) {
            eventsBatch.unshift(
              createEvent(
                `kill-${eventCounterRef.current++}`,
                metricsRef.current.ticks,
                metricsRef.current.elapsedSeconds,
                `${formatTargetName(unit.id, unit.role)} устраняет ${formatTargetName(target.id, target.role)}.`,
                attackTone
              )
            );
          }
        }
      });

      const afterTeammates = units.filter(unit => unit.role === "teammate" && unit.alive);
      const afterEnemies = units.filter(unit => unit.role === "enemy" && unit.alive);

      if (!afterTeammates.length || !afterEnemies.length) {
        finalizeBattle(afterEnemies.length ? "defeat" : "victory", metricsRef.current.ticks, metricsRef.current.elapsedSeconds);
      }

      unitsRef.current = units;
      setSnapshot(toSnapshot(units));
      pushEvents(eventsBatch);
      setMetrics({ ...metricsRef.current });

      if (isRunningRef.current) {
        frameRef.current = requestAnimationFrame(ts => stepSimulationRef.current(ts));
      }
    },
    [applySettingsToRuntime, cancelAnimation, finalizeBattle, pushEvents]
  );

  const stepSimulationRef = useRef(stepSimulation);
  stepSimulationRef.current = stepSimulation;

  useEffect(() => {
    if (isRunningRef.current) {
      frameRef.current = requestAnimationFrame(timestamp => stepSimulationRef.current(timestamp));
    }
    return () => {
      cancelAnimation();
    };
  }, [cancelAnimation]);

  useEffect(() => {
    settingsRef.current = settings;
    applySettingsToRuntime(unitsRef.current);
    setSnapshot(toSnapshot(unitsRef.current));
  }, [settings, applySettingsToRuntime]);

  const start = useCallback(() => {
    if (isRunningRef.current) {
      return;
    }
    if (statusRef.current === "victory" || statusRef.current === "defeat") {
      resetRuntime();
    }
    isRunningRef.current = true;
    setStatusManaged("running");
    frameRef.current = requestAnimationFrame(timestamp => stepSimulationRef.current(timestamp));
  }, [resetRuntime, setStatusManaged]);

  const pause = useCallback(() => {
    if (!isRunningRef.current) {
      return;
    }
    isRunningRef.current = false;
    setStatusManaged("paused");
    cancelAnimation();
  }, [cancelAnimation, setStatusManaged]);

  const reset = useCallback(() => {
    resetRuntime();
  }, [resetRuntime]);

  const isRunning = useMemo(() => status === "running", [status]);

  return {
    snapshot,
    events,
    status,
    start,
    pause,
    reset,
    isRunning,
    metrics
  };
};

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
};
