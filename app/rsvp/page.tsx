"use client";
import { useSession } from "next-auth/react";
import FamilyRsvp from "@/components/rsvp/FamilyRsvp";
import AdminMatrix from "@/components/rsvp/AdminMatrix";

export default function RsvpPage() {
  const { data, status } = useSession();
  if (status === "loading") return <p>Loading…</p>;
  const role = (data?.user as { role?: string } | undefined)?.role;
  if (role === "ADMIN" || role === "ORGANIZER") return <AdminMatrix />;
  return <FamilyRsvp />;
}
