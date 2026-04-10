import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const persons = await prisma.person.findMany({
    orderBy: { created_at: "asc" },
    include: {
      relationships: true,
      marriages_a: true,
      marriages_b: true,
    },
  });
  return NextResponse.json(persons);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    nama_lengkap,
    nama_panggilan,
    jenis_kelamin,
    is_deceased,
    foto_url,
    catatan,
    ayah_kandung_id,
    ibu_kandung_id,
    ayah_tiri_id,
    ibu_tiri_id,
  } = body;

  if (!nama_lengkap || !jenis_kelamin) {
    return NextResponse.json(
      { error: "nama_lengkap dan jenis_kelamin wajib diisi" },
      { status: 400 }
    );
  }

  const person = await prisma.$transaction(async (tx) => {
    const p = await tx.person.create({
      data: {
        nama_lengkap,
        nama_panggilan: nama_panggilan || null,
        jenis_kelamin,
        is_deceased: is_deceased ?? false,
        foto_url: foto_url || null,
        catatan: catatan || null,
      },
    });

    const rels = [
      { id: ayah_kandung_id, tipe: "AYAH_KANDUNG" as const },
      { id: ibu_kandung_id, tipe: "IBU_KANDUNG" as const },
      { id: ayah_tiri_id, tipe: "AYAH_TIRI" as const },
      { id: ibu_tiri_id, tipe: "IBU_TIRI" as const },
    ].filter((r) => r.id);

    for (const rel of rels) {
      await tx.relationship.create({
        data: {
          person_id: p.id,
          related_id: rel.id,
          tipe: rel.tipe,
        },
      });
    }

    return p;
  });

  return NextResponse.json(person, { status: 201 });
}
