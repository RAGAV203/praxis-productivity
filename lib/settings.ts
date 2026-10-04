"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";

export type FocusMode = "personal" | "sleep" | "fitness" | "off";

export interface Settings {
  name: string;
  theme: "auto" | "light" | "dark";
  accent: string;
  currency: string;
  sound: boolean;
  volume: number;
  haptics: boolean;
  mascot: boolean;
  waterGoal: number;
  workoutGoal: number;
  cycleTracking: boolean;
  focusMode: FocusMode;
  focusMinutes: number;
  hiddenWidgets: string[];
  widgetOrder: string[];
  pinHash?: string;
  pinSalt?: string;
  lastBackup?: number;
  notifications: boolean;
  onboarded: boolean;
  stepGoal: number;
  textScale: number;
  favorites: string[];
  hiddenModules: string[];
  weather: boolean;
  weatherLat?: number;
  weatherLon?: number;
  weatherPlace?: string;
}

export const ACCENTS = ["#0a84ff", "#5e5ce6", "#bf5af2", "#ff375f", "#ff9f0a", "#30d158", "#64d2ff", "#ac8e68"];

export const DEFAULT_SETTINGS: Settings = {
  name: "",
  theme: "auto",
  accent: "#0a84ff",
  currency: "INR",
  sound: true,
  volume: 0.5,
  haptics: true,
  mascot: true,
  waterGoal: 2500,
  workoutGoal: 30,
  cycleTracking: false,
  focusMode: "personal",
  focusMinutes: 25,
  hiddenWidgets: [],
  widgetOrder: [],
  notifications: false,
  onboarded: false,
  stepGoal: 8000,
  textScale: 1,
  favorites: ["/more/workflows/", "/life/calendar/", "/health/steps/", "/more/toolkit/"],
  hiddenModules: [],
  weather: false,
};

export async function loadSettings(): Promise<Settings> {
  const r = await db.kv.get("settings");
  return { ...DEFAULT_SETTINGS, ...((r?.value as Partial<Settings>) ?? {}) };
}

export async function saveSettings(patch: Partial<Settings>) {
  const cur = await loadSettings();
  await db.kv.put({ key: "settings", value: { ...cur, ...patch } });
}

export function useSettings(): Settings {
  return useLiveQuery(loadSettings, []) ?? DEFAULT_SETTINGS;
}
