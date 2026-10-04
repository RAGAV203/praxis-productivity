"use client";

import { differenceInCalendarDays, parseISO } from "date-fns";
import { CrudPage } from "@/components/CrudPage";
import { FileStrip } from "@/components/Files";
import { DOC_TYPES } from "@/lib/constants";
import type { Doc } from "@/lib/db";
import { cn, fmtDate } from "@/lib/format";
import { todayIso } from "@/lib/recurrence";

const EMOJI: Record<string, string> = { Aadhaar: "🪪", PAN: "💳", Passport: "🛂", "Driving Licence": "🚗", "Voter ID": "🗳️", Insurance: "🛡️", "Vehicle RC": "📄", Property: "🏠", Certificate: "🎓", Other: "📁" };

export default function Documents() {
  const today = todayIso();
  return (
    <CrudPage<Doc>
      table="docs"
      title="Documents"
      noun="Document"
      fields={[
        { name: "type", label: "Type", type: "select", options: DOC_TYPES, required: true },
        { name: "title", label: "Title", type: "text", required: true, placeholder: "My passport" },
        { name: "number", label: "Number", type: "text", half: true },
        { name: "person", label: "Belongs to", type: "person", half: true },
        { name: "issueDate", label: "Issued", type: "date", half: true },
        { name: "expiryDate", label: "Expires", type: "date", half: true, hint: "Reminders 30 days ahead" },
        { name: "files", label: "Scans / photos", type: "files" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
      defaults={() => ({ type: "Aadhaar" })}
      sort={(a, b) => (a.expiryDate ?? "9999").localeCompare(b.expiryDate ?? "9999")}
      searchText={(d) => `${d.title} ${d.type} ${d.number ?? ""} ${d.person ?? ""}`}
      groupBy={(d) => d.person || "Me"}
      empty={{ emoji: "🗂️", title: "No documents", hint: "Keep IDs, policies and certificates handy, with expiry reminders. Stored only on this device." }}
      render={(d) => {
        const left = d.expiryDate ? differenceInCalendarDays(parseISO(d.expiryDate), parseISO(today)) : null;
        return (
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{EMOJI[d.type] ?? "📁"}</span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{d.title}</div>
                <div className="truncate text-[13px] text-muted">
                  {d.type}
                  {d.number ? ` · ${d.number.length > 4 ? "•••• " + d.number.slice(-4) : d.number}` : ""}
                </div>
              </div>
              {left != null && (
                <span className={cn("rounded-full px-2 py-0.5 text-[12px] font-semibold", left < 0 ? "bg-bad/15 text-bad" : left <= 30 ? "bg-warn/15 text-warn" : "bg-hairline text-muted")}>
                  {left < 0 ? "Expired" : `Exp ${fmtDate(d.expiryDate!, "MMM yyyy")}`}
                </span>
              )}
            </div>
            <FileStrip ids={d.files} />
          </div>
        );
      }}
    />
  );
}
