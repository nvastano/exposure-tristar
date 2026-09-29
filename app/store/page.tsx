"use client";

import { useState } from "react";
import { sheetsPost } from "@/lib/sheets";

const ITEMS = [
  { id: "tshirt", label: "T-Shirt" },
  { id: "hoodie", label: "Hoodie" },
  { id: "hat", label: "Hat" },
  { id: "batting-gloves", label: "Batting Gloves" },
  { id: "compression-shorts", label: "Compression Shorts" },
];

const SIZES = ["YS", "YM", "YL", "YXL", "AS", "AM", "AL", "AXL", "A2XL"];

type LineItem = {
  item: string;
  size: string;
  quantity: string;
};

type FormData = {
  playerName: string;
  parentName: string;
  email: string;
  phone: string;
  items: LineItem[];
  notes: string;
};

const EMPTY_ITEM: LineItem = { item: "", size: "", quantity: "1" };

const EMPTY: FormData = {
  playerName: "",
  parentName: "",
  email: "",
  phone: "",
  items: [{ ...EMPTY_ITEM }],
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
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField(field: keyof Omit<FormData, "items">, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function setItem(index: number, field: keyof LineItem, value: string) {
    setForm((f) => {
      const items = [...f.items];
      items[index] = { ...items[index], [field]: value };
      return { ...f, items };
    });
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  }

  function removeItem(index: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.playerName || !form.parentName || !form.email) {
      setError("Please complete all required fields.");
      return;
    }
    if (form.items.some((i) => !i.item || !i.size || !i.quantity)) {
      setError("Please complete all item fields.");
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
        items: form.items.map((i) => `${i.quantity}x ${i.item} (${i.size})`).join(", "),
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
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center gap-6 py-16 text-center">
        <div className="text-5xl">✅</div>
        <div>
          <h1 className="text-2xl font-bold tracking-wide">Order Received!</h1>
          <p className="text-white/50 mt-2">
            Thanks, <strong className="text-white">{form.parentName}</strong>. We've received your merch order for{" "}
            <strong className="text-white">{form.playerName}</strong>. Coach will follow up with details.
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
        <p className="text-accent text-xs font-bold tracking-widest uppercase mb-1">Team Elite Prime</p>
        <h1 className="text-2xl font-bold tracking-wide">Merch Order</h1>
        <p className="text-white/50 text-sm mt-1">
          Submit your order below. Coach will compile all orders and place the bulk order.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">

        {/* Contact */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase border-b border-white/10 pb-2">Your Info</h2>
          <Field label="Player Name" required>
            <input
              type="text"
              value={form.playerName}
              onChange={(e) => setField("playerName", e.target.value)}
              placeholder="e.g. Hudson Vastano"
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

        {/* Items */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase border-b border-white/10 pb-2">Items</h2>
          {form.items.map((item, i) => (
            <div key={i} className="flex flex-col gap-3 bg-white/3 border border-white/8 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40 font-semibold tracking-widest uppercase">Item {i + 1}</span>
                {form.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="text-xs text-white/30 hover:text-accent transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              <Field label="Item" required>
                <select value={item.item} onChange={(e) => setItem(i, "item", e.target.value)} className={selectCls}>
                  <option value="">— Select item —</option>
                  {ITEMS.map((it) => (
                    <option key={it.id} value={it.label}>{it.label}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Size" required>
                  <select value={item.size} onChange={(e) => setItem(i, "size", e.target.value)} className={selectCls}>
                    <option value="">— Size —</option>
                    {SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Quantity" required>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => setItem(i, "quantity", e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addItem}
            className="text-sm text-accent/80 hover:text-accent border border-dashed border-accent/30 hover:border-accent/60 rounded-lg py-2 transition-colors"
          >
            + Add another item
          </button>
        </section>

        {/* Notes */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase border-b border-white/10 pb-2">Additional Notes</h2>
          <Field label="Notes / Special Requests">
            <textarea
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Any customization, name on back, number, etc."
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
