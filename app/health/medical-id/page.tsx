"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { EMPTY_MEDICAL_ID, MedicalIdCard, useMedicalId, type MedicalId } from "@/components/MedicalIdCard";
import { Btn, Card, PageHeader, SectionTitle, Sheet, Toggle } from "@/components/ui";
import { setKV, useRows } from "@/lib/data";
import { toast } from "@/lib/store";

export default function MedicalIdPage() {
  const d = useMedicalId();
  const people = useRows("people");
  const [edit, setEdit] = useState<MedicalId | null>(null);
  const set = (patch: Partial<MedicalId>) => edit && setEdit({ ...edit, ...patch });

  return (
    <div>
      <PageHeader title="Medical ID" back subtitle="Shown on the lock screen in an emergency" actions={<Btn className="px-4 py-2" onClick={() => setEdit({ ...EMPTY_MEDICAL_ID, ...(d?.id ?? {}), contacts: [...(d?.id.contacts ?? [])] })}>Edit</Btn>} />
      <Card strong>
        <MedicalIdCard />
      </Card>
      <p className="mt-3 px-2 text-[12px] text-muted">
        With a passcode set, anyone holding your phone can open this card from the lock screen via <b>🆘 Emergency</b>, just like on iPhone. Active medications you take are added automatically.
      </p>

      <Sheet
        open={!!edit}
        onClose={() => setEdit(null)}
        title="Edit Medical ID"
        footer={
          <Btn
            full
            onClick={async () => {
              if (!edit) return;
              await setKV("medicalId", { ...edit, contacts: edit.contacts.filter((c) => c.name && c.phone) });
              toast("Medical ID saved", { emoji: "🆘" });
              setEdit(null);
            }}
          >
            Save
          </Btn>
        }
      >
        {edit && (
          <div className="grid grid-cols-2 gap-3 pb-2">
            <L label="Full name" full>
              <input className="field" value={edit.name} onChange={(e) => set({ name: e.target.value })} />
            </L>
            <L label="Date of birth">
              <input className="field" type="date" value={edit.dob ?? ""} onChange={(e) => set({ dob: e.target.value })} />
            </L>
            <L label="Blood type">
              <select className="field" value={edit.bloodGroup ?? ""} onChange={(e) => set({ bloodGroup: e.target.value })}>
                <option value="">—</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </L>
            <L label="Allergies & reactions" full>
              <input className="field" value={edit.allergies ?? ""} onChange={(e) => set({ allergies: e.target.value })} placeholder="Penicillin, peanuts…" />
            </L>
            <L label="Medical conditions" full>
              <input className="field" value={edit.conditions ?? ""} onChange={(e) => set({ conditions: e.target.value })} placeholder="Asthma, diabetes…" />
            </L>
            <L label="Other medications" full>
              <input className="field" value={edit.medicationsNote ?? ""} onChange={(e) => set({ medicationsNote: e.target.value })} />
            </L>
            <L label="Height">
              <input className="field" value={edit.height ?? ""} onChange={(e) => set({ height: e.target.value })} placeholder="175 cm" />
            </L>
            <L label="Weight">
              <input className="field" value={edit.weight ?? ""} onChange={(e) => set({ weight: e.target.value })} placeholder="72 kg" />
            </L>
            <div className="col-span-2 flex items-center justify-between rounded-2xl bg-hairline px-4 py-3">
              <span>Organ donor</span>
              <Toggle checked={!!edit.organDonor} onChange={(v) => set({ organDonor: v })} />
            </div>
            <L label="Notes" full>
              <textarea className="field min-h-20" value={edit.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
            </L>
            <div className="col-span-2">
              <SectionTitle>Emergency contacts</SectionTitle>
              {edit.contacts.map((c, i) => (
                <div key={i} className="mb-2 grid grid-cols-[1fr_1fr_auto] gap-2">
                  <input className="field" placeholder="Name" value={c.name} onChange={(e) => set({ contacts: edit.contacts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                  <input className="field" placeholder="Phone" inputMode="tel" value={c.phone} onChange={(e) => set({ contacts: edit.contacts.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)) })} />
                  <button aria-label="Remove contact" onClick={() => set({ contacts: edit.contacts.filter((_, j) => j !== i) })} className="grid w-11 place-items-center rounded-[14px] bg-bad/12 text-bad">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Btn variant="soft" className="px-3 py-2 text-[14px]" onClick={() => set({ contacts: [...edit.contacts, { name: "", phone: "" }] })}>
                  <Plus size={15} /> Add contact
                </Btn>
                {(people ?? [])
                  .filter((p) => p.phone && !edit.contacts.some((c) => c.phone === p.phone))
                  .map((p) => (
                    <button key={p.id} onClick={() => set({ contacts: [...edit.contacts, { name: p.name, relation: p.relation, phone: p.phone! }] })} className="rounded-full bg-hairline px-3 py-2 text-[13px]">
                      + {p.name}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function L({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={full ? "col-span-2 block" : "block"}>
      <span className="mb-1.5 block px-1 text-[13px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
