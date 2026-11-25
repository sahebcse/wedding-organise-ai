import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { zTaskCreate } from "@/lib/validators";
import { logEvent } from "@/lib/eventlog";

const CATS = ["FOOD", "TRANSPORT", "DECOR", "VENDOR", "RITUAL", "MISC"];

export async function GET() {
  const [boards, approvals, users] = await Promise.all([
    prisma.board.findMany({ include: { tasks: { include: { updates: { orderBy: { createdAt: "desc" }, take: 20 }, subtickets: { orderBy: { createdAt: "asc" } } } } } }),
    prisma.approval.findMany({ where: { status: "PENDING" } }),
    prisma.user.findMany({ where: { role: { in: ["ADMIN", "ORGANIZER"] } }, select: { name: true, email: true, role: true }, orderBy: { name: "asc" } }),
  ]);
  return NextResponse.json({ boards, approvals, staff: users });
}
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isStaff = role === "ADMIN" || role === "ORGANIZER";
  if (!isStaff) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const b = await req.json();

  if (b.action === "move") {
    const t = await prisma.task.findUnique({ where: { id: b.taskId } });
    if (!t) return new NextResponse("not found", { status: 404 });
    if (b.status === "DONE" && t.dependsOn) {
      const dep = await prisma.task.findUnique({ where: { id: t.dependsOn } });
      if (dep && dep.status !== "DONE") return new NextResponse("dependency not done", { status: 400 });
    }
    return NextResponse.json(await prisma.task.update({ where: { id: b.taskId }, data: { status: b.status } }));
  }

  if (b.action === "task") {
    const s = zTaskCreate.safeParse({
      ...b,
      estimatePaise: Number(b.estimatePaise ?? 0),
      actualPaise: Number(b.actualPaise ?? 0),
    });
    if (!s.success) return new NextResponse("invalid task", { status: 400 });
    // Expense gate: non-admins need approval for big estimates — blocked until approved
    if (s.data.estimatePaise > 10000000 && role !== "ADMIN") {
      await prisma.approval.create({ data: { kind: "EXPENSE_HIGH", payload: JSON.stringify({ title: s.data.title, estimatePaise: s.data.estimatePaise, boardId: s.data.boardId, by: session?.user?.email }) } });
      await logEvent("expense.approval_requested", `Approval needed: ${s.data.title} (₹${(s.data.estimatePaise / 100).toLocaleString("en-IN")})`, s.data);
      return new NextResponse("needs approval — request logged for admin", { status: 402 });
    }
    const task = await prisma.task.create({
      data: {
        boardId: s.data.boardId, title: s.data.title, owner: s.data.owner || null,
        estimatePaise: s.data.estimatePaise, actualPaise: s.data.actualPaise, priority: s.data.priority,
        dueAt: s.data.dueAt ? new Date(s.data.dueAt) : null, dependsOn: s.data.dependsOn || null,
      },
    });
    await logEvent("task.created", `Task created: ${task.title}`, { id: task.id, boardId: s.data.boardId });
    return NextResponse.json(task);
  }

  if (b.action === "actual") {
    const t = await prisma.task.update({ where: { id: String(b.taskId) }, data: { actualPaise: Math.max(0, Number(b.actualPaise ?? 0)) } }).catch(() => null);
    if (!t) return new NextResponse("not found", { status: 404 });
    await logEvent("task.cost", `Cost update "${t.title}": spent ₹${(t.actualPaise / 100).toLocaleString("en-IN")}`, { taskId: t.id }).catch(() => {});
    return NextResponse.json(t);
  }

  if (b.action === "estimate") {
    const t = await prisma.task.update({ where: { id: String(b.taskId) }, data: { estimatePaise: Math.max(0, Number(b.estimatePaise ?? 0)) } }).catch(() => null);
    if (!t) return new NextResponse("not found", { status: 404 });
    await logEvent("task.cost", `Estimate update "${t.title}": est ₹${(t.estimatePaise / 100).toLocaleString("en-IN")}`, { taskId: t.id }).catch(() => {});
    return NextResponse.json(t);
  }

  if (b.action === "nudge") {
    const t = await prisma.task.findUnique({ where: { id: String(b.taskId) } });
    if (!t) return new NextResponse("not found", { status: 404 });
    const by = session?.user?.email ?? "Team";
    await prisma.taskUpdate.create({ data: { taskId: t.id, author: String(by), text: `🔔 Nudged ${t.owner || "owner"} — "${t.title}" is ${t.status}` } }).catch(() => {});
    await logEvent("task.nudge", `Nudged ${t.owner || "owner"}: "${t.title}" is ${t.status}`, { taskId: t.id, owner: t.owner, status: t.status });
    return NextResponse.json({ ok: true });
  }

  if (b.action === "comment") {
    const text = String(b.text ?? "").trim().slice(0, 500);
    if (!text) return new NextResponse("empty update", { status: 400 });
    const t = await prisma.task.findUnique({ where: { id: String(b.taskId) } });
    if (!t) return new NextResponse("not found", { status: 404 });
    const author = String(session?.user?.email ?? session?.user?.name ?? "Team").slice(0, 80);
    const u = await prisma.taskUpdate.create({ data: { taskId: t.id, author, text } });
    await logEvent("task.update", `${author} on "${t.title}": ${text}`, { taskId: t.id });
    return NextResponse.json(u);
  }

  if (b.action === "reassign") {
    const t = await prisma.task.findUnique({ where: { id: String(b.taskId) } });
    if (!t) return new NextResponse("not found", { status: 404 });
    const owner = String(b.owner ?? "").trim().slice(0, 60) || null;
    const updated = await prisma.task.update({ where: { id: t.id }, data: { owner } });
    const by = String(session?.user?.email ?? "Team").slice(0, 80);
    await prisma.taskUpdate.create({ data: { taskId: t.id, author: by, text: `↩ Reassigned to ${owner ?? "unassigned"}` } }).catch(() => {});
    await logEvent("task.reassign", `Reassigned "${t.title}" → ${owner ?? "unassigned"} by ${by}`, { taskId: t.id, owner });
    return NextResponse.json(updated);
  }

  if (b.action === "approve") {
    const a = await prisma.approval.update({ where: { id: String(b.id) }, data: { status: b.decision === "REJECTED" ? "REJECTED" : "APPROVED" } }).catch(() => null);
    if (!a) return new NextResponse("not found", { status: 404 });
    await logEvent(`approval.${a.status.toLowerCase()}`, `Approval ${a.status}: ${a.kind}`, { id: a.id });
    return NextResponse.json(a);
  }

  if (b.action === "subtask") {
    const title = String(b.title ?? "").trim().slice(0, 120);
    if (!title) return new NextResponse("empty subticket", { status: 400 });
    const t = await prisma.task.findUnique({ where: { id: String(b.taskId) } });
    if (!t) return new NextResponse("not found", { status: 404 });
    const st = await prisma.subTicket.create({ data: { taskId: t.id, title, owner: String(b.owner ?? "").trim().slice(0, 60) || null } });
    await logEvent("subticket.created", `Subticket "${title}" under "${t.title}"`, { taskId: t.id, subticketId: st.id }).catch(() => {});
    return NextResponse.json(st);
  }

  if (b.action === "submove") {
    const st = await prisma.subTicket.findUnique({ where: { id: String(b.subId) }, include: { task: true } }).catch(() => null);
    if (!st) return new NextResponse("not found", { status: 404 });
    if (!["TODO", "DOING", "DONE"].includes(String(b.status))) return new NextResponse("bad status", { status: 400 });
    const updated = await prisma.subTicket.update({ where: { id: st.id }, data: { status: String(b.status) } });
    await logEvent("subticket.status", `Subticket "${st.title}" → ${b.status} (${st.task.title})`, { taskId: st.taskId }).catch(() => {});
    return NextResponse.json(updated);
  }

  if (b.action === "subassign") {
    const st = await prisma.subTicket.findUnique({ where: { id: String(b.subId) } }).catch(() => null);
    if (!st) return new NextResponse("not found", { status: 404 });
    const updated = await prisma.subTicket.update({ where: { id: st.id }, data: { owner: String(b.owner ?? "").trim().slice(0, 60) || null } });
    return NextResponse.json(updated);
  }

  if (b.action === "board") {
    const cat = CATS.includes(String(b.category)) ? String(b.category) : "MISC";
    const board = await prisma.board.create({ data: { title: String(b.title ?? "Untitled").slice(0, 80), category: cat } });
    await logEvent("board.created", `Board created: ${board.title} [${cat}]`, { id: board.id });
    return NextResponse.json(board);
  }

  return NextResponse.json(await prisma.board.create({ data: { title: String(b.title ?? "Untitled").slice(0, 80), category: CATS.includes(String(b.category)) ? String(b.category) : "MISC" } }));
}
