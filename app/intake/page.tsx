"use client";

import { useEffect, useState } from "react";
import { sheetsGet, sheetsPost } from "@/lib/sheets";
import LogoLoader from "@/components/LogoLoader";

type PlayerRow = { Id: string; Name: string };
type ProfileRow = { Player: string };

type FormData = {
  player: string;
  // Athlete
  dob: string;
  heightFt: string;
  heightIn: string;
  weight: string;
  throws: string;
  bats: string;
  overhandSpeed: string;
  // Parent 1
  parent1Name: string;
  parent1Email: string;
  parent1Phone: string;
  // Parent 2
  parent2Name: string;
  parent2Email: string;
  parent2Phone: string;
  // Address
  address: string;
  city: string;
  state: string;
  zip: string;
};

const EMPTY: FormData = {
  player: "", dob: "", heightFt: "", heightIn: "", weight: "",
  throws: "", bats: "", overhandSpeed: "",
  parent1Name: "", parent1Email: "", parent1Phone: "",
  parent2Name: "", parent2Email: "", parent2Phone: "",
  address: "", city: "", state: "", zip: "",
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

export default function IntakePage() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      sheetsGet("players") as Promise<PlayerRow[]>,
      (sheetsGet("playerProfiles") as Promise<ProfileRow[]>).catch(() => [] as ProfileRow[]),
    ]).then(([p, profiles]) => {
      setPlayers(p);
      setSubmitted(new Set(profiles.map((r) => r.Player)));
    }).finally(() => setLoading(false));
  }, []);

  function set(field: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.player) { setError("Please select a player."); return; }
    if (!form.parent1Name || !form.parent1Email || !form.parent1Phone) {
      setError("Please complete all required parent fields."); return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await sheetsPost("logPlayerProfile", form);
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LogoLoader />;

  if (done) {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center gap-6 py-16 text-center">
        <div className="text-5xl">🙌</div>
        <div>
          <h1 className="text-2xl font-bold tracking-wide">Thank You!</h1>
          <p className="text-white/50 mt-2">
            We've received your information for <strong className="text-white">{form.player}</strong>.
            Coach will review it and reach out if anything is needed.
          </p>
        </div>
        <p className="text-white/30 text-sm">You can close this page.</p>
      </div>
    );
  }

  const available = players.filter((p) => !submitted.has(p.Name));

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-8">
      <div>
        <p className="text-accent text-xs font-bold tracking-widest uppercase mb-1">Team Elite Baseball</p>
        <h1 className="text-2xl font-bold tracking-wide">Player & Family Info</h1>
        <p className="text-white/50 text-sm mt-1">
          Please complete this form for your athlete. Each player only needs to be submitted once.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">

        {/* Player select */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase border-b border-white/10 pb-2">Select Your Athlete</h2>
          <Field label="Player" required>
            <select value={form.player} onChange={(e) => set("player", e.target.value)} className={selectCls}>
              <option value="">— Select player —</option>
              {available.map((p) => (
                <option key={p.Id} value={p.Name}>{p.Name}</option>
              ))}
            </select>
          </Field>
          {available.length === 0 && (
            <p className="text-white/30 text-sm">All players have been submitted. Contact coach if you need to make a change.</p>
          )}
        </section>

        {form.player && (
          <>
            {/* Athlete info */}
            <section className="flex flex-col gap-4">
              <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase border-b border-white/10 pb-2">Athlete Information</h2>
              <Field label="Date of Birth">
                <input type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Weight (lbs)">
                <input type="number" value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="e.g. 145" className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Height (ft)">
                  <input type="number" value={form.heightFt} onChange={(e) => set("heightFt", e.target.value)} placeholder="5" className={inputCls} />
                </Field>
                <Field label="Height (in)">
                  <input type="number" value={form.heightIn} onChange={(e) => set("heightIn", e.target.value)} placeholder="10" className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Throws">
                  <select value={form.throws} onChange={(e) => set("throws", e.target.value)} className={selectCls}>
                    <option value="">—</option>
                    <option>Right</option>
                    <option>Left</option>
                  </select>
                </Field>
                <Field label="Bats">
                  <select value={form.bats} onChange={(e) => set("bats", e.target.value)} className={selectCls}>
                    <option value="">—</option>
                    <option>Right</option>
                    <option>Left</option>
                    <option>Switch</option>
                  </select>
                </Field>
              </div>
            </section>

            {/* Parent 1 */}
            <section className="flex flex-col gap-4">
              <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase border-b border-white/10 pb-2">Parent / Guardian 1</h2>
              <Field label="Full Name" required>
                <input type="text" value={form.parent1Name} onChange={(e) => set("parent1Name", e.target.value)} placeholder="Jane Smith" className={inputCls} />
              </Field>
              <Field label="Email" required>
                <input type="email" value={form.parent1Email} onChange={(e) => set("parent1Email", e.target.value)} placeholder="jane@example.com" className={inputCls} />
              </Field>
              <Field label="Phone" required>
                <input type="tel" value={form.parent1Phone} onChange={(e) => set("parent1Phone", e.target.value)} placeholder="(555) 555-5555" className={inputCls} />
              </Field>
            </section>

            {/* Parent 2 */}
            <section className="flex flex-col gap-4">
              <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase border-b border-white/10 pb-2">Parent / Guardian 2 <span className="text-white/30 font-normal normal-case tracking-normal text-xs">(optional)</span></h2>
              <Field label="Full Name">
                <input type="text" value={form.parent2Name} onChange={(e) => set("parent2Name", e.target.value)} placeholder="John Smith" className={inputCls} />
              </Field>
              <Field label="Email">
                <input type="email" value={form.parent2Email} onChange={(e) => set("parent2Email", e.target.value)} placeholder="john@example.com" className={inputCls} />
              </Field>
              <Field label="Phone">
                <input type="tel" value={form.parent2Phone} onChange={(e) => set("parent2Phone", e.target.value)} placeholder="(555) 555-5555" className={inputCls} />
              </Field>
            </section>

            {/* Address */}
            <section className="flex flex-col gap-4">
              <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase border-b border-white/10 pb-2">Home Address</h2>
              <Field label="Street Address">
                <input type="text" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="123 Main St" className={inputCls} />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="City">
                  <input type="text" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Columbus" className={inputCls} />
                </Field>
                <Field label="State">
                  <input type="text" value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="OH" maxLength={2} className={inputCls} />
                </Field>
                <Field label="Zip">
                  <input type="text" value={form.zip} onChange={(e) => set("zip", e.target.value)} placeholder="43215" className={inputCls} />
                </Field>
              </div>
            </section>

            {error && <p className="text-accent text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="bg-accent hover:bg-accent/80 transition-colors text-white font-semibold px-6 py-3 rounded disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
