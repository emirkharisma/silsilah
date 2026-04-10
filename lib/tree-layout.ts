import dagre from "@dagrejs/dagre";
import { Edge, Node } from "@xyflow/react";
type JenisKelamin = "LAKI_LAKI" | "PEREMPUAN";
type StatusPernikahan = "AKTIF" | "CERAI" | "MENINGGAL";
type TipeRelasi = "AYAH_KANDUNG" | "IBU_KANDUNG" | "AYAH_TIRI" | "IBU_TIRI" | "ANAK_ANGKAT";

export type PersonData = {
  id: string;
  nama_lengkap: string;
  nama_panggilan: string | null;
  jenis_kelamin: JenisKelamin;
  is_deceased: boolean;
  urutan_lahir: number | null;
  foto_url: string | null;
};

export type RelationshipData = {
  person_id: string;
  related_id: string;
  tipe: TipeRelasi;
};

export type MarriageData = {
  id: string;
  person_a_id: string;
  person_b_id: string;
  status: StatusPernikahan;
};

const NODE_WIDTH = 160;
const NODE_HEIGHT = 80;
const COUPLE_DOT_SIZE = 10;

export function buildTreeLayout(
  persons: PersonData[],
  relationships: RelationshipData[],
  marriages: MarriageData[]
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 80, ranksep: 120 });

  // Build couple → {a, b, status} lookup
  const coupleMap = new Map<string, { a: string; b: string; status: StatusPernikahan }>();
  for (const m of marriages) {
    coupleMap.set(`couple-${m.id}`, { a: m.person_a_id, b: m.person_b_id, status: m.status });
  }

  // Build personId → coupleId lookup (first couple found)
  const personToCouple = new Map<string, string>();
  for (const [coupleId, { a, b }] of coupleMap) {
    if (!personToCouple.has(a)) personToCouple.set(a, coupleId);
    if (!personToCouple.has(b)) personToCouple.set(b, coupleId);
  }

  // Add only PERSON nodes to dagre
  for (const p of persons) {
    g.setNode(p.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  // Add person→child edges (skipping couple nodes entirely)
  for (const rel of relationships) {
    if (
      rel.tipe !== "AYAH_KANDUNG" &&
      rel.tipe !== "IBU_KANDUNG" &&
      rel.tipe !== "AYAH_TIRI" &&
      rel.tipe !== "IBU_TIRI"
    )
      continue;

    g.setEdge(rel.related_id, rel.person_id);
  }

  dagre.layout(g);

  // Read person positions from dagre
  const personPos = new Map<string, { x: number; y: number }>();
  const personById = new Map(persons.map((p) => [p.id, p]));
  for (const p of persons) {
    const pos = g.node(p.id);
    if (pos) personPos.set(p.id, { x: pos.x, y: pos.y });
  }

  // Build set of persons who have parents in this tree
  const hasParent = new Set<string>();
  for (const rel of relationships) {
    if (
      rel.tipe === "AYAH_KANDUNG" ||
      rel.tipe === "IBU_KANDUNG" ||
      rel.tipe === "AYAH_TIRI" ||
      rel.tipe === "IBU_TIRI"
    ) {
      hasParent.add(rel.person_id);
    }
  }

  // Group in-tree persons by Y level, sorted by X
  const SPACING = NODE_WIDTH + 80;
  const levelGroups = new Map<number, string[]>();
  for (const p of persons) {
    if (!hasParent.has(p.id)) continue;
    const pos = personPos.get(p.id);
    if (!pos) continue;
    const y = Math.round(pos.y);
    if (!levelGroups.has(y)) levelGroups.set(y, []);
    levelGroups.get(y)!.push(p.id);
  }
  for (const ids of levelGroups.values()) {
    ids.sort((a, b) => (personPos.get(a)?.x ?? 0) - (personPos.get(b)?.x ?? 0));
  }

  // Insert each menantu right after their spouse in the level group
  for (const { a, b } of coupleMap.values()) {
    const aHasParent = hasParent.has(a);
    const bHasParent = hasParent.has(b);
    if (aHasParent === bHasParent) continue;

    const spouseId = aHasParent ? a : b;
    const menantuid = aHasParent ? b : a;
    const spousePos = personPos.get(spouseId);
    if (!spousePos) continue;

    const y = Math.round(spousePos.y);
    const group = levelGroups.get(y);
    if (!group) continue;

    const spouseIdx = group.indexOf(spouseId);
    if (spouseIdx === -1) continue;
    group.splice(spouseIdx + 1, 0, menantuid);
    personPos.set(menantuid, { x: 0, y: spousePos.y }); // placeholder
  }

  // Re-space each level group, keeping center of in-tree nodes
  for (const [, ids] of levelGroups) {
    const inTreeIds = ids.filter((id) => hasParent.has(id));
    if (inTreeIds.length === 0) continue;
    const centerX =
      inTreeIds.reduce((sum, id) => sum + (personPos.get(id)?.x ?? 0), 0) /
      inTreeIds.length;
    const startX = centerX - ((ids.length - 1) / 2) * SPACING;
    for (let i = 0; i < ids.length; i++) {
      const pos = personPos.get(ids[i]);
      if (pos) personPos.set(ids[i], { x: startX + i * SPACING, y: pos.y });
    }
  }

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Person nodes
  for (const p of persons) {
    const pos = personPos.get(p.id);
    if (!pos) continue;
    nodes.push({
      id: p.id,
      type: "personNode",
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: p,
    });
  }

  // Couple nodes: midpoint between spouses, same Y
  const couplePos = new Map<string, { x: number; y: number }>();
  for (const [coupleId, { a, b }] of coupleMap) {
    const posA = personPos.get(a);
    const posB = personPos.get(b);
    if (!posA || !posB) continue;

    const cx = (posA.x + posB.x) / 2;
    const cy = Math.max(posA.y, posB.y); // same rank as spouses
    couplePos.set(coupleId, { x: cx, y: cy });

    const personA = personById.get(a);
    const personB = personById.get(b);
    const eitherDeceased = personA?.is_deceased || personB?.is_deceased;

    nodes.push({
      id: coupleId,
      type: "coupleNode",
      position: { x: cx - COUPLE_DOT_SIZE / 2, y: cy - COUPLE_DOT_SIZE / 2 },
      data: { a, b, status: coupleMap.get(coupleId)!.status, eitherDeceased },
    });
  }

  // Marriage edges: horizontal lines person ↔ couple dot
  for (const [coupleId, { a, b, status }] of coupleMap) {
    const cp = couplePos.get(coupleId);
    const posA = personPos.get(a);
    const posB = personPos.get(b);
    if (!cp || !posA || !posB) continue;

    const isCerai = status === "CERAI";
    const edgeStyle = isCerai
      ? { strokeDasharray: "6,3", stroke: "#f97316" }
      : { stroke: "#94a3b8" };

    // Person A → couple dot
    edges.push({
      id: `${a}-${coupleId}`,
      source: a,
      target: coupleId,
      sourceHandle: posA.x < cp.x ? "right" : "left",
      targetHandle: posA.x < cp.x ? "left" : "right",
      type: "straight",
      style: edgeStyle,
    });

    // Person B → couple dot
    edges.push({
      id: `${b}-${coupleId}`,
      source: b,
      target: coupleId,
      sourceHandle: posB.x < cp.x ? "right" : "left",
      targetHandle: posB.x < cp.x ? "left" : "right",
      type: "straight",
      style: edgeStyle,
    });
  }

  // Parent→child edges (from couple dot or single parent)
  // Track which child edges have already been added (dedup)
  const addedChildEdges = new Set<string>();

  for (const rel of relationships) {
    if (
      rel.tipe !== "AYAH_KANDUNG" &&
      rel.tipe !== "IBU_KANDUNG" &&
      rel.tipe !== "AYAH_TIRI" &&
      rel.tipe !== "IBU_TIRI"
    )
      continue;

    const parentId = rel.related_id;
    const childId = rel.person_id;
    const coupleId = personToCouple.get(parentId);

    const sourceId = coupleId && couplePos.has(coupleId) ? coupleId : parentId;
    const edgeId = `${sourceId}->${childId}`;
    if (addedChildEdges.has(edgeId)) continue;
    addedChildEdges.add(edgeId);

    const isStep =
      rel.tipe === "AYAH_TIRI" || rel.tipe === "IBU_TIRI";

    edges.push({
      id: edgeId,
      source: sourceId,
      target: childId,
      type: "smoothstep",
      style: isStep
        ? { strokeDasharray: "5,5", stroke: "#94a3b8" }
        : { stroke: "#94a3b8" },
    });
  }

  return { nodes, edges };
}
