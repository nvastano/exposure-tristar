import { NextRequest, NextResponse } from "next/server";
import { sheetsGet, sheetsPost } from "@/lib/sheets";

export async function GET() {
  try {
    const players = await sheetsGet("players");
    return NextResponse.json(players);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await sheetsPost("addPlayer", { name: body.name, position: body.position });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
