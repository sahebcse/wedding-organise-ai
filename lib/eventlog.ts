import { prisma } from "./db";
import { emitNudgeBee } from "./platform";

export async function logEvent(kind: string, message: string, payload: unknown = {}) {
  const row = await prisma.eventLog.create({
    data: { kind, message: String(message).slice(0, 300), payload: JSON.stringify(payload).slice(0, 2000) },
  }).catch(() => null);
  await emitNudgeBee(kind.toLowerCase().replace(/[^a-z0-9]+/g, "."), { message, payload });
  return row;
}
