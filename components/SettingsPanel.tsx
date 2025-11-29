"use client";

import { useMemo } from "react";
import type { BattleStatus, SimulationMetrics, SpeedModeId, SpeedModeOption } from "../types";
import styles from "./SettingsPanel.module.css";

type DamageChoice = Readonly<{ label: string; value: number }>;

type RunState = {
  isRunning: boolean;
  status: BattleStatus;
};

type Props = {
  damageChoices: ReadonlyArray<DamageChoice>;
  selectedDamage: number;
  onDamageChange: (value: number) => void;
  speedChoices: ReadonlyArray<SpeedModeOption>;
  selectedSpeed: SpeedModeId;
  onSpeedChange: (value: SpeedModeId) => void;
  runState: RunState;
  start: () => void;
  pause: () => void;
  reset: () => void;
  metrics: SimulationMetrics;
  speedLabel: string;
};

export default function SettingsPanel({
  damageChoices,
  selectedDamage,
  onDamageChange,
  speedChoices,
  selectedSpeed,
  onSpeedChange,
  runState,
  start,
  pause,
  reset,
  metrics,
  speedLabel
}: Props) {
  const secondsFormatter = useMemo(
    () =>
      new Intl.NumberFormat("ru-RU", {
        maximumFractionDigits: 1
      }),
    []
  );

  const damageFormatter = useMemo(
    () =>
      new Intl.NumberFormat("ru-RU", {
        maximumFractionDigits: 0
      }),
    []
  );

  const controlLabel = runState.isRunning ? "Пауза" : runState.status === "paused" ? "Продолжить" : "Старт";

  return (
    <aside className={styles.panel} aria-label="Панель настроек SmartTeammates">
      <div>
        <h2 className={styles.heading}>Mod Options</h2>
        <p className={styles.description}>
          Точные боевые настройки для умных тиммейтов. Выбирай множитель урона и режим скорости, чтобы адаптировать команду к
          текущей угрозе.
        </p>
      </div>

      <div className={styles.fieldset}>
        <span className={styles.label}>Множитель урона</span>
        <div className={styles.choiceList}>
          {damageChoices.map(choice => (
            <button
              key={choice.label}
              className={choice.value === selectedDamage ? styles.choiceActive : styles.choice}
              type="button"
              onClick={() => onDamageChange(choice.value)}
              aria-pressed={choice.value === selectedDamage}
            >
              <strong>{choice.label}</strong>
              <span>Гарантированный бонус</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.fieldset}>
        <span className={styles.label}>Скорость передвижения</span>
        <div className={styles.choiceList}>
          {speedChoices.map(choice => (
            <button
              key={choice.id}
              className={choice.id === selectedSpeed ? styles.choiceActive : styles.choice}
              type="button"
              onClick={() => onSpeedChange(choice.id)}
              aria-pressed={choice.id === selectedSpeed}
            >
              <strong>{choice.label}</strong>
              <span>{choice.description}</span>
            </button>
          ))}
        </div>
      </div>

      <dl className={styles.metrics}>
        <div>
          <dt>Статус</dt>
          <dd>{translateStatus(runState.status)}</dd>
        </div>
        <div>
          <dt>Выбранная скорость</dt>
          <dd>{speedLabel}</dd>
        </div>
        <div>
          <dt>Длительность боя</dt>
          <dd>{secondsFormatter.format(metrics.elapsedSeconds)} сек</dd>
        </div>
        <div>
          <dt>Урон союзников</dt>
          <dd>{damageFormatter.format(metrics.teammateDamageInflicted)}</dd>
        </div>
        <div>
          <dt>Урон противника</dt>
          <dd>{damageFormatter.format(metrics.enemyDamageInflicted)}</dd>
        </div>
      </dl>

      <div className={styles.controls}>
        <button type="button" className={styles.primaryButton} onClick={runState.isRunning ? pause : start}>
          {controlLabel}
        </button>
        <button type="button" className={styles.secondaryButton} onClick={reset}>
          Сброс
        </button>
      </div>

      <footer className={styles.footer}>
        <span>SmartTeammates · Skyline</span>
        <span>Интеграция AI и боевой логики</span>
      </footer>
    </aside>
  );
}

const translateStatus = (status: BattleStatus): string => {
  switch (status) {
    case "idle":
      return "Готовность";
    case "running":
      return "В бою";
    case "paused":
      return "Пауза";
    case "victory":
      return "Победа";
    case "defeat":
      return "Поражение";
    default:
      return "Неизвестно";
  }
};
