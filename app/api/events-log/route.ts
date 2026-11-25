import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const rows = await prisma.eventLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 });
  return NextResponse.json(rows);
}
