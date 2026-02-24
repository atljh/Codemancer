import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useGameStore } from "../../stores/gameStore";
import { useApi } from "../../hooks/useApi";
import { useTranslation } from "../../hooks/useTranslation";
import { useForceLayout } from "./useForceLayout";
import type { DepNode, DepEdge } from "../../types/game";
import type { LayoutNode } from "./useForceLayout";

export function TacticalMap() {
  const openFiles = useGameStore((s) => s.openFiles);
  const setActiveTab = useGameStore((s) => s.setActiveTab);
  const openFile = useGameStore((s) => s.openFile);
  const workspaceRoot = useGameStore((s) => s.settings.workspace_root);
  const api = useApi();
  const { t } = useTranslation();

  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<DepNode[]>([]);
  const [edges, setEdges] = useState<DepEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const [fogOfWar, setFogOfWar] = useState(true);

  const blastRadiusFiles = useGameStore((s) => s.blastRadiusFiles);
  const blastRadiusSource = useGameStore((s) => s.blastRadiusSource);
  const clearBlastRadius = useGameStore((s) => s.clearBlastRadius);
  const openFilePaths = useMemo(() => new Set(openFiles.map((f) => f.path)), [openFiles]);
  const blastSet = useMemo(() => new Set(blastRadiusFiles), [blastRadiusFiles]);

  // Observe container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
      setViewBox({ x: 0, y: 0, w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Fetch graph
  useEffect(() => {
    setLoading(true);
    api
      .getDependencyGraph()
      .then((g) => {
        setNodes(g.nodes);
        setEdges(g.edges);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api]);

  const layoutNodes = useForceLayout({
    nodes,
    edges,
    width: dimensions.width,
    height: dimensions.height,
  });

  const nodeMap = useMemo(() => {
    const m = new Map<string, LayoutNode>();
    layoutNodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [layoutNodes]);

  // Auto-select blast radius source when entering map
  useEffect(() => {
    if (blastRadiusSource && !selectedNode) {
      setSelectedNode(blastRadiusSource);
    }
  }, [blastRadiusSource, selectedNode]);

  // Highlight sets
  const activeId = selectedNode || hoveredNode;
  const { dependentsOf, dependenciesOf } = useMemo(() => {
    const deps = new Set<string>();
    const depBy = new Set<string>();
    if (activeId) {
      for (const e of edges) {
        if (e.source === activeId) deps.add(e.target);
        if (e.target === activeId) depBy.add(e.source);
      }
    }
    return { dependentsOf: deps, dependenciesOf: depBy };
  }, [activeId, edges]);

  // Pan handlers
  const onMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y };
    },
    [viewBox.x, viewBox.y]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isPanning) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      const scale = viewBox.w / dimensions.width;
      setViewBox((v) => ({ ...v, x: panStart.current.vx - dx * scale, y: panStart.current.vy - dy * scale }));
    },
    [isPanning, viewBox.w, dimensions.width]
  );

  const onMouseUp = useCallback(() => setIsPanning(false), []);

  const onWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      setViewBox((v) => {
        const nw = Math.max(dimensions.width * 0.3, Math.min(dimensions.width * 3, v.w * factor));
        const nh = Math.max(dimensions.height * 0.3, Math.min(dimensions.height * 3, v.h * factor));
        const cx = v.x + v.w / 2;
        const cy = v.y + v.h / 2;
        return { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
      });
    },
    [dimensions]
  );

  const handleNodeClick = async (nodeId: string) => {
    if (selectedNode === nodeId) {
      // Second click: open file
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        const fullPath = workspaceRoot ? `${workspaceRoot}/${node.path}` : node.path;
        try {
          const result = await api.readFile(fullPath);
          openFile({ path: fullPath, content: result.content, language: result.language, isDirty: false });
          setActiveTab(fullPath);
        } catch {
          // ignore
        }
      }
      setSelectedNode(null);
    } else {
      setSelectedNode(nodeId);
    }
  };

  const resetView = () => {
    setViewBox({ x: 0, y: 0, w: dimensions.width, h: dimensions.height });
    setSelectedNode(null);
  };

  const nodeRadius = (lines: number) => Math.max(6, Math.min(24, Math.sqrt(lines) * 0.8));

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border border-theme-accent/40 border-t-theme-accent rounded-full animate-spin" />
        <span className="ml-3 text-xs text-theme-text-dim font-mono">{t("map.loading")}</span>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-theme-text-dim font-mono">
        {t("map.noData")}
      </div>
    );
  }

  // Set of highlighted nodes (show labels for these)
  const highlightedIds = new Set<string>();
  if (activeId) {
    highlightedIds.add(activeId);
    dependentsOf.forEach((id) => highlightedIds.add(id));
    dependenciesOf.forEach((id) => highlightedIds.add(id));
  }

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden bg-theme-bg-deep">
      {/* Controls */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <button
          onClick={() => setFogOfWar(!fogOfWar)}
          className={`text-[9px] font-mono px-2 py-1 rounded transition-colors ${
            fogOfWar ? "bg-theme-accent/15 text-theme-accent" : "bg-white/5 text-theme-text-dim"
          }`}
        >
          {t("map.fogOfWar")}
        </button>
        {blastRadiusSource && (
          <button
            onClick={clearBlastRadius}
            className="text-[9px] font-mono px-2 py-1 rounded bg-orange-500/15 text-orange-400 hover:bg-orange-500/25"
          >
            BLAST RADIUS
          </button>
        )}
        <button
          onClick={resetView}
          className="text-[9px] font-mono px-2 py-1 rounded bg-white/5 text-theme-text-dim hover:text-theme-text hover:bg-white/8"
        >
          {t("map.resetView")}
        </button>
      </div>

      {/* Tooltip */}
      {activeId && (() => {
        const ln = nodeMap.get(activeId);
        const nd = nodes.find((n) => n.id === activeId);
        if (!ln || !nd) return null;
        const deps = edges.filter((e) => e.source === activeId).length;
        const depBy = edges.filter((e) => e.target === activeId).length;
        return (
          <div className="absolute bottom-3 left-3 z-10 glass-panel rounded px-3 py-2 max-w-[320px]">
            <div className="text-[10px] font-mono text-theme-accent font-bold truncate">{nd.path}</div>
            <div className="text-[9px] font-mono text-theme-text-dim mt-0.5">
              {nd.lines} {t("map.lines")} | {deps} {t("map.dependents")} | {depBy} {t("map.dependencies")}
            </div>
          </div>
        );
      })()}

      <svg
        width="100%"
        height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        className="block cursor-grab active:cursor-grabbing"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <filter id="map-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0 L10,5 L0,10" fill="var(--theme-accent)" opacity="0.3" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((e, i) => {
          const s = nodeMap.get(e.source);
          const tgt = nodeMap.get(e.target);
          if (!s || !tgt) return null;

          const isHighlighted = activeId && (e.source === activeId || e.target === activeId);
          let opacity = 0.06;
          let stroke = "var(--theme-text-dim)";
          if (isHighlighted) {
            if (e.source === activeId) {
              opacity = 0.7;
              stroke = "hsl(0, 70%, 55%)";
            } else {
              opacity = 0.7;
              stroke = "hsl(120, 70%, 45%)";
            }
          }

          return (
            <line
              key={i}
              x1={s.x}
              y1={s.y}
              x2={tgt.x}
              y2={tgt.y}
              stroke={stroke}
              strokeWidth={isHighlighted ? 1.5 : 0.3}
              opacity={opacity}
              markerEnd={isHighlighted ? "url(#arrow)" : undefined}
            />
          );
        })}

        {/* Nodes */}
        {layoutNodes.map((ln) => {
          const r = nodeRadius(ln.node.lines);
          const fullNodePath = workspaceRoot ? `${workspaceRoot}/${ln.node.path}` : ln.node.path;
          const isOpen = openFilePaths.has(fullNodePath);
          const isActive = ln.id === activeId;
          const isDependent = dependentsOf.has(ln.id);
          const isDependency = dependenciesOf.has(ln.id);
          const isBlastSource = ln.id === blastRadiusSource;
          const isBlastTarget = blastSet.has(ln.id);
          const showLabel = isActive || isDependent || isDependency || isBlastSource || isBlastTarget;

          let fill = "var(--theme-accent)";
          // If fog of war is on but no files are open, show all nodes normally
          const fogActive = fogOfWar && openFilePaths.size > 0;
          let nodeOpacity = fogActive && !isOpen && !isActive ? 0.35 : 0.7;

          if (isActive) {
            fill = "var(--theme-accent)";
            nodeOpacity = 1;
          } else if (isBlastSource) {
            fill = "hsl(30, 90%, 55%)";
            nodeOpacity = 1;
          } else if (isBlastTarget) {
            fill = "hsl(30, 70%, 50%)";
            nodeOpacity = 0.9;
          } else if (isDependent) {
            fill = "hsl(0, 70%, 55%)";
            nodeOpacity = 1;
          } else if (isDependency) {
            fill = "hsl(120, 70%, 45%)";
            nodeOpacity = 1;
          }

          return (
            <g
              key={ln.id}
              className="cursor-pointer"
              opacity={nodeOpacity}
              onClick={(e) => {
                e.stopPropagation();
                handleNodeClick(ln.id);
              }}
              onMouseEnter={() => setHoveredNode(ln.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <circle
                cx={ln.x}
                cy={ln.y}
                r={r}
                fill={fill}
                fillOpacity={0.15}
                stroke={fill}
                strokeWidth={isActive ? 2 : 1}
                filter={isActive ? "url(#map-glow)" : undefined}
              />
              {showLabel && (
                <text
                  x={ln.x}
                  y={ln.y + r + 11}
                  textAnchor="middle"
                  fontSize={8}
                  fontFamily="monospace"
                  fill={fill}
                  opacity={0.9}
                >
                  {ln.node.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
