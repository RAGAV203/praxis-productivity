"use client";

import { differenceInYears, parseISO } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { Phone } from "lucide-react";
import { all, getKV } from "@/lib/data";

export interface MedicalId {
  name: string;
  dob?: string;
  bloodGroup?: string;
  allergies?: string;
  conditions?: string;
  medicationsNote?: string;
  height?: string;
  weight?: string;
  organDonor?: boolean;
  notes?: string;
  contacts: { name: string; relation?: string; phone: string }[];
}

export const EMPTY_MEDICAL_ID: MedicalId = { name: "", contacts: [] };

export function useMedicalId() {
  return useLiveQuery(async () => {
    const id = await getKV<MedicalId>("medicalId", EMPTY_MEDICAL_ID);
    const meds = (await all("medicines")).filter((m) => m.active && !m.person);
    return { id, meds };
  }, []);
}

/** iOS-style emergency card. Readable from the lock screen without the passcode. */
export function MedicalIdCard() {
  const d = useMedicalId();
  if (!d) return null;
  const { id, meds } = d;
  const empty = !id.name && !id.bloodGroup && !id.contacts.length;
  if (empty)
    return (
      <div className="pb-4 text-center text-muted">
        No Medical ID set up yet. Add it under Health → Medical ID.
      </div>
    );
  const row = (label: string, value?: string) =>
    value ? (
      <div className="border-b border-hairline py-2 last:border-0">
        <div className="text-[12px] font-semibold uppercase text-bad">{label}</div>
        <div className="text-[16px]">{value}</div>
      </div>
    ) : null;
  return (
    <div className="pb-3">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-bad text-2xl text-white">✱</span>
        <div>
          <div className="text-[22px] font-bold">{id.name}</div>
          {id.dob && (
            <div className="text-muted">
              {differenceInYears(new Date(), parseISO(id.dob))} years · born {id.dob}
            </div>
          )}
        </div>
      </div>
      <div className="rounded-2xl bg-hairline/50 px-4">
        {row("Blood type", id.bloodGroup)}
        {row("Allergies & reactions", id.allergies)}
        {row("Medical conditions", id.conditions)}
        {row("Medications", [id.medicationsNote, ...meds.map((m) => `${m.name}${m.dose ? ` (${m.dose})` : ""}`)].filter(Boolean).join(", ") || undefined)}
        {row("Height / weight", [id.height, id.weight].filter(Boolean).join(" · ") || undefined)}
        {row("Organ donor", id.organDonor ? "Yes" : undefined)}
        {row("Notes", id.notes)}
      </div>
      {id.contacts.length > 0 && (
        <>
          <div className="mb-2 mt-4 text-[12px] font-semibold uppercase text-bad">Emergency contacts</div>
          <div className="space-y-2">
            {id.contacts.map((c, i) => (
              <a key={i} href={`tel:${c.phone}`} className="flex items-center gap-3 rounded-2xl bg-good/12 px-4 py-3">
                <Phone size={18} className="text-good" />
                <span className="flex-1">
                  <b>{c.name}</b> {c.relation && <span className="text-muted">· {c.relation}</span>}
                </span>
                <span className="font-semibold text-good">{c.phone}</span>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
