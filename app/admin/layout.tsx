import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { AdminShell } from "@/components/admin/admin-shell";

/**
 * Server-side guard for the admin area. Middleware already blocks non-admins,
 * but this re-verifies against the DB so a stale JWT or a direct render can't
 * bypass it. Unauthenticated users are sent to sign-in; authenticated
 * non-admins are sent back to the app.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/admin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || user.role !== "admin") {
    redirect("/sites");
  }

  return <AdminShell>{children}</AdminShell>;
}