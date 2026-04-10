type JenisKelamin = "LAKI_LAKI" | "PEREMPUAN";
type TipeRelasi = "AYAH_KANDUNG" | "IBU_KANDUNG" | "AYAH_TIRI" | "IBU_TIRI" | "ANAK_ANGKAT";

type PersonNode = {
  id: string;
  jenis_kelamin: JenisKelamin;
};

type RelationshipEdge = {
  person_id: string;
  related_id: string;
  tipe: TipeRelasi;
};

type MarriageEdge = {
  person_a_id: string;
  person_b_id: string;
};

type AncestorMap = Map<string, { distance: number; viaStep: boolean }>;

function getAncestors(
  personId: string,
  relationships: RelationshipEdge[]
): AncestorMap {
  const result: AncestorMap = new Map();
  const queue: Array<{ id: string; distance: number; viaStep: boolean }> = [
    { id: personId, distance: 0, viaStep: false },
  ];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);

    if (current.id !== personId) {
      result.set(current.id, {
        distance: current.distance,
        viaStep: current.viaStep,
      });
    }

    // Find parents of current person
    const parents = relationships.filter((r) => r.person_id === current.id);
    for (const p of parents) {
      if (!visited.has(p.related_id)) {
        const isStep =
          current.viaStep ||
          p.tipe === "AYAH_TIRI" ||
          p.tipe === "IBU_TIRI";
        queue.push({
          id: p.related_id,
          distance: current.distance + 1,
          viaStep: isStep,
        });
      }
    }
  }

  return result;
}

function getRelationLabel(
  p: number,
  q: number,
  targetGender: JenisKelamin,
  viaStep: boolean
): string {
  const isMale = targetGender === "LAKI_LAKI";
  const step = viaStep ? " tiri" : "";

  // Direct line: A looking at B
  if (p === 1 && q === 0) return isMale ? `ayah${step}` : `ibu${step}`;
  if (p === 2 && q === 0) return isMale ? `kakek${step}` : `nenek${step}`;
  if (p === 3 && q === 0) return isMale ? "buyut (laki-laki)" : "buyut (perempuan)";
  if (p === 0 && q === 1) return isMale ? "anak laki-laki" : "anak perempuan";
  if (p === 0 && q === 2) return isMale ? "cucu laki-laki" : "cucu perempuan";
  if (p === 0 && q === 3) return isMale ? "cicit laki-laki" : "cicit perempuan";

  // Lateral
  if (p === 1 && q === 1) return isMale ? `saudara kandung${step}` : `saudara kandung${step}`;
  if (p === 2 && q === 1) return isMale ? `paman${step}` : `bibi${step}`;
  if (p === 1 && q === 2) return isMale ? "keponakan laki-laki" : "keponakan perempuan";
  if (p === 2 && q === 2) return isMale ? "sepupu laki-laki" : "sepupu perempuan";

  // Cousins
  if (p >= 2 && q >= 2) {
    const degree = Math.min(p, q) - 1;
    const removed = Math.abs(p - q);
    const removedStr = removed > 0 ? ` ${removed}x removed` : "";
    return `sepupu ke-${degree}${removedStr} (${isMale ? "laki-laki" : "perempuan"})`;
  }

  return "kerabat";
}

