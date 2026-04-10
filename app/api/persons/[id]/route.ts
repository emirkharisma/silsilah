import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const person = await prisma.person.findUnique({
    where: { id: params.id },
    include: { relationships: true, marriages_a: true, marriages_b: true },
  });

  if (!person) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(person);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
  } = body;

  const person = await prisma.person.update({
    where: { id: params.id },
    data: {
      nama_lengkap,
      nama_panggilan: nama_panggilan || null,
      jenis_kelamin,
      is_deceased,
      foto_url: foto_url || null,
      catatan: catatan || null,
    },
  });

  return NextResponse.json(person);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.person.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
