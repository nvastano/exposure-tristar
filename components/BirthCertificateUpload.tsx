"use client";

import { useEffect, useState } from "react";
import { sheetsGetAuthed, sheetsPostAuthed } from "@/lib/sheets";

type BirthCertificateMeta = {
  Id: string;
  Player: string;
  FileName: string;
  MimeType: string;
  UploadedBy: string;
  UploadedAt: string;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function BirthCertificateUpload({ playerName }: { playerName: string }) {
  const [cert, setCert] = useState<BirthCertificateMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const rows = (await sheetsGetAuthed("listBirthCertificates", {
        player: playerName,
      })) as BirthCertificateMeta[];
      setCert(rows[0] ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerName]);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const data = await fileToBase64(file);
      await sheetsPostAuthed("uploadBirthCertificate", {
        player: playerName,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        data,
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleView() {
    if (!cert) return;
    setError(null);
    try {
      const res = (await sheetsGetAuthed("getBirthCertificate", { id: cert.Id })) as {
        ok?: boolean;
        data?: string;
        mimeType?: string;
        error?: string;
      };
      if (!res.ok || !res.data) throw new Error(res.error || "Could not load the file.");
      const bytes = Uint8Array.from(atob(res.data), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: res.mimeType || "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      // The bytes aren't kept anywhere persistent — just this one object URL
      // for the tab that was just opened, released shortly after.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete() {
    if (!cert) return;
    if (!confirm(`Delete the birth certificate on file for ${playerName}?`)) return;
    setError(null);
    try {
      await sheetsPostAuthed("deleteBirthCertificate", { id: cert.Id });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/3 p-4 flex flex-col gap-3">
      <p className="text-xs font-bold tracking-widest text-white/40 uppercase">Birth Certificate</p>
      <p className="text-[11px] text-white/30">
        Coach-only. Stored privately in Drive — never shared by link.
      </p>

      {loading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : cert ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <div>
            <p className="font-medium">{cert.FileName}</p>
            <p className="text-white/40 text-xs">
              Uploaded {new Date(cert.UploadedAt).toLocaleDateString()} by {cert.UploadedBy}
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button onClick={handleView} className="text-accent hover:underline">
              View
            </button>
            <button onClick={handleDelete} className="text-white/40 hover:text-accent">
              Delete
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-white/40">No birth certificate on file.</p>
      )}

      <label className="self-start text-xs font-semibold px-3 py-1.5 rounded border border-white/20 hover:border-accent/60 hover:text-accent transition-colors text-white/60 cursor-pointer">
        {uploading ? "Uploading…" : cert ? "Replace file" : "Upload file"}
        <input
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) handleUpload(file);
          }}
        />
      </label>

      {error && <p className="text-accent text-xs">{error}</p>}
    </div>
  );
}
