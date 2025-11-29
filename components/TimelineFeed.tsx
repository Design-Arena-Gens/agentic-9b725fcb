"use client";

import { useMemo } from "react";
import type { BattleEvent } from "../types";
import styles from "./TimelineFeed.module.css";

type Props = {
  events: ReadonlyArray<BattleEvent>;
};

const TimelineFeed = ({ events }: Props) => {
  const ordered = useMemo(() => events.slice(0, 14), [events]);

  if (!ordered.length) {
    return (
      <div className={styles.placeholder}>
        <span>Боевой лог появится во время симуляции</span>
      </div>
    );
  }

  return (
    <ol className={styles.feed} aria-live="polite">
      {ordered.map(event => (
        <li key={event.id} className={styles.entry} data-tone={event.tone}>
          <span className={styles.badge}>T{event.tick.toString().padStart(2, "0")}</span>
          <p>{event.summary}</p>
        </li>
      ))}
    </ol>
  );
};

export default TimelineFeed;
