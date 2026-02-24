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

export function useForceLayout({ nodes, edges, width, height }: UseForceLayoutOptions) {
  const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>([]);

  useEffect(() => {
    if (nodes.length === 0 || width === 0) return;

    // Run entire simulation synchronously — no RAF, no intermediate renders
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
  const cx = width / 2;
  const cy = height / 2;
  const PADDING = 60;

  // Build adjacency for faster lookup
  const edgeIndex = new Map<string, string[]>();
  for (const e of edges) {
    let arr = edgeIndex.get(e.source);
    if (!arr) { arr = []; edgeIndex.set(e.source, arr); }
    arr.push(e.target);

    arr = edgeIndex.get(e.target);
    if (!arr) { arr = []; edgeIndex.set(e.target, arr); }
    arr.push(e.source);
  }

  // Initialize with deterministic spread (golden angle)
  const positions = nodes.map((n, i) => {
    const angle = i * 2.399963; // golden angle
    const r = Math.sqrt(i + 1) * 30;
    return {
      id: n.id,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      vx: 0,
      vy: 0,
      node: n,
    };
  });

  const posMap = new Map<string, typeof positions[0]>();
  positions.forEach((p) => posMap.set(p.id, p));

  const K_REPULSION = 8000;
  const K_SPRING = 0.005;
  const REST_LENGTH = 120;
  const DAMPING = 0.8;
  const CENTER_PULL = 0.003;
  const MAX_ITERS = 200;

  for (let iter = 0; iter < MAX_ITERS; iter++) {
    // Repulsion (O(n²) — fine for <500 nodes)
    for (let i = 0; i < positions.length; i++) {
      const a = positions[i];
      for (let j = i + 1; j < positions.length; j++) {
        const b = positions[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 1;
        const force = K_REPULSION / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }

    // Attraction (edges)
    for (const edge of edges) {
      const a = posMap.get(edge.source);
      const b = posMap.get(edge.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = K_SPRING * (dist - REST_LENGTH);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // Apply velocity + centering + damping
    for (const p of positions) {
      p.vx += (cx - p.x) * CENTER_PULL;
      p.vy += (cy - p.y) * CENTER_PULL;
      p.vx *= DAMPING;
      p.vy *= DAMPING;
      p.x += p.vx;
      p.y += p.vy;
      // Clamp within bounds
      p.x = Math.max(PADDING, Math.min(width - PADDING, p.x));
      p.y = Math.max(PADDING, Math.min(height - PADDING, p.y));
    }
  }

  return positions.map((p) => ({
    id: p.id,
    x: p.x,
    y: p.y,
    node: p.node,
  }));
}
