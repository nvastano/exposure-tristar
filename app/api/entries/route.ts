import { NextRequest, NextResponse } from "next/server";
import { sheetsGet, sheetsPost } from "@/lib/sheets";

export async function GET(req: NextRequest) {
  try {
    const player = req.nextUrl.searchParams.get("player");
    const entries = await sheetsGet("entries", player ? { player } : {});
    return NextResponse.json(entries);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (Array.isArray(body.entries)) {
      const result = await sheetsPost("bulkEntries", { entries: body.entries });
      return NextResponse.json(result);
    }

    const result = await sheetsPost("addEntry", {
      date: body.date,
      player: body.player,
      sprintTimes: body.sprintTimes,
      throwVelos: body.throwVelos,
      notes: body.notes,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
