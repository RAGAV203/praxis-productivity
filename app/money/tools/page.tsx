"use client";

import { useState } from "react";
import { Card, PageHeader, Segmented } from "@/components/ui";
import { emi } from "@/lib/finance";
import { money } from "@/lib/format";
import { useSettings } from "@/lib/settings";

type Tool = "emi" | "sip" | "tip" | "units";

export default function Tools() {
  const [tool, setTool] = useState<Tool>("emi");
  return (
    <div>
      <PageHeader title="Calculators" back />
      <Segmented
        id="tools"
        value={tool}
        onChange={setTool}
        options={[
          { value: "emi", label: "EMI" },
          { value: "sip", label: "SIP" },
          { value: "tip", label: "Split" },
          { value: "units", label: "Units" },
        ]}
      />
      <div className="mt-4">
        {tool === "emi" && <EmiCalc />}
        {tool === "sip" && <SipCalc />}
        {tool === "tip" && <TipCalc />}
        {tool === "units" && <Units />}
      </div>
    </div>
  );
}

function Num({ label, value, onChange, suffix }: { label: string; value: number; onChange: (n: number) => void; suffix?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block px-1 text-[13px] font-medium text-muted">{label}</span>
      <div className="relative">
        <input className="field pr-14" type="number" inputMode="decimal" value={Number.isFinite(value) ? value : ""} onChange={(e) => onChange(Number(e.target.value))} />
        {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-muted">{suffix}</span>}
      </div>
    </label>
  );
}

function Result({ items }: { items: [string, string, boolean?][] }) {
  return (
    <Card strong className="mt-4 space-y-2">
      {items.map(([k, v, big]) => (
        <div key={k} className="flex items-baseline justify-between">
          <span className="text-muted">{k}</span>
          <span className={big ? "text-[26px] font-bold" : "font-semibold"}>{v}</span>
        </div>
      ))}
    </Card>
  );
}

function EmiCalc() {
  const s = useSettings();
  const [p, setP] = useState(1000000);
  const [r, setR] = useState(8.5);
  const [n, setN] = useState(240);
  const e = emi(p, r, n);
  const f = (x: number) => money(x, s.currency);
  return (
    <Card className="space-y-3">
      <Num label="Loan amount" value={p} onChange={setP} />
      <div className="grid grid-cols-2 gap-3">
        <Num label="Interest" value={r} onChange={setR} suffix="%" />
        <Num label="Tenure" value={n} onChange={setN} suffix="mo" />
      </div>
      <Result items={[["Monthly EMI", f(e), true], ["Total interest", f(e * n - p)], ["Total payment", f(e * n)]]} />
    </Card>
  );
}

function SipCalc() {
  const s = useSettings();
  const [m, setM] = useState(10000);
  const [r, setR] = useState(12);
  const [y, setY] = useState(10);
  const i = r / 12 / 100;
  const n = y * 12;
  const fv = i ? m * ((Math.pow(1 + i, n) - 1) / i) * (1 + i) : m * n;
  const f = (x: number) => money(x, s.currency);
  return (
    <Card className="space-y-3">
      <Num label="Monthly investment" value={m} onChange={setM} />
      <div className="grid grid-cols-2 gap-3">
        <Num label="Expected return" value={r} onChange={setR} suffix="%" />
        <Num label="Years" value={y} onChange={setY} suffix="yr" />
      </div>
      <Result items={[["Future value", f(fv), true], ["Invested", f(m * n)], ["Gains", f(fv - m * n)]]} />
    </Card>
  );
}

function TipCalc() {
  const s = useSettings();
  const [bill, setBill] = useState(2400);
  const [tip, setTip] = useState(10);
  const [people, setPeople] = useState(4);
  const total = bill * (1 + tip / 100);
  const f = (x: number) => money(x, s.currency);
  return (
    <Card className="space-y-3">
      <Num label="Bill" value={bill} onChange={setBill} />
      <div className="grid grid-cols-2 gap-3">
        <Num label="Tip" value={tip} onChange={setTip} suffix="%" />
        <Num label="People" value={people} onChange={setPeople} />
      </div>
      <Result items={[["Per person", f(total / Math.max(1, people)), true], ["Tip", f(total - bill)], ["Total", f(total)]]} />
    </Card>
  );
}

const UNITS: Record<string, Record<string, number>> = {
  Length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, ft: 0.3048, in: 0.0254 },
  Weight: { kg: 1, g: 0.001, lb: 0.45359237, oz: 0.028349523 },
  Volume: { L: 1, mL: 0.001, gal: 3.78541, cup: 0.24 },
  Area: { "m²": 1, "ft²": 0.092903, acre: 4046.86, hectare: 10000 },
  Temp: { "°C": 1, "°F": 1, K: 1 },
};

function convertTemp(v: number, from: string, to: string) {
  const c = from === "°C" ? v : from === "°F" ? ((v - 32) * 5) / 9 : v - 273.15;
  return to === "°C" ? c : to === "°F" ? (c * 9) / 5 + 32 : c + 273.15;
}

function Units() {
  const [kind, setKind] = useState("Length");
  const units = Object.keys(UNITS[kind]);
  const [from, setFrom] = useState(units[0]);
  const [to, setTo] = useState(units[1]);
  const [v, setV] = useState(1);
  const f = units.includes(from) ? from : units[0];
  const t = units.includes(to) ? to : units[1];
  const out = kind === "Temp" ? convertTemp(v, f, t) : (v * UNITS[kind][f]) / UNITS[kind][t];
  return (
    <Card className="space-y-3">
      <select className="field" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Unit type">
        {Object.keys(UNITS).map((k) => (
          <option key={k}>{k}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <Num label="Value" value={v} onChange={setV} />
        <label className="block">
          <span className="mb-1 block px-1 text-[13px] font-medium text-muted">From</span>
          <select className="field" value={f} onChange={(e) => setFrom(e.target.value)}>
            {units.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block px-1 text-[13px] font-medium text-muted">To</span>
        <select className="field" value={t} onChange={(e) => setTo(e.target.value)}>
          {units.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
      </label>
      <Result items={[[`${v} ${f} =`, `${Number(out.toPrecision(6))} ${t}`, true]]} />
    </Card>
  );
}
