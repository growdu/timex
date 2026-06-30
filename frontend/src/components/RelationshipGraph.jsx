import { useEffect, useMemo, useRef } from "react";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "d3-force";
import { select } from "d3-selection";
import { drag } from "d3-drag";

const STAGE_COLORS = {
  student: "#5d4cff",
  "first-job": "#7c8aa6",
  maker: "#ff7a59",
  family: "#2ec4b6",
  custom: "#ffb84d",
  travel: "#ff7a59",
  work: "#5d4cff",
  life: "#2ec4b6",
};

function buildGraph(people, events) {
  const personNodes = (people || []).map((p) => ({
    id: p.id,
    label: p.name,
    role: p.role,
    type: "person",
  }));

  // Group events per person to size node by involvement
  const eventCount = new Map();
  (events || []).forEach((e) => {
    const ids = Array.isArray(e.people) && e.people.length > 0 && typeof e.people[0] === "object"
      ? e.people.map((p) => p.id)
      : e.people || [];
    ids.forEach((id) => eventCount.set(id, (eventCount.get(id) || 0) + 1));
  });

  personNodes.forEach((n) => {
    n.weight = eventCount.get(n.id) || 0;
  });

  // Event nodes (limited to first 12 to avoid clutter)
  const eventNodes = (events || []).slice(0, 12).map((e) => ({
    id: `event-${e.id}`,
    label: e.title,
    type: "event",
    stage: e.stage,
    rawId: e.id,
  }));

  const links = [];
  (events || []).forEach((e) => {
    const personIds = Array.isArray(e.people) && e.people.length > 0 && typeof e.people[0] === "object"
      ? e.people.map((p) => p.id)
      : e.people || [];
    personIds.forEach((pid) => {
      const target = `event-${e.id}`;
      const sourceNode = personNodes.find((n) => n.id === pid);
      const targetNode = eventNodes.find((n) => n.id === target);
      if (sourceNode && targetNode) {
        links.push({ source: sourceNode.id, target: targetNode.id });
      }
    });
  });

  return { personNodes, eventNodes, links };
}

export default function RelationshipGraph({
  people = [],
  events = [],
  width = 720,
  height = 420,
  onSelectPerson,
  selectedPersonId,
}) {
  const svgRef = useRef(null);
  const data = useMemo(() => buildGraph(people, events), [people, events]);

  // Degrade gracefully if too many nodes
  const useListFallback = data.personNodes.length > 50;

  useEffect(() => {
    if (useListFallback) return undefined;
    if (!svgRef.current) return undefined;
    if (data.personNodes.length === 0) return undefined;

    const svg = select(svgRef.current);
    svg.selectAll("*").remove();

    const nodes = [
      ...data.personNodes.map((n) => ({ ...n })),
      ...data.eventNodes.map((n) => ({ ...n })),
    ];
    const links = data.links.map((l) => ({ ...l }));

    const sim = forceSimulation(nodes)
      .force(
        "link",
        forceLink(links)
          .id((d) => d.id)
          .distance(80)
          .strength(0.5)
      )
      .force("charge", forceManyBody().strength(-180))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collide", forceCollide().radius(28));

    const g = svg.append("g");

    const linkSel = g
      .append("g")
      .attr("stroke", "#d9d5cf")
      .attr("stroke-width", 1.2)
      .selectAll("line")
      .data(links)
      .join("line");

    const nodeG = g
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", (d) => `rg-node rg-node-${d.type}`)
      .style("cursor", (d) => (d.type === "person" ? "pointer" : "default"));

    nodeG
      .append("circle")
      .attr("r", (d) => (d.type === "person" ? 12 + Math.min(8, (d.weight || 0) * 2) : 8))
      .attr("fill", (d) => {
        if (d.type === "person") return "#ffffff";
        return STAGE_COLORS[d.stage] || "#5d4cff";
      })
      .attr("stroke", (d) => {
        if (d.type === "event") return STAGE_COLORS[d.stage] || "#5d4cff";
        if (d.id === selectedPersonId) return "#ff5470";
        return "#5d4cff";
      })
      .attr("stroke-width", (d) => (d.id === selectedPersonId ? 3 : 1.5));

    nodeG
      .append("text")
      .text((d) => d.label)
      .attr("x", 0)
      .attr("y", (d) => (d.type === "person" ? 26 : -14))
      .attr("text-anchor", "middle")
      .attr("font-size", (d) => (d.type === "person" ? 12 : 10))
      .attr("fill", (d) => (d.type === "event" ? "#5d4cff" : "#1c1b22"))
      .attr("font-weight", (d) => (d.type === "person" ? 600 : 400));

    nodeG
      .filter((d) => d.type === "person")
      .on("click", (_event, d) => onSelectPerson && onSelectPerson(d.id))
      .on("mouseover", function () {
        select(this).select("circle").attr("stroke-width", 3);
      })
      .on("mouseout", function (_e, d) {
        select(this)
          .select("circle")
          .attr("stroke-width", d.id === selectedPersonId ? 3 : 1.5);
      });

    nodeG.call(
      drag()
        .on("start", (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) sim.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );

    sim.on("tick", () => {
      linkSel
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);
      nodeG.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      sim.stop();
    };
  }, [data, width, height, selectedPersonId, onSelectPerson, useListFallback]);

  if (data.personNodes.length === 0) {
    return (
      <div className="rg-fallback" style={{ height }}>
        <strong>暂无人物</strong>
        <p>添加人物后这里会显示人物 × 事件的关系网络。</p>
      </div>
    );
  }

  if (useListFallback) {
    return (
      <div className="rg-fallback" style={{ height }}>
        <strong>节点较多（{data.personNodes.length}）</strong>
        <p>已降级为列表视图，避免性能问题。</p>
        <ul className="rg-fallback-list">
          {data.personNodes.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={`rg-fallback-item ${p.id === selectedPersonId ? "is-active" : ""}`}
                onClick={() => onSelectPerson && onSelectPerson(p.id)}
              >
                {p.label} · {p.weight} 段共事
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="rg-wrapper" style={{ height }}>
      <svg ref={svgRef} width={width} height={height} className="rg-svg" />
      <div className="rg-legend">
        <span><i className="rg-dot rg-dot-person" /> 人物</span>
        <span><i className="rg-dot rg-dot-event" /> 事件</span>
        <span className="rg-legend-hint">拖拽 · 滚轮缩放</span>
      </div>
    </div>
  );
}
