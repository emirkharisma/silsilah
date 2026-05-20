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
  catatan: string | null;
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

const NODE_WIDTH = 176;
const NODE_HEIGHT = 84;
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

  // Build personById early
  const personById = new Map(persons.map((p) => [p.id, p]));

  // Add only PERSON nodes to dagre
  for (const p of persons) {
    g.setNode(p.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  // Add person→child edges sorted by urutan_lahir
  const parentEdges = relationships.filter(
    (r) =>
      r.tipe === "AYAH_KANDUNG" ||
      r.tipe === "IBU_KANDUNG" ||
      r.tipe === "AYAH_TIRI" ||
      r.tipe === "IBU_TIRI"
  );
  parentEdges.sort((a, b) => {
    const ua = personById.get(a.person_id)?.urutan_lahir ?? 999;
    const ub = personById.get(b.person_id)?.urutan_lahir ?? 999;
    if (ua !== ub) return ua - ub;
    return a.person_id < b.person_id ? -1 : 1; // stable tiebreaker
  });
  for (const rel of parentEdges) {
    g.setEdge(rel.related_id, rel.person_id);
  }

  dagre.layout(g);

  // Read person positions from dagre
  const personPos = new Map<string, { x: number; y: number }>();
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

  // Build child → all parents map (early, needed for sorting)
  const childParentsMap = new Map<string, string[]>();
  for (const rel of relationships) {
    if (
      rel.tipe !== "AYAH_KANDUNG" &&
      rel.tipe !== "IBU_KANDUNG" &&
      rel.tipe !== "AYAH_TIRI" &&
      rel.tipe !== "IBU_TIRI"
    ) continue;
    if (!childParentsMap.has(rel.person_id)) childParentsMap.set(rel.person_id, []);
    childParentsMap.get(rel.person_id)!.push(rel.related_id);
  }

  // Build couple lookup by member pair (early, needed for sorting)
  const couplePairLookup = new Map<string, string>();
  for (const [coupleId, { a, b }] of coupleMap) {
    couplePairLookup.set(`${a}_${b}`, coupleId);
    couplePairLookup.set(`${b}_${a}`, coupleId);
  }

  // Build child → parent couple map for grouping siblings
  const childToParentCouple = new Map<string, string>();
  // For children whose parents share no couple in the data, store avg parent X directly
  const childSingleParentX = new Map<string, number>();
  for (const [childId, parents] of childParentsMap) {
    let found = false;
    for (let i = 0; i < parents.length && !found; i++) {
      for (let j = i + 1; j < parents.length && !found; j++) {
        const cId = couplePairLookup.get(`${parents[i]}_${parents[j]}`);
        if (cId) { childToParentCouple.set(childId, cId); found = true; }
      }
    }
    if (!found && parents.length >= 1) {
      // Don't fall back to personToCouple (first couple may belong to a different marriage).
      // Instead use the average dagre X of the known parents so the child sorts near them.
      const avgX =
        parents.reduce((sum, pid) => sum + (personPos.get(pid)?.x ?? 0), 0) /
        parents.length;
      childSingleParentX.set(childId, avgX);
    }
  }

  // Get couple's X midpoint from current personPos.
  // Levels are processed top-to-bottom, so by the time a child's level is laid out,
  // both spouses (including any menantu) have already been assigned their final X.
  const coupleApproxX = (coupleId: string): number => {
    const c = coupleMap.get(coupleId);
    if (!c) return 0;
    const xa = personPos.get(c.a)?.x ?? 0;
    const xb = personPos.get(c.b)?.x ?? 0;
    return (xa + xb) / 2;
  };

  const SPACING = NODE_WIDTH + 80; // center-to-center gap between adjacent cards

  // Collect menantus per in-tree spouse (needed before group expansion)
  const personMenantus = new Map<string, string[]>();
  for (const { a, b } of coupleMap.values()) {
    const aHasParent = hasParent.has(a);
    const bHasParent = hasParent.has(b);
    if (aHasParent === bHasParent) continue;
    const spouseId = aHasParent ? a : b;
    const menantuid = aHasParent ? b : a;
    if (!personMenantus.has(spouseId)) personMenantus.set(spouseId, []);
    personMenantus.get(spouseId)!.push(menantuid);
  }

  // ── Per-family-group positioning ──────────────────────────────────────────
  // Collect in-tree persons per dagre Y level
  const levelInTreeMap = new Map<number, string[]>();
  for (const p of persons) {
    if (!hasParent.has(p.id)) continue;
    const pos = personPos.get(p.id);
    if (!pos) continue;
    const y = Math.round(pos.y);
    if (!levelInTreeMap.has(y)) levelInTreeMap.set(y, []);
    levelInTreeMap.get(y)!.push(p.id);
  }

  // Process levels top-to-bottom so parent positions are finalised before children read them
  const sortedLevels = [...levelInTreeMap.entries()].sort(([ya], [yb]) => ya - yb);

  for (const [y, inTreeIds] of sortedLevels) {
    // Group in-tree children by their parent couple
    const coupleGroupMap = new Map<
      string,
      { coupleId: string | null; idealCenterX: number; members: string[] }
    >();
    for (const id of inTreeIds) {
      const coupleId = childToParentCouple.get(id) ?? null;
      const key = coupleId ?? `__solo_${id}`;
      if (!coupleGroupMap.has(key)) {
        const idealCenterX = coupleId
          ? coupleApproxX(coupleId)
          : (childSingleParentX.get(id) ?? personPos.get(id)?.x ?? 0);
        coupleGroupMap.set(key, { coupleId, idealCenterX, members: [] });
      }
      coupleGroupMap.get(key)!.members.push(id);
    }

    // Sort members within each group by urutan_lahir
    for (const g of coupleGroupMap.values()) {
      g.members.sort((a, b) => {
        const ua = personById.get(a)?.urutan_lahir ?? 999;
        const ub = personById.get(b)?.urutan_lahir ?? 999;
        if (ua !== ub) return ua - ub;
        return a < b ? -1 : 1;
      });
    }

    // Sort groups left-to-right by idealCenterX
    const groups = [...coupleGroupMap.values()].sort(
      (a, b) => a.idealCenterX - b.idealCenterX
    );

    // Expand each group to include menantus
    // single menantu → right of spouse; multiple → first left, rest right
    const expandedGroups = groups.map((g) => {
      const expanded: string[] = [];
      for (const memberId of g.members) {
        const menantus = personMenantus.get(memberId) ?? [];
        const spousePos = personPos.get(memberId);
        if (menantus.length === 0) {
          expanded.push(memberId);
        } else if (menantus.length === 1) {
          if (spousePos) personPos.set(menantus[0], { x: 0, y: spousePos.y });
          expanded.push(memberId, menantus[0]);
        } else {
          if (spousePos) {
            for (const m of menantus) personPos.set(m, { x: 0, y: spousePos.y });
          }
          expanded.push(menantus[0], memberId, ...menantus.slice(1));
        }
      }
      return { idealCenterX: g.idealCenterX, members: expanded };
    });

    // Compute initial left/right bounds per group (centered at idealCenterX)
    const layouts = expandedGroups.map((g) => {
      const halfWidth = ((g.members.length - 1) / 2) * SPACING;
      return {
        members: g.members,
        left: g.idealCenterX - halfWidth,
        right: g.idealCenterX + halfWidth,
      };
    });

    // Resolve overlaps left-to-right — push later groups right if they'd collide
    // Min gap = SPACING so adjacent groups are never tighter than siblings within a group
    for (let i = 1; i < layouts.length; i++) {
      const prev = layouts[i - 1];
      const curr = layouts[i];
      const minLeft = prev.right + SPACING;
      if (curr.left < minLeft) {
        const shift = minLeft - curr.left;
        curr.left += shift;
        curr.right += shift;
      }
    }

    // Assign final X positions to every member (in-tree children + menantus)
    for (const { members, left } of layouts) {
      for (let i = 0; i < members.length; i++) {
        const memberId = members[i];
        const existing = personPos.get(memberId);
        const x = left + i * SPACING;
        if (existing) {
          personPos.set(memberId, { x, y: existing.y });
        } else {
          personPos.set(memberId, { x, y });
        }
      }
    }
  }

  // ── Bottom-up re-centering ────────────────────────────────────────────────
  // Children may have been pushed sideways by overlap resolution, leaving
  // their parent couple displaced. Re-center each couple over its children,
  // then cascade upward so grandparents follow.

  // coupleId → [in-tree child IDs]
  const coupleChildrenBU = new Map<string, string[]>();
  for (const [childId, coupleId] of childToParentCouple) {
    if (!coupleChildrenBU.has(coupleId)) coupleChildrenBU.set(coupleId, []);
    coupleChildrenBU.get(coupleId)!.push(childId);
  }

  // All unique Y levels in personPos, deepest first
  const allBUYs = [
    ...new Set([...personPos.values()].map((p) => Math.round(p.y))),
  ].sort((a, b) => b - a);

  // Skip deepest level (leaves) — start from the second-deepest
  for (let li = 1; li < allBUYs.length; li++) {
    const currentY = allBUYs[li];

    // Persons positioned at this Y level (±5 px tolerance)
    const atLevel = [...personPos.entries()]
      .filter(([, p]) => Math.abs(Math.round(p.y) - currentY) < 5)
      .map(([id]) => id);
    if (atLevel.length === 0) continue;

    interface BUSlot {
      ids: string[];
      halfSpan: number;      // (maxX − minX) / 2 — members keep relative spacing
      originalCenter: number;
      targetCenter: number;
    }

    const processedHere = new Set<string>();
    const buSlots: BUSlot[] = [];

    for (const [coupleId, { a, b }] of coupleMap) {
      if (!atLevel.includes(a) && !atLevel.includes(b)) continue;
      if (processedHere.has(a) || processedHere.has(b)) continue;

      const posA = personPos.get(a);
      const posB = personPos.get(b);
      if (!posA || !posB) continue;

      // originalCenter is the midpoint of THIS couple's two spouses only.
      // Do NOT include other-marriage menantus here — that caused a wrong
      // shift when one spouse has children with multiple partners.
      const originalCenter = (posA.x + posB.x) / 2;

      // All persons that must move together: {a, b} plus any other menantus
      // of a/b (so their relative spacing is preserved after the shift).
      const memberSet = new Set<string>();
      if (personPos.has(a)) memberSet.add(a);
      if (personPos.has(b)) memberSet.add(b);
      for (const m of personMenantus.get(a) ?? []) if (personPos.has(m)) memberSet.add(m);
      for (const m of personMenantus.get(b) ?? []) if (personPos.has(m)) memberSet.add(m);

      const xs = [...memberSet].map((id) => personPos.get(id)!.x);
      const halfSpan = (Math.max(...xs) - Math.min(...xs)) / 2;

      // Target = midpoint of the couple's children's final X span
      const children = coupleChildrenBU.get(coupleId) ?? [];
      let targetCenter = originalCenter; // no children → don't move
      if (children.length > 0) {
        const childXs = children.map((id) => personPos.get(id)?.x ?? 0);
        targetCenter = (Math.min(...childXs) + Math.max(...childXs)) / 2;
      }

      buSlots.push({ ids: [...memberSet], halfSpan, originalCenter, targetCenter });
      for (const id of memberSet) processedHere.add(id);
    }

    if (buSlots.length === 0) continue;

    // Sort slots by target center
    buSlots.sort((a, b) => a.targetCenter - b.targetCenter);

    // Resolve overlaps left → right so re-centered slots don't collide
    for (let i = 1; i < buSlots.length; i++) {
      const prev = buSlots[i - 1];
      const curr = buSlots[i];
      const prevRight = prev.targetCenter + prev.halfSpan;
      const currLeft = curr.targetCenter - curr.halfSpan;
      if (currLeft < prevRight + SPACING) {
        curr.targetCenter = prevRight + SPACING + curr.halfSpan;
      }
    }

    // Apply shifts — every member in a slot shifts by the same amount
    for (const slot of buSlots) {
      const shift = slot.targetCenter - slot.originalCenter;
      if (Math.abs(shift) < 1) continue;
      for (const id of slot.ids) {
        const pos = personPos.get(id)!;
        personPos.set(id, { x: pos.x + shift, y: pos.y });
      }
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

  // Couple nodes: midpoint between spouses, force same Y for horizontal lines
  const couplePos = new Map<string, { x: number; y: number }>();
  for (const [coupleId, { a, b }] of coupleMap) {
    const posA = personPos.get(a);
    const posB = personPos.get(b);
    if (!posA || !posB) continue;

    const sharedY = (posA.y + posB.y) / 2;
    personPos.set(a, { x: posA.x, y: sharedY });
    personPos.set(b, { x: posB.x, y: sharedY });

    const cx = (posA.x + posB.x) / 2;
    const cy = sharedY;
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

    edges.push({
      id: `${a}-${coupleId}`,
      source: a,
      target: coupleId,
      sourceHandle: posA.x < cp.x ? "right" : "left",
      targetHandle: posA.x < cp.x ? "left" : "right",
      type: "straight",
      style: edgeStyle,
    });

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

  // Parent→child edges
  const addedChildEdges = new Set<string>();

  for (const rel of relationships) {
    if (
      rel.tipe !== "AYAH_KANDUNG" &&
      rel.tipe !== "IBU_KANDUNG" &&
      rel.tipe !== "AYAH_TIRI" &&
      rel.tipe !== "IBU_TIRI"
    ) continue;

    const parentId = rel.related_id;
    const childId = rel.person_id;

    const allParents = childParentsMap.get(childId) ?? [];
    const otherParents = allParents.filter((p) => p !== parentId);
    let sourceId: string = parentId;
    for (const otherId of otherParents) {
      const cId = couplePairLookup.get(`${parentId}_${otherId}`);
      if (cId && couplePos.has(cId)) { sourceId = cId; break; }
    }
    if (sourceId === parentId) {
      const cId = personToCouple.get(parentId);
      if (cId && couplePos.has(cId)) sourceId = cId;
    }

    const edgeId = `${sourceId}->${childId}`;
    if (addedChildEdges.has(edgeId)) continue;
    addedChildEdges.add(edgeId);

    const isStep = rel.tipe === "AYAH_TIRI" || rel.tipe === "IBU_TIRI";
    const isFromCouple = couplePos.has(sourceId);

    edges.push({
      id: edgeId,
      source: sourceId,
      target: childId,
      sourceHandle: isFromCouple ? "bottom" : undefined,
      type: "familyEdge",
      style: isStep
        ? { strokeDasharray: "5,5", stroke: "#94a3b8" }
        : { stroke: "#94a3b8" },
    });
  }

  return { nodes, edges };
}
