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

  const relationships = await prisma.relationship.findMany({
    where: personId ? { person_id: personId } : undefined,
    include: { related: { select: { id: true, nama_lengkap: true, nama_panggilan: true } } },
  });

  return NextResponse.json(relationships);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { person_id, related_id, tipe } = await req.json();

  if (!person_id || !related_id || !tipe) {
    return NextResponse.json({ error: "person_id, related_id, tipe wajib" }, { status: 400 });
  }

  const rel = await prisma.relationship.create({
    data: { person_id, related_id, tipe },
  });

  return NextResponse.json(rel, { status: 201 });
}
