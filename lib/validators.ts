import { z } from "zod";

export const zInviteStatus = z.enum(["CONFIRMED", "TENTATIVE", "DECLINED", "PENDING"]);
export const zRsvpSet = z.object({
  inviteId: z.string().min(1),
  status: zInviteStatus,
  headcount: z.number().int().min(0).max(50).optional(),
  diet: z.enum(["VEG", "NONVEG", "JAIN", "UNKNOWN"]).optional(),
});
export const zMemberAdd = z.object({ name: z.string().trim().min(1).max(40) });
export const zContribute = z.object({
  giftId: z.string().min(1),
  amountPaise: z.number().int().min(100).max(1000000000),
  anonymous: z.boolean().optional().default(false),
  name: z.string().trim().max(60).optional().default(""),
});
export const zGiftCreate = z.object({
  title: z.string().trim().min(1).max(120),
  pricePaise: z.number().int().min(100).max(1000000000),
  qtyNeeded: z.number().int().min(1).max(1000).default(1),
  imageUrl: z.string().trim().max(500).optional().default(""),
});
export const zTaskCreate = z.object({
  boardId: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  owner: z.string().trim().max(60).optional().default(""),
  estimatePaise: z.number().int().min(0).max(10000000000).default(0),
  actualPaise: z.number().int().min(0).max(10000000000).default(0),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  dueAt: z.string().optional(),
  dependsOn: z.string().optional().default(""),
});
export const zArrivalCreate = z.object({
  guestId: z.string().min(1),
  mode: z.enum(["TRAIN", "BUS", "PLANE", "CAR"]),
  station: z.string().trim().min(1).max(120),
  arrivalAt: z.string().min(1),
  partySize: z.number().int().min(1).max(100).default(1),
  venue: z.string().trim().min(1).max(120),
  pnrRef: z.string().trim().max(40).optional().default(""),
});
export const zWeddingUpdate = z.object({
  coupleNames: z.string().trim().min(1).max(120).optional(),
  story: z.string().trim().max(2000).optional(),
});
export const zEventUpdate = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  venue: z.string().trim().min(1).max(200).optional(),
  startsAt: z.string().optional(),
});
