"use client";

import { memo, useMemo } from "react";
import type { BattleStatus, UnitSnapshot } from "../types";
import styles from "./TacticalOverlay.module.css";

type Props = {
  snapshot: ReadonlyArray<UnitSnapshot>;
  status: BattleStatus;
};

const TacticalOverlay = memo(function TacticalOverlay({ snapshot, status }: Props) {
  const teams = useMemo(() => {
    const teammates = snapshot.filter(unit => unit.role === "teammate");
    const enemies = snapshot.filter(unit => unit.role === "enemy");
    return { teammates, enemies };
  }, [snapshot]);

  return (
    <div className={styles.container}>
      <header className={styles.overlayHeader}>
        <span>Тактическая карта</span>
        <span className={styles.status} data-state={status}>
          {translateStatus(status)}
        </span>
      </header>
      <svg className={styles.canvas} viewBox="0 0 800 520" role="img" aria-label="Поле боя умных тиммейтов">
        <defs>
          <linearGradient id="grid-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(148, 163, 184, 0.08)" />
            <stop offset="100%" stopColor="rgba(148, 163, 184, 0)" />
          </linearGradient>
        </defs>
        <rect width="800" height="520" fill="rgba(15, 23, 42, 0.7)" rx="26" />
        <GridLines />
        {teams.teammates.map(unit => (
          <UnitNode key={unit.id} unit={unit} accent="ally" />
        ))}
        {teams.enemies.map(unit => (
          <UnitNode key={unit.id} unit={unit} accent="enemy" />
        ))}
      </svg>
    </div>
  );
});

export default TacticalOverlay;

type Accent = "ally" | "enemy";

const UnitNode = ({ unit, accent }: { unit: UnitSnapshot; accent: Accent }) => {
  const radius = unit.alive ? 26 : 20;
  return (
    <g className={styles.unit} transform={`translate(${unit.position.x}, ${unit.position.y})`}>
      <circle r={radius} className={styles[accent]} opacity={unit.alive ? 1 : 0.45} />
      <circle r={radius + 6} className={styles.unitAura} opacity={unit.alive ? 0.45 : 0.15} />
      <HealthBar unit={unit} accent={accent} />
      <text className={styles.unitLabel} textAnchor="middle" y={radius + 18}>
        {accent === "ally" ? `BOT-${unit.id.split("-")[1]}` : `НПС-${unit.id.split("-")[1]}`}
      </text>
    </g>
  );
};

const HealthBar = ({ unit, accent }: { unit: UnitSnapshot; accent: Accent }) => {
  const barWidth = 84;
  const fill = Math.max(0, unit.hp) / unit.maxHp;
  return (
    <g transform="translate(-42, -48)">
      <rect width={barWidth} height={10} rx={5} className={styles.healthBarTrack} />
      <rect
        width={barWidth * fill}
        height={10}
        rx={5}
        className={styles.healthBarFill}
        data-accent={accent}
      />
    </g>
  );
};

const GridLines = () => {
  const lines = [];
  for (let x = 60; x < 800; x += 60) {
    lines.push(<line key={`v-${x}`} x1={x} y1={0} x2={x} y2={520} className={styles.gridLine} />);
  }
  for (let y = 60; y < 520; y += 60) {
    lines.push(<line key={`h-${y}`} x1={0} y1={y} x2={800} y2={y} className={styles.gridLine} />);
  }
  return <g>{lines}</g>;
};

const translateStatus = (status: BattleStatus) => {
  switch (status) {
    case "victory":
      return "Победа";
    case "defeat":
      return "Поражение";
    case "running":
      return "В бою";
    case "paused":
      return "Пауза";
    case "idle":
    default:
      return "Готовность";
  }
};
