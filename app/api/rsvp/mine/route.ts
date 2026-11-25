import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getMine } from "@/lib/family";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const name = (session?.user as { name?: string } | undefined)?.name ?? "Guest";
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getMine(email, name));
}
