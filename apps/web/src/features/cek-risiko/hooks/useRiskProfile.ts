import { useCallback, useEffect, useState } from 'react';

import {
  DEFAULT_RISK_PROFILE_CHOICE,
  RISK_PERIODS,
  type RiskPeriod,
  type RiskProfileChoice,
  type RiskRule,
  type RiskSl,
} from '../lib/risk-profile';

/**
 * Setelan "Profil risiko" pengguna (ZITN-TECH-043 §3.1). Disimpan di peramban
 * (pola yang sama dengan config widget — tanpa migrasi/endpoint preferensi), dan
 * dijaga tetap valid saat dibaca. **Tanpa telemetri.**
 */
const STORAGE_KEY = 'zitn.cek-risiko.risk-profile.v1';

function isRule(value: unknown): value is RiskRule {
  return typeof value === 'string' && value.length > 0;
}
function isPeriod(value: unknown): value is RiskPeriod {
  return (RISK_PERIODS as readonly string[]).includes(value as string);
}
function asSl(value: unknown): RiskSl | null {
  if (value === 'none') return 'none';
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function parseRiskProfileChoice(raw: string | null): RiskProfileChoice {
  if (!raw) return DEFAULT_RISK_PROFILE_CHOICE;
  try {
    const data = JSON.parse(raw) as Partial<RiskProfileChoice>;
    const sl = asSl(data.sl);
    if (
      !isRule(data.rule) ||
      !isPeriod(data.period) ||
      typeof data.tp !== 'number' ||
      !Number.isFinite(data.tp) ||
      sl === null ||
      typeof data.h !== 'number' ||
      !Number.isFinite(data.h)
    ) {
      return DEFAULT_RISK_PROFILE_CHOICE;
    }
    return { rule: data.rule, period: data.period, tp: data.tp, sl, h: data.h };
  } catch {
    return DEFAULT_RISK_PROFILE_CHOICE;
  }
}

function read(): RiskProfileChoice {
  if (typeof window === 'undefined') return DEFAULT_RISK_PROFILE_CHOICE;
  try {
    return parseRiskProfileChoice(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_RISK_PROFILE_CHOICE;
  }
}

export function useRiskProfile(): {
  choice: RiskProfileChoice;
  setChoice: (choice: RiskProfileChoice) => void;
} {
  const [choice, setChoiceState] = useState<RiskProfileChoice>(read);

  // Keep two tabs in sync (and survive a programmatic clear).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setChoiceState(parseRiskProfileChoice(event.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setChoice = useCallback((next: RiskProfileChoice) => {
    setChoiceState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — keep the in-memory choice */
    }
  }, []);

  return { choice, setChoice };
}
