"use client";

import { useState } from "react";
import { sheetsPost } from "@/lib/sheets";

type FormData = {
  name: string;
  email: string;
  phone: string;
  quantity: string;
  notes: string;
};

const EMPTY: FormData = {
  name: "",
  email: "",
  phone: "",
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

export default function TowelOrderPage() {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField(field: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email) {
      setError("Please complete all required fields.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await sheetsPost("logMerchOrder", {
        playerName: form.name,
        parentName: form.name,
        email: form.email,
        phone: form.phone,
        item: "Pitching Towel Trainer",
        size: "",
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

  if (done) {
    const qty = parseInt(form.quantity || "1");
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center gap-6 py-16 text-center">
        <div className="text-5xl">✅</div>
        <div>
          <h1 className="text-2xl font-bold tracking-wide">Order Received!</h1>
          <p className="text-white/50 mt-2">
            Thanks, <strong className="text-white">{form.name}</strong>! We've got your order of{" "}
            <strong className="text-white">{qty} towel trainer{qty !== 1 ? "s" : ""}</strong> for{" "}
            <strong className="text-white">${qty * 5}</strong>. Go ahead and send payment via Venmo below.
          </p>
          <a
            href={`https://venmo.com/u/NickVastano?txn=pay&amount=${qty * 5}&note=Pitching%20Towel%20Trainer%20x${qty}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block bg-[#008CFF] hover:bg-[#0070cc] transition-colors text-white font-semibold px-6 py-3 rounded text-sm"
          >
            Pay ${qty * 5} on Venmo →
          </a>
        </div>
        <button
          onClick={() => { setForm(EMPTY); setDone(false); }}
          className="text-sm text-white/40 hover:text-white/70 underline transition-colors"
        >
          Submit another response
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-8">
      {/* Product photos */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl overflow-hidden border border-white/10 shadow-xl bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/towel-trainer-1.jpg" alt="Pitching Towel Trainer - in hand" className="w-full object-cover aspect-square" />
        </div>
        <div className="rounded-xl overflow-hidden border border-white/10 shadow-xl bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/towel-trainer-2.png" alt="Pitching Towel Trainer - laid flat" className="w-full object-cover aspect-square" />
        </div>
      </div>

      <div>
        <p className="text-accent text-xs font-bold tracking-widest uppercase mb-1">Team Elite Prime · 12U</p>
        <h1 className="text-2xl font-bold tracking-wide">Pitching Towel Trainer</h1>
        <p className="text-white/50 text-sm mt-1">
          A weighted baseball secured to a microfiber towel — a classic arm path and extension trainer used by pitchers at every level.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-2xl font-black text-white">$5</span>
          <span className="text-white/40 text-sm">per trainer · towel included</span>
        </div>
        <div className="mt-3 bg-accent/10 border border-accent/30 rounded-lg px-4 py-3 text-sm text-white/80">
          Submit your order below and pay via Venmo on the next screen.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase border-b border-white/10 pb-2">Your Info</h2>
          <Field label="Your Name" required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
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
          <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase border-b border-white/10 pb-2">Order</h2>
          <Field label="Quantity">
            <input
              type="number"
              min={1}
              max={10}
              value={form.quantity}
              onChange={(e) => setField("quantity", e.target.value)}
              className={inputCls + " w-24"}
            />
          </Field>
          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Any questions or comments"
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
