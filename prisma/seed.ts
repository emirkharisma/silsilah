import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create admin account
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL dan ADMIN_PASSWORD harus diset di .env");
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} sudah ada, skip.`);
  } else {
    const password_hash = await bcrypt.hash(password, 12);
    await prisma.adminUser.create({ data: { email, password_hash } });
    console.log(`Admin ${email} berhasil dibuat.`);
  }

  // Seed sample family data (3-4 generasi)
  const [kakek, nenek] = await Promise.all([
    prisma.person.create({
      data: {
        nama_lengkap: "Ahmad Sulaiman",
        nama_panggilan: "Kakek Ahmad",
        jenis_kelamin: "LAKI_LAKI",
        is_deceased: true,
      },
    }),
    prisma.person.create({
      data: {
        nama_lengkap: "Siti Rahayu",
        nama_panggilan: "Nenek Siti",
        jenis_kelamin: "PEREMPUAN",
        is_deceased: true,
      },
    }),
  ]);

  await prisma.marriage.create({
    data: {
      person_a_id: kakek.id,
      person_b_id: nenek.id,
      status: "MENINGGAL",
      urutan: 1,
    },
  });

  const [ayah, paman] = await Promise.all([
    prisma.person.create({
      data: {
        nama_lengkap: "Budi Sulaiman",
        nama_panggilan: "Ayah Budi",
        jenis_kelamin: "LAKI_LAKI",
        is_deceased: false,
      },
    }),
    prisma.person.create({
      data: {
        nama_lengkap: "Hendra Sulaiman",
        nama_panggilan: "Om Hendra",
        jenis_kelamin: "LAKI_LAKI",
        is_deceased: false,
      },
    }),
  ]);

  await Promise.all([
    prisma.relationship.create({ data: { person_id: ayah.id, related_id: kakek.id, tipe: "AYAH_KANDUNG" } }),
    prisma.relationship.create({ data: { person_id: ayah.id, related_id: nenek.id, tipe: "IBU_KANDUNG" } }),
    prisma.relationship.create({ data: { person_id: paman.id, related_id: kakek.id, tipe: "AYAH_KANDUNG" } }),
    prisma.relationship.create({ data: { person_id: paman.id, related_id: nenek.id, tipe: "IBU_KANDUNG" } }),
  ]);

  const ibu = await prisma.person.create({
    data: {
      nama_lengkap: "Dewi Lestari",
      nama_panggilan: "Ibu Dewi",
      jenis_kelamin: "PEREMPUAN",
      is_deceased: false,
    },
  });

  await prisma.marriage.create({
    data: {
      person_a_id: ayah.id,
      person_b_id: ibu.id,
      status: "AKTIF",
      urutan: 1,
    },
  });

  const [anak1, anak2] = await Promise.all([
    prisma.person.create({
      data: {
        nama_lengkap: "Rizki Budi Sulaiman",
        nama_panggilan: "Rizki",
        jenis_kelamin: "LAKI_LAKI",
        is_deceased: false,
      },
    }),
    prisma.person.create({
      data: {
        nama_lengkap: "Rini Budi Sulaiman",
        nama_panggilan: "Rini",
        jenis_kelamin: "PEREMPUAN",
        is_deceased: false,
      },
    }),
  ]);

  await Promise.all([
    prisma.relationship.create({ data: { person_id: anak1.id, related_id: ayah.id, tipe: "AYAH_KANDUNG" } }),
    prisma.relationship.create({ data: { person_id: anak1.id, related_id: ibu.id, tipe: "IBU_KANDUNG" } }),
    prisma.relationship.create({ data: { person_id: anak2.id, related_id: ayah.id, tipe: "AYAH_KANDUNG" } }),
    prisma.relationship.create({ data: { person_id: anak2.id, related_id: ibu.id, tipe: "IBU_KANDUNG" } }),
  ]);

  console.log("Seed data berhasil dibuat.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
