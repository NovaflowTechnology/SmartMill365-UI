import { parseOrthogonalPath } from "./ProcessPipeParts";

export function getConnectionKind(connection = {}) {
  const type = connection.connectorType ||
    (connection.connectionStyle === "arrows" ? "arrow" : "pipeline");

  if (type === "conveyor" ||
      (type === "pipeline" && ["conveyor", "conveyorTrack"].includes(connection.pipeDesign))) {
    return "conveyor";
  }

  return ["pipeline", "arrow", "line"].includes(type) ? type : "pipeline";
}

export function canConnectionsBranch(first, second) {
  return getConnectionKind(first) === getConnectionKind(second);
}

export function getBranchPlacement(
  geometry,
  { distance = 130, minX = 12, minY = 12, maxX = 2188, maxY = 1288 } = {}
) {
  const segment = geometry?.segments
    ?.slice()
    .sort((left, right) => Number(right.length || 0) - Number(left.length || 0))[0];
  if (!segment) return null;

  const x = segment.midpoint.x;
  const y = segment.midpoint.y;
  const length = Math.max(1, Number(segment.length) ||
    Math.hypot(segment.end.x - segment.start.x, segment.end.y - segment.start.y));
  const normal = {
    x: -(segment.end.y - segment.start.y) / length,
    y: (segment.end.x - segment.start.x) / length,
  };
  const clampPoint = (direction) => ({
    x: Math.max(minX, Math.min(maxX, x + normal.x * distance * direction)),
    y: Math.max(minY, Math.min(maxY, y + normal.y * distance * direction)),
  });
  const first = clampPoint(1);
  const second = clampPoint(-1);
  const target = Math.hypot(first.x - x, first.y - y) >=
    Math.hypot(second.x - x, second.y - y) ? first : second;

  return {
    source: { x, y },
    target,
    segmentIndex: Number.isInteger(segment.index) ? segment.index :
      geometry.segments.indexOf(segment),
    t: 0.5,
  };
}

export function buildConnectionBranchJunctions(routes = []) {
  const routeById = new Map(routes.map((route) => [route.id, route]));
  const junctions = new Map();

  routes.forEach((route) => {
    [route.sourcePipeJoin, route.targetPipeJoin].forEach((join) => {
      const parent = routeById.get(join?.connectionId);
      if (!parent || !canConnectionsBranch(route, parent)) return;

      const vertices = parseOrthogonalPath(parent.path);
      const start = vertices[Number(join.segmentIndex)];
      const end = vertices[Number(join.segmentIndex) + 1];
      if (!start || !end) return;

      const t = Math.max(0, Math.min(1, Number.isFinite(Number(join.t)) ? Number(join.t) : .5));
      const x = start.x + (end.x - start.x) * t;
      const y = start.y + (end.y - start.y) * t;
      const kind = getConnectionKind(parent);
      const key = `${kind}:${Math.round(x * 2) / 2}:${Math.round(y * 2) / 2}`;
      const existing = junctions.get(key);

      junctions.set(key, {
        id: `connection-branch-${key}`,
        x,
        y,
        connectorType: kind,
        color: parent.color || route.color || "#64748B",
        branches: (existing?.branches || 0) + 1,
      });
    });
  });

  return [...junctions.values()];
}
