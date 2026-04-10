import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateRelation } from "@/lib/relation";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const a = searchParams.get("a");
  const b = searchParams.get("b");

  if (!a || !b) {
    return NextResponse.json({ error: "Parameter a dan b wajib" }, { status: 400 });
  }

  const [persons, relationships, marriages] = await Promise.all([
    prisma.person.findMany({ select: { id: true, jenis_kelamin: true } }),
    prisma.relationship.findMany(),
    prisma.marriage.findMany(),
  ]);

  const relation = calculateRelation(a, b, persons, relationships, marriages);

  return NextResponse.json({
    personAId: a,
    personBId: b,
    relation: relation ?? "tidak ada hubungan keluarga",
  });
}
