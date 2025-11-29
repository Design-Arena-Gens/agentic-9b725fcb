"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSmartBattle } from "../hooks/useSmartBattle";
import SettingsPanel from "./SettingsPanel";
import TacticalOverlay from "./TacticalOverlay";
import TimelineFeed from "./TimelineFeed";
import styles from "./SimulationExperience.module.css";
import type { BattleSettings } from "../types";

const damageChoices = [
  { label: "x1 — Базовый порог", value: 1 },
  { label: "x1.5 — Усиленный бой", value: 1.5 },
  { label: "x2 — Агрессивная тактика", value: 2 },
  { label: "x2.5 — Экстремальный урон", value: 2.5 }
] as const;

const speedChoices: BattleSettings["speedModeOptions"] = [
  { id: "standard", label: "1. Стандарт", description: "Классический темп", multiplier: 1 },
  { id: "fast", label: "2. Быстро", description: "Ускоренное наступление", multiplier: 1.55 },
  { id: "veryFast", label: "3. Очень быстро", description: "Блиц-контроль карты", multiplier: 2.15 }
];

const initialSettings: BattleSettings = {
  damageMultiplier: 1.5,
  speedMode: "fast",
  speedModeOptions: speedChoices
};

export default function SimulationExperience() {
  const [settings, setSettings] = useState<BattleSettings>(initialSettings);
  const {
    snapshot,
    events,
    status,
    start,
    pause,
    reset,
    isRunning,
    metrics
  } = useSmartBattle(settings);

  const onMultiplierChange = useCallback((value: number) => {
    setSettings(prev => ({ ...prev, damageMultiplier: value }));
  }, []);

  const onSpeedChange = useCallback((modeId: BattleSettings["speedMode"]) => {
    setSettings(prev => ({ ...prev, speedMode: modeId }));
  }, []);

  const speedLabel = useMemo(() => {
    const option = settings.speedModeOptions.find(opt => opt.id === settings.speedMode);
    return option?.label ?? "";
  }, [settings.speedMode, settings.speedModeOptions]);

  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <p className={styles.modLabel}>Mod: SmartTeammates · Автор Skyline</p>
          <h1 className={styles.title}>Умные тиммейты с тактическим превосходством</h1>
          <p className={styles.subtitle}>
            Настраивай урон и скорость союзников в реальном времени и наблюдай, как они
            синхронизированно уничтожают противников. Панель Mod Options моделирует
            возможность полноценного гейм-мода.
          </p>
        </div>
        <motion.div
          className={styles.statusPill}
          animate={{ opacity: isRunning ? 1 : 0.7, scale: isRunning ? 1.01 : 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        >
          <span className={styles.statusDot} data-state={status} />
          <span>{status === "victory" ? "Победа" : status === "defeat" ? "Поражение" : "Симуляция"}</span>
        </motion.div>
      </header>

      <div className={styles.layoutGrid}>
        <SettingsPanel
          damageChoices={damageChoices}
          selectedDamage={settings.damageMultiplier}
          onDamageChange={onMultiplierChange}
          speedChoices={speedChoices}
          selectedSpeed={settings.speedMode}
          onSpeedChange={onSpeedChange}
          runState={{ isRunning, status }}
          start={start}
          pause={pause}
          reset={reset}
          metrics={metrics}
          speedLabel={speedLabel}
        />

        <div className={styles.simulationStack}>
          <TacticalOverlay snapshot={snapshot} status={status} />
          <TimelineFeed events={events} />
        </div>
      </div>
    </section>
  );
}
