"use client";

import { format } from "date-fns";
import { exportDB, importInto } from "dexie-export-import";
import { db } from "./db";
import { saveSettings } from "./settings";

/** Full JSON backup (including attached files as base64) — downloads to the device. */
export async function downloadBackup() {
  const blob = await exportDB(db, { prettyJson: false });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `praxis-backup-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  await saveSettings({ lastBackup: Date.now() });
}

/** Replace all local data with a backup file. */
export async function restoreBackup(file: File) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (parsed?.formatName !== "dexie" || !["praxis", "lifedash"].includes(parsed?.data?.databaseName)) throw new Error("This isn't a Praxis backup file.");
  await importInto(db, file, { clearTablesBeforeImport: true, acceptVersionDiff: true, acceptMissingTables: true, acceptChangedPrimaryKey: true });
  await saveSettings({ lastBackup: Date.now(), onboarded: true });
}

export async function eraseEverything() {
  await Promise.all(db.tables.map((t) => t.clear()));
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
}
