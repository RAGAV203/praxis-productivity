"use client";

import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { useState } from "react";
import { CrudPage } from "@/components/CrudPage";
import { Btn, Card, PageHeader, Segmented, Sheet } from "@/components/ui";
import { guessAisle } from "@/lib/aisles";
import type { Meal, Recipe } from "@/lib/db";
import { add, remove, update, useRows } from "@/lib/data";
import { cn } from "@/lib/format";
import { iso, todayIso } from "@/lib/recurrence";
import { toast } from "@/lib/store";

const SLOTS: Meal["slot"][] = ["breakfast", "lunch", "dinner"];
const SLOT_EMOJI = { breakfast: "🥣", lunch: "🍛", dinner: "🍲" };

export default function Recipes() {
  const [tab, setTab] = useState<"plan" | "recipes">("plan");
  return (
    <div>
      {tab === "recipes" ? (
        <RecipeList tabs={<Tabs tab={tab} setTab={setTab} />} />
      ) : (
        <MealPlan tabs={<Tabs tab={tab} setTab={setTab} />} />
      )}
    </div>
  );
}

function Tabs({ tab, setTab }: { tab: "plan" | "recipes"; setTab: (t: "plan" | "recipes") => void }) {
  return (
    <div className="mb-3">
      <Segmented id="rec" value={tab} onChange={setTab} options={[{ value: "plan", label: "Meal plan" }, { value: "recipes", label: "Recipes" }]} />
    </div>
  );
}

async function addIngredients(r: Recipe) {
  for (const i of r.ingredients) await add("grocery", { name: i, aisle: guessAisle(i), done: false });
  toast(`${r.ingredients.length} ingredients added to grocery`, { emoji: "🛒" });
}

function RecipeList({ tabs }: { tabs: React.ReactNode }) {
  return (
    <CrudPage<Recipe>
      table="recipes"
      title="Recipes & Meals"
      noun="Recipe"
      fields={[
        { name: "title", label: "Recipe", type: "text", required: true },
        { name: "minutes", label: "Time (min)", type: "number", half: true },
        { name: "tags", label: "Tags", type: "tags", half: true, placeholder: "veg, quick" },
        { name: "ingredients", label: "Ingredients", type: "list", placeholder: "Add ingredient…" },
        { name: "steps", label: "Method", type: "textarea" },
      ]}
      defaults={() => ({ ingredients: [], tags: [] })}
      sort={(a, b) => a.title.localeCompare(b.title)}
      searchText={(r) => `${r.title} ${r.ingredients.join(" ")} ${(r.tags ?? []).join(" ")}`}
      header={() => tabs}
      empty={{ emoji: "🍳", title: "No recipes", hint: "Save family favourites and send ingredients to your grocery list." }}
      render={(r) => (
        <div className="flex items-center gap-3">
          <span className="text-3xl">🍳</span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{r.title}</div>
            <div className="truncate text-[13px] text-muted">
              {r.minutes ? `${r.minutes} min · ` : ""}
              {r.ingredients.length} ingredients
              {(r.tags ?? []).length ? ` · ${r.tags!.join(", ")}` : ""}
            </div>
          </div>
          <span onClick={(e) => e.stopPropagation()}>
            <Btn variant="soft" className="px-3 py-1.5 text-[13px]" onClick={() => addIngredients(r)}>
              🛒
            </Btn>
          </span>
        </div>
      )}
    />
  );
}

function MealPlan({ tabs }: { tabs: React.ReactNode }) {
  const meals = useRows("meals");
  const recipes = useRows("recipes");
  const [weekStart, setWeekStart] = useState(() => iso(startOfWeek(new Date(), { weekStartsOn: 1 })));
  const [slot, setSlot] = useState<{ date: string; slot: Meal["slot"] } | null>(null);
  const [text, setText] = useState("");
  const days = Array.from({ length: 7 }, (_, i) => iso(addDays(parseISO(weekStart), i)));
  const today = todayIso();
  const current = slot ? meals?.find((m) => m.date === slot.date && m.slot === slot.slot) : undefined;

  const save = async (value: string, recipeId?: string) => {
    if (!slot) return;
    if (current) {
      if (!value) await remove("meals", current.id);
      else await update("meals", current.id, { text: value, recipeId });
    } else if (value) await add("meals", { ...slot, text: value, recipeId });
    setSlot(null);
  };

  return (
    <div>
      <PageHeader title="Recipes & Meals" back />
      {tabs}
      <div className="mb-2 flex items-center justify-between">
        <button className="font-semibold text-accent" onClick={() => setWeekStart(iso(addDays(parseISO(weekStart), -7)))}>
          ‹ Prev
        </button>
        <span className="font-semibold">Week of {format(parseISO(weekStart), "d MMM")}</span>
        <button className="font-semibold text-accent" onClick={() => setWeekStart(iso(addDays(parseISO(weekStart), 7)))}>
          Next ›
        </button>
      </div>
      <div className="space-y-2">
        {days.map((d) => (
          <Card key={d} className={cn(d === today && "ring-2 ring-accent")}>
            <div className="mb-1.5 text-[13px] font-semibold text-muted">{format(parseISO(d), "EEEE d")}</div>
            <div className="grid grid-cols-3 gap-2">
              {SLOTS.map((s) => {
                const m = meals?.find((x) => x.date === d && x.slot === s);
                return (
                  <button key={s} onClick={() => (setSlot({ date: d, slot: s }), setText(m?.text ?? ""))} className={cn("min-h-14 rounded-xl p-2 text-left text-[13px]", m ? "bg-accent/12" : "border border-dashed border-faint/60 text-muted")}>
                    <div>{SLOT_EMOJI[s]}</div>
                    <div className="line-clamp-2 font-medium">{m?.text ?? s}</div>
                  </button>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
      <Sheet open={!!slot} onClose={() => setSlot(null)} title={slot ? `${SLOT_EMOJI[slot.slot]} ${slot.slot} · ${format(parseISO(slot.date), "EEE d MMM")}` : ""} footer={<Btn full onClick={() => save(text.trim())}>Save</Btn>}>
        <input autoFocus className="field" placeholder="What's cooking?" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save(text.trim())} />
        {(recipes ?? []).length > 0 && (
          <>
            <div className="mb-2 mt-4 text-[13px] font-semibold text-muted">From your recipes</div>
            <div className="flex flex-wrap gap-2">
              {recipes!.map((r) => (
                <button key={r.id} onClick={() => save(r.title, r.id)} className="rounded-full bg-hairline px-3 py-1.5 text-[14px]">
                  🍳 {r.title}
                </button>
              ))}
            </div>
          </>
        )}
        {current && (
          <button className="mt-4 text-[14px] font-semibold text-bad" onClick={() => save("")}>
            Remove meal
          </button>
        )}
      </Sheet>
    </div>
  );
}
