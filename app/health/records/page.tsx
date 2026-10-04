"use client";

import { CrudPage } from "@/components/CrudPage";
import { FileStrip } from "@/components/Files";
import { RECORD_TYPES } from "@/lib/constants";
import type { MedicalRecord } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { todayIso } from "@/lib/recurrence";

const EMOJI: Record<string, string> = { "Lab report": "🧪", Prescription: "📋", Vaccination: "💉", "Scan / X-ray": "🩻", "Discharge summary": "🏥", "Doctor visit": "👩‍⚕️", Other: "📄" };

export default function Records() {
  return (
    <CrudPage<MedicalRecord>
      table="records"
      title="Medical Records"
      noun="Record"
      fields={[
        { name: "type", label: "Type", type: "select", options: RECORD_TYPES, required: true },
        { name: "title", label: "Title", type: "text", required: true, placeholder: "CBC test, Dr. visit…" },
        { name: "person", label: "For", type: "person", half: true },
        { name: "date", label: "Date", type: "date", required: true, half: true },
        { name: "doctor", label: "Doctor / Lab", type: "text" },
        { name: "notes", label: "Notes", type: "textarea" },
        { name: "files", label: "Attachments", type: "files" },
      ]}
      defaults={() => ({ type: "Lab report", date: todayIso() })}
      sort={(a, b) => b.date.localeCompare(a.date)}
      searchText={(r) => `${r.title} ${r.type} ${r.person ?? ""} ${r.doctor ?? ""} ${r.notes ?? ""}`}
      groupBy={(r) => r.person || "Me"}
      empty={{ emoji: "🩺", title: "No records yet", hint: "Keep reports, prescriptions and vaccinations for the whole family in one place." }}
      render={(r) => (
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{EMOJI[r.type] ?? "📄"}</span>
            <div className="flex-1">
              <div className="font-semibold">{r.title}</div>
              <div className="text-[13px] text-muted">
                {r.type} · {fmtDate(r.date)}
                {r.doctor ? ` · ${r.doctor}` : ""}
              </div>
            </div>
          </div>
          <FileStrip ids={r.files} />
        </div>
      )}
    />
  );
}
