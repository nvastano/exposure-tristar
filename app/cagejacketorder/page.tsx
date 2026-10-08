"use client";

import { useState } from "react";
import { sheetsPost } from "@/lib/sheets";

type LineItem = { size: string; quantity: string };

const SIZES = ["YS", "YM", "YL", "YXL", "AS", "AM", "AL", "AXL", "A2XL"];

const EMPTY_LINE: LineItem = { size: "", quantity: "1" };

type FormData = {
  playerName: string;
  parentName: string;
  email: string;
  phone: string;
  lines: LineItem[];
  notes: string;
};

const EMPTY: FormData = {
  playerName: "",
  parentName: "",
  email: "",
  phone: "",
  lines: [{ ...EMPTY_LINE }],
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

export default function CageJacketOrderPage() {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField(field: keyof Omit<FormData, "lines">, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function setLine(index: number, field: keyof LineItem, value: string) {
    setForm((f) => {
      const lines = [...f.lines];
      lines[index] = { ...lines[index], [field]: value };
      return { ...f, lines };
    });
  }

  function addLine() {
    setForm((f) => ({ ...f, lines: [...f.lines, { ...EMPTY_LINE }] }));
  }

  function removeLine(index: number) {
    setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.playerName || !form.parentName || !form.email) {
      setError("Please complete all required fields.");
      return;
    }
    if (form.lines.some((l) => !l.size)) {
      setError("Please select a size for each jacket.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await Promise.all(
        form.lines.map((line) =>
          sheetsPost("logMerchOrder", {
            playerName: form.playerName,
            parentName: form.parentName,
            email: form.email,
            phone: form.phone,
            item: "Cage Jacket",
            size: line.size,
            quantity: line.quantity,
            notes: form.notes,
            submittedAt: new Date().toISOString(),
          })
        )
      );
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    const totalQty = form.lines.reduce((sum, l) => sum + parseInt(l.quantity || "1"), 0);
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center gap-6 py-16 text-center">
        <div className="text-5xl">✅</div>
        <div>
          <h1 className="text-2xl font-bold tracking-wide">Order Received!</h1>
          <p className="text-white/50 mt-2">
            Thanks, <strong className="text-white">{form.parentName}</strong>! We've got your order of{" "}
            <strong className="text-white">{totalQty} cage jacket{totalQty !== 1 ? "s" : ""}</strong> for{" "}
            <strong className="text-white">{form.playerName}</strong>.
            Coach will follow up with payment details.
          </p>
          <div className="mt-3 text-sm text-white/40 space-y-0.5">
            {form.lines.map((l, i) => (
              <p key={i}>{l.quantity}x {l.size}</p>
            ))}
          </div>
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
      {/* Mockup */}
      <div className="w-full rounded-xl overflow-hidden border border-white/10 shadow-xl bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/cage-jacket-mockup.png" alt="Team Elite Cage Jacket" className="w-full object-contain" />
      </div>

      <div>
        <p className="text-accent text-xs font-bold tracking-widest uppercase mb-1">Team Elite Prime · 12U</p>
        <h1 className="text-2xl font-bold tracking-wide">Cage Jacket Order</h1>
        <p className="text-white/50 text-sm mt-1">
          Black short-sleeve cage jacket with Team Elite logo. Players only.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-2xl font-black text-white">$36</span>
          <span className="text-white/40 text-sm">per jacket</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase border-b border-white/10 pb-2">Your Info</h2>
          <Field label="Player Name" required>
            <input
              type="text"
              value={form.playerName}
              onChange={(e) => setField("playerName", e.target.value)}
              placeholder="e.g. Jake Vastano"
              className={inputCls}
            />
          </Field>
          <Field label="Parent / Guardian Name" required>
            <input
              type="text"
              value={form.parentName}
              onChange={(e) => setField("parentName", e.target.value)}
              placeholder="e.g. Nick Vastano"
              className={inputCls}
            />
          </Field>
          <Field label="Email" required>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="you@example.com"
              className={inputCls}
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="(615) 555-5555"
              className={inputCls}
            />
          </Field>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase border-b border-white/10 pb-2">Jackets</h2>
          {form.lines.map((line, i) => (
            <div key={i} className="flex items-end gap-3">
              <div className="flex-1">
                <Field label={i === 0 ? "Size" : ""} required={i === 0}>
                  <select value={line.size} onChange={(e) => setLine(i, "size", e.target.value)} className={selectCls}>
                    <option value="">— Size —</option>
                    {SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="w-20">
                <Field label={i === 0 ? "Qty" : ""}>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={line.quantity}
                    onChange={(e) => setLine(i, "quantity", e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>
              {form.lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  className="pb-2 text-white/30 hover:text-accent transition-colors text-lg leading-none"
                  aria-label="Remove"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addLine}
            className="text-sm text-accent/80 hover:text-accent border border-dashed border-accent/30 hover:border-accent/60 rounded-lg py-2 transition-colors"
          >
            + Add another size
          </button>
          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
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
          {submitting ? "Submitting..." : "Place Order"}
        </button>
      </form>
    </div>
  );
}
