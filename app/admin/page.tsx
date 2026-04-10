import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminPanel from "@/components/AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [persons, relationships, marriages] = await Promise.all([
    prisma.person.findMany({ orderBy: { nama_lengkap: "asc" } }),
    prisma.relationship.findMany(),
    prisma.marriage.findMany({ orderBy: [{ person_a_id: "asc" }, { urutan: "asc" }] }),
  ]);

  return (
    <AdminPanel
      initialPersons={persons}
      initialRelationships={relationships}
      initialMarriages={marriages}
    />
  );
}
