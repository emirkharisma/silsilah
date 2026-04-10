import { prisma } from "@/lib/prisma";
import TreePage from "@/components/TreePage";
import { PersonData, RelationshipData, MarriageData } from "@/lib/tree-layout";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [personsRaw, relationshipsRaw, marriagesRaw] = await Promise.all([
    prisma.person.findMany({ orderBy: { created_at: "asc" } }),
    prisma.relationship.findMany(),
    prisma.marriage.findMany({ orderBy: { urutan: "asc" } }),
  ]);

  const persons: PersonData[] = personsRaw.map((p) => ({
    id: p.id,
    nama_lengkap: p.nama_lengkap,
    nama_panggilan: p.nama_panggilan,
    jenis_kelamin: p.jenis_kelamin,
    is_deceased: p.is_deceased,
    urutan_lahir: p.urutan_lahir,
    foto_url: p.foto_url,
  }));

  const relationships: RelationshipData[] = relationshipsRaw.map((r) => ({
    person_id: r.person_id,
    related_id: r.related_id,
    tipe: r.tipe,
  }));

  const marriages: MarriageData[] = marriagesRaw.map((m) => ({
    id: m.id,
    person_a_id: m.person_a_id,
    person_b_id: m.person_b_id,
    status: m.status,
  }));

  return (
    <TreePage
      persons={persons}
      relationships={relationships}
      marriages={marriages}
    />
  );
}
