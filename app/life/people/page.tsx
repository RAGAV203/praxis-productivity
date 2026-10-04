"use client";

import { differenceInYears, parseISO } from "date-fns";
import { CrudPage } from "@/components/CrudPage";
import type { Person } from "@/lib/db";

export default function People() {
  return (
    <CrudPage<Person>
      table="people"
      title="Family & People"
      noun="Person"
      fields={[
        { name: "name", label: "Name", type: "text", required: true },
        { name: "relation", label: "Relation", type: "text", placeholder: "Mom, Brother, Friend…", half: true },
        { name: "phone", label: "Phone", type: "text", half: true },
        { name: "dob", label: "Date of birth", type: "date", half: true },
        { name: "bloodGroup", label: "Blood group", type: "select", options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], half: true },
        { name: "allergies", label: "Allergies / conditions", type: "text" },
        { name: "notes", label: "Notes", type: "textarea", placeholder: "Sizes, preferences, IDs…" },
      ]}
      defaults={() => ({})}
      sort={(a, b) => a.name.localeCompare(b.name)}
      searchText={(p) => `${p.name} ${p.relation ?? ""} ${p.phone ?? ""}`}
      empty={{ emoji: "👨‍👩‍👧", title: "Add your people", hint: "Profiles are used by medications, records, documents and dates." }}
      render={(p) => (
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-accent to-[#bf5af2] text-[18px] font-bold text-white">
            {p.name
              .split(" ")
              .map((x) => x[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{p.name}</div>
            <div className="text-[13px] text-muted">
              {[p.relation, p.dob && `${differenceInYears(new Date(), parseISO(p.dob))} yrs`, p.bloodGroup && `🩸 ${p.bloodGroup}`].filter(Boolean).join(" · ")}
            </div>
            {p.allergies && <div className="text-[12px] text-bad">⚠️ {p.allergies}</div>}
          </div>
          {p.phone && (
            <a href={`tel:${p.phone}`} onClick={(e) => e.stopPropagation()} className="rounded-full bg-good/15 px-3 py-1.5 text-[13px] font-semibold text-good">
              Call
            </a>
          )}
        </div>
      )}
    />
  );
}
