import { useEffect, useState } from "react";
import type { DepNode, DepEdge } from "../../types/game";

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  node: DepNode;
}

interface UseForceLayoutOptions {
  nodes: DepNode[];
  edges: DepEdge[];
  width: number;
  height: number;
}

export function useForceLayout({
  nodes,
  edges,
  width,
  height,
}: UseForceLayoutOptions) {
  const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>([]);

  useEffect(() => {
    if (nodes.length === 0 || width === 0) return;
    const result = computeLayout(nodes, edges, width, height);
    setLayoutNodes(result);
  }, [nodes, edges, width, height]);

  return layoutNodes;
}

function computeLayout(
  nodes: DepNode[],
  edges: DepEdge[],
  width: number,
  height: number,
): LayoutNode[] {
  const N = nodes.length;
  if (N === 0) return [];
  if (N === 1)
    return [{ id: nodes[0].id, x: width / 2, y: height / 2, node: nodes[0] }];

  const cx = width / 2;
  const cy = height / 2;
  const PADDING = 50;

  const usableW = width - 2 * PADDING;
  const usableH = height - 2 * PADDING;
  const idealDist = Math.sqrt((usableW * usableH) / N);

  // Initial: golden-angle spiral
  const spread = Math.min(usableW, usableH) * 0.35;
  const pos = nodes.map((n, i) => {
    const angle = i * 2.399963;
    const r = Math.sqrt((i + 1) / N) * spread;
    return {
      id: n.id,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      vx: 0,
      vy: 0,
      node: n,
    };
  });

  const posMap = new Map<string, (typeof pos)[0]>();
  pos.forEach((p) => posMap.set(p.id, p));

  const ITERS = N > 200 ? 100 : N > 80 ? 200 : 300;
  const GRAVITY = 0.1;

  for (let iter = 0; iter < ITERS; iter++) {
    const t = 1 - iter / ITERS;
    const maxMove = idealDist * 0.4 * t;

    for (const p of pos) {
      p.vx = 0;
      p.vy = 0;
    }

    // Repulsion
    for (let i = 0; i < N; i++) {
      const a = pos[i];
      for (let j = i + 1; j < N; j++) {
        const b = pos[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
        const f = (idealDist * idealDist) / dist;
        dx = (dx / dist) * f;
        dy = (dy / dist) * f;
        a.vx += dx;
        a.vy += dy;
        b.vx -= dx;
        b.vy -= dy;
      }
    }

    // Attraction (edges only)
    for (const edge of edges) {
      const a = posMap.get(edge.source);
      const b = posMap.get(edge.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
      const f = (dist * dist) / idealDist;
      const fx = (dx / dist) * f;
      const fy = (dy / dist) * f;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // Gravity toward center — stronger for nodes far from center
    for (const p of pos) {
      const dx = cx - p.x;
      const dy = cy - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      // Quadratic pull: nodes far from center get pulled harder
      const gForce = GRAVITY * dist * 0.01 + GRAVITY;
      p.vx += dx * gForce;
      p.vy += dy * gForce;
    }

    // Apply capped displacement
    for (const p of pos) {
      const d = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 0.01;
      const cap = Math.min(d, maxMove);
      p.x += (p.vx / d) * cap;
      p.y += (p.vy / d) * cap;
    }
  }

  // Rescale to fit viewport instead of clamping
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of pos) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scaleX = usableW / rangeX;
  const scaleY = usableH / rangeY;
  const scale = Math.min(scaleX, scaleY);

  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  return pos.map((p) => ({
    id: p.id,
    x: cx + (p.x - midX) * scale,
    y: cy + (p.y - midY) * scale,
    node: p.node,
  }));
}
