import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LandingPublic from "@/components/LandingPublic";

/* Role-aware gate:
   - logged out  → public invitation teaser (no internal links)
   - admin/org   → back-office dashboard
   - guest       → wedding invitation home */
export default async function Home() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role === "ADMIN" || role === "ORGANIZER") redirect("/dashboard");
  if (role === "GUEST") redirect("/w/aarav-diya");
  return <LandingPublic />;
}