export function calculateRelation(
  personAId: string,
  personBId: string,
  persons: PersonNode[],
  relationships: RelationshipEdge[],
  marriages: MarriageEdge[]
): string | null {
  void marriages; // used for marriage-aware relation lookup in future
  // Edge case: same person
  if (personAId === personBId) return "orang yang sama";

  const personB = persons.find((p) => p.id === personBId);
  if (!personB) return null;

  const ancestorsA = getAncestors(personAId, relationships);
  const ancestorsB = getAncestors(personBId, relationships);

  // Find LCA: common ancestor with minimum total distance
  let lca: string | null = null;
  let minDist = Infinity;
  let lcaDistA = 0;
  let lcaDistB = 0;
  let lcaViaStep = false;

  // Check if B is ancestor of A
  if (ancestorsA.has(personBId)) {
    const { distance, viaStep } = ancestorsA.get(personBId)!;
    if (distance < minDist) {
      lca = personBId;
      minDist = distance;
      lcaDistA = distance;
      lcaDistB = 0;
      lcaViaStep = viaStep;
    }
  }

  // Check if A is ancestor of B
  if (ancestorsB.has(personAId)) {
    const { distance, viaStep } = ancestorsB.get(personAId)!;
    if (distance < minDist) {
      lca = personAId;
      minDist = distance;
      lcaDistA = 0;
      lcaDistB = distance;
      lcaViaStep = viaStep;
    }
  }

  // Find common ancestors
  for (const [ancestorId, infoA] of ancestorsA) {
    if (ancestorsB.has(ancestorId)) {
      const infoB = ancestorsB.get(ancestorId)!;
      const totalDist = infoA.distance + infoB.distance;
      if (totalDist < minDist) {
        lca = ancestorId;
        minDist = totalDist;
        lcaDistA = infoA.distance;
        lcaDistB = infoB.distance;
        // Prefer kandung path if available
        lcaViaStep = infoA.viaStep || infoB.viaStep;
      }
    }
  }

  if (!lca) {
    // No blood relation — check in-law via marriage
    const isMaleB = personB.jenis_kelamin === "LAKI_LAKI";

    // Check if A and B are directly married
    const directlyMarried = marriages.some(
      (m) =>
        (m.person_a_id === personAId && m.person_b_id === personBId) ||
        (m.person_a_id === personBId && m.person_b_id === personAId)
    );
    if (directlyMarried) return isMaleB ? "suami" : "istri";

    // Get spouses of B
    const spousesOfB = marriages
      .filter((m) => m.person_a_id === personBId || m.person_b_id === personBId)
      .map((m) => (m.person_a_id === personBId ? m.person_b_id : m.person_a_id));

    for (const spouseId of spousesOfB) {
      const bloodRelation = calculateRelation(personAId, spouseId, persons, relationships, []);
      if (!bloodRelation || bloodRelation === "tidak ada hubungan keluarga") continue;
      // B is in-law of A through spouse
      if (bloodRelation === "anak laki-laki" || bloodRelation === "anak perempuan") {
        return isMaleB ? "menantu laki-laki" : "menantu perempuan";
      }
      if (bloodRelation === "ayah" || bloodRelation === "ibu") {
        return isMaleB ? "mertua laki-laki" : "mertua perempuan";
      }
      if (bloodRelation?.startsWith("saudara")) {
        return isMaleB ? "ipar laki-laki" : "ipar perempuan";
      }
      return `pasangan ${bloodRelation}`;
    }

    // Get spouses of A
    const spousesOfA = marriages
      .filter((m) => m.person_a_id === personAId || m.person_b_id === personAId)
      .map((m) => (m.person_a_id === personAId ? m.person_b_id : m.person_a_id));

    for (const spouseId of spousesOfA) {
      const bloodRelation = calculateRelation(personBId, spouseId, persons, relationships, []);
      if (!bloodRelation || bloodRelation === "tidak ada hubungan keluarga") continue;
      if (bloodRelation === "anak laki-laki" || bloodRelation === "anak perempuan") {
        return isMaleB ? "mertua laki-laki" : "mertua perempuan";
      }
      if (bloodRelation === "ayah" || bloodRelation === "ibu") {
        return isMaleB ? "menantu laki-laki" : "menantu perempuan";
      }
      if (bloodRelation?.startsWith("saudara")) {
        return isMaleB ? "ipar laki-laki" : "ipar perempuan";
      }
    }

    return "tidak ada hubungan keluarga";
  }

  return getRelationLabel(
    lcaDistA,
    lcaDistB,
    personB.jenis_kelamin,
    lcaViaStep
  );
}

export function getAncestorPath(
  personId: string,
  relationships: RelationshipEdge[],
  persons: (PersonNode & { nama_lengkap: string })[]
): string[] {
  const path: string[] = [];
  let current = personId;
  const visited = new Set<string>();

  while (true) {
    if (visited.has(current)) break;
    visited.add(current);

    const person = persons.find((p) => p.id === current);
    if (person) path.push(person.nama_lengkap);

    // Prefer kandung parent, fall back to tiri
    const priority: TipeRelasi[] = ["AYAH_KANDUNG", "IBU_KANDUNG"];
    const parents = relationships
      .filter((r) => r.person_id === current)
      .sort((a, b) => {
        return (
          (priority.includes(a.tipe) ? 0 : 1) -
          (priority.includes(b.tipe) ? 0 : 1)
        );
      });

    if (parents.length === 0) break;
    current = parents[0].related_id;
  }

  return path;
}
