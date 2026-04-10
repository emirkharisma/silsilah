import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const personId = searchParams.get("person_id");

  const marriages = await prisma.marriage.findMany({
    where: personId
      ? { OR: [{ person_a_id: personId }, { person_b_id: personId }] }
      : undefined,
    include: {
      person_a: { select: { id: true, nama_lengkap: true, nama_panggilan: true } },
      person_b: { select: { id: true, nama_lengkap: true, nama_panggilan: true } },
    },
    orderBy: { urutan: "asc" },
  });

  return NextResponse.json(marriages);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { person_a_id, person_b_id, status } = await req.json();

  if (!person_a_id || !person_b_id || !status) {
    return NextResponse.json(
      { error: "person_a_id, person_b_id, status wajib" },
      { status: 400 }
    );
  }

  // Auto-increment urutan for person_a
  const existing = await prisma.marriage.count({ where: { person_a_id } });

  const marriage = await prisma.marriage.create({
    data: { person_a_id, person_b_id, status, urutan: existing + 1 },
  });

  return NextResponse.json(marriage, { status: 201 });
}
