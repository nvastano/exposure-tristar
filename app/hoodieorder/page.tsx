"use client";

import { useEffect, useState } from "react";
import { sheetsGet, sheetsPost } from "@/lib/sheets";
import LogoLoader from "@/components/LogoLoader";

type PlayerRow = { Id: string; Name: string };

const SIZES = ["YS", "YM", "YL", "YXL", "AS", "AM", "AL", "AXL", "A2XL"];

type FormData = {
  playerName: string;
  parentName: string;
  email: string;
  phone: string;
  size: string;
  quantity: string;
  notes: string;
};

const EMPTY: FormData = {
  playerName: "",
  parentName: "",
  email: "",
  phone: "",
  size: "",
  quantity: "1",
  notes: "",
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-white/60 font-medium">
        {label}{required && <span className="text-accent ml-1">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls = "bg-white/5 border border-white/10 rounded px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-accent/60";
const selectCls = inputCls + " appearance-none";

export default function StorePage() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (sheetsGet("players") as Promise<PlayerRow[]>)
      .then(setPlayers)
      .finally(() => setLoadingPlayers(false));
  }, []);

  function set(field: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.playerName || !form.parentName || !form.email || !form.size) {
      setError("Please complete all required fields.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await sheetsPost("logMerchOrder", {
        playerName: form.playerName,
        parentName: form.parentName,
        email: form.email,
        phone: form.phone,
        item: "Hoodie",
        size: form.size,
        quantity: form.quantity,
        notes: form.notes,
        submittedAt: new Date().toISOString(),
      });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingPlayers) return <LogoLoader />;

  if (done) {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center gap-6 py-16 text-center">
        <div className="text-5xl">✅</div>
        <div>
          <h1 className="text-2xl font-bold tracking-wide">Order Received!</h1>
          <p className="text-white/50 mt-2">
            Thanks, <strong className="text-white">{form.parentName}</strong>! We've got your hoodie order for{" "}
            <strong className="text-white">{form.playerName}</strong>.
            Coach will follow up with payment details.
          </p>
        </div>
        <button
          onClick={() => { setForm(EMPTY); setDone(false); }}
          className="text-sm text-white/40 hover:text-white/70 underline transition-colors"
        >
          Submit another order
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-8">
      <div>
        <p className="text-accent text-xs font-bold tracking-widest uppercase mb-1">Team Elite Prime · 12U</p>
        <h1 className="text-2xl font-bold tracking-wide">Team Hoodie Order</h1>
        <p className="text-white/50 text-sm mt-1">
          Fill out the form below to reserve your hoodie. Coach will reach out with payment details once all orders are collected.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase border-b border-white/10 pb-2">Your Info</h2>
          <Field label="Player Name" required>
            <select value={form.playerName} onChange={(e) => set("playerName", e.target.value)} className={selectCls}>
              <option value="">— Select player —</option>
              {players.map((p) => (
                <option key={p.Id} value={p.Name}>{p.Name}</option>
              ))}
            </select>
          </Field>
          <Field label="Parent / Guardian Name" required>
            <input
              type="text"
              value={form.parentName}
              onChange={(e) => set("parentName", e.target.value)}
              placeholder="e.g. Nick Vastano"
              className={inputCls}
            />
          </Field>
          <Field label="Email" required>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@example.com"
              className={inputCls}
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="(615) 555-5555"
              className={inputCls}
            />
          </Field>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase border-b border-white/10 pb-2">Hoodie Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Size" required>
              <select value={form.size} onChange={(e) => set("size", e.target.value)} className={selectCls}>
                <option value="">— Select size —</option>
                {SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Quantity" required>
              <input
                type="number"
                min={1}
                max={10}
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any questions or special requests"
              rows={3}
              className={inputCls + " resize-none"}
            />
          </Field>
        </section>

        {error && <p className="text-accent text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-accent hover:bg-accent/80 transition-colors text-white font-semibold px-6 py-3 rounded disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Order"}
        </button>
      </form>
    </div>
  );
}
