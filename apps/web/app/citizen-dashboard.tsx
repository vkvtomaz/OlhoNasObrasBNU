"use client";
/* eslint-disable @typescript-eslint/no-explicit-any -- Leaflet é carregado do CDN para manter o bundle sem dependência duplicada. */

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dashboardJson from "./dashboard-data.json";

type WorkRecord = {
  id: number | string;
  code: string;
  slug: string;
  name: string;
  secretariat: string;
  address: string;
  intervention: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  neighborhood: string | null;
  contractNumber: string | null;
  contractDate: string | null;
  startDate: string | null;
  executionLimit: string | null;
  contractEnd: string | null;
  company: string | null;
  initialValue: number | null;
  currentValue: number | null;
  executedValue: number | null;
  progress: number | null;
  costChange: number | null;
  mandate: string;
};

type DashboardData = {
  source: string;
  sourceUrl: string;
  collectedAt: string;
  records: WorkRecord[];
};

type Filters = {
  query: string;
  status: string;
  mandate: string;
  secretariat: string;
  neighborhood: string;
  intervention: string;
  cost: string;
  deadline: string;
  progress: string;
};

const rawData = dashboardJson as DashboardData;

function mandateFromDate(contractDate: string | null, fallback: string) {
  const year = Number(contractDate?.slice(0, 4));
  if (!Number.isFinite(year)) return fallback.replace("?", "–").replace("n?o", "não");
  const start = 2013 + Math.floor((year - 2013) / 4) * 4;
  return `${start}–${start + 3}`;
}

const data: DashboardData = {
  ...rawData,
  records: rawData.records.map((record) => ({ ...record, mandate: mandateFromDate(record.contractDate, record.mandate) })),
};
const initialFilters: Filters = {
  query: "",
  status: "Todos",
  mandate: "Todos",
  secretariat: "Todas",
  neighborhood: "Todos",
  intervention: "Todas",
  cost: "Todos",
  deadline: "Todos",
  progress: "Todos",
};

const statusColors: Record<string, string> = {
  "Em Andamento": "#d39b18",
  Concluída: "#237a58",
  Paralisada: "#991f2f",
};

const money = (value: number | null | undefined, compact = false) => {
  if (value == null) return "Não informado";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
};

const percent = (value: number | null | undefined) =>
  value == null ? "Não informado" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

const dateBR = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`))
    : "Não informada";

const escapeHtml = (value: string) =>
  value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);

const isOverdue = (work: WorkRecord) => work.status !== "Concluída" && Boolean(work.executionLimit && work.executionLimit < data.collectedAt.slice(0, 10));
const costTone = (change: number | null) => change == null ? "#8d8587" : change > 50 ? "#991f2f" : change > 20 ? "#d17818" : change > 0 ? "#d7b440" : "#237a58";

function unique(records: WorkRecord[], key: keyof WorkRecord) {
  return [...new Set(records.map((record) => record[key]).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function matchesFilters(work: WorkRecord, filters: Filters) {
  const text = `${work.code} ${work.name} ${work.address} ${work.secretariat} ${work.contractNumber ?? ""} ${work.company ?? ""}`.toLocaleLowerCase("pt-BR");
  const query = filters.query.trim().toLocaleLowerCase("pt-BR");
  const today = data.collectedAt.slice(0, 10);
  const days90 = new Date(`${today}T12:00:00Z`);
  days90.setUTCDate(days90.getUTCDate() + 90);
  const nearDeadline = days90.toISOString().slice(0, 10);
  const active = work.status !== "Concluída";
  return (
    (!query || text.includes(query)) &&
    (filters.status === "Todos" || work.status === filters.status) &&
    (filters.mandate === "Todos" || work.mandate === filters.mandate) &&
    (filters.secretariat === "Todas" || work.secretariat === filters.secretariat) &&
    (filters.neighborhood === "Todos" || work.neighborhood === filters.neighborhood || (filters.neighborhood === "Não identificado" && !work.neighborhood)) &&
    (filters.intervention === "Todas" || work.intervention === filters.intervention || (filters.intervention === "Não informada" && !work.intervention)) &&
    (filters.cost === "Todos" ||
      (filters.cost === "Acima de 20%" && (work.costChange ?? -Infinity) > 20) ||
      (filters.cost === "Até 20%" && work.costChange != null && work.costChange > 0 && work.costChange <= 20) ||
      (filters.cost === "Sem aumento" && work.costChange != null && work.costChange <= 0) ||
      (filters.cost === "Sem valor comparável" && work.costChange == null)) &&
    (filters.deadline === "Todos" ||
      (filters.deadline === "Prazo vencido" && active && Boolean(work.executionLimit && work.executionLimit < today)) ||
      (filters.deadline === "Vence em 90 dias" && active && Boolean(work.executionLimit && work.executionLimit >= today && work.executionLimit <= nearDeadline)) ||
      (filters.deadline === "Sem prazo" && active && !work.executionLimit)) &&
    (filters.progress === "Todos" ||
      (filters.progress === "0% a 25%" && work.progress != null && work.progress <= 25) ||
      (filters.progress === "25% a 75%" && work.progress != null && work.progress > 25 && work.progress <= 75) ||
      (filters.progress === "75% a 99%" && work.progress != null && work.progress > 75 && work.progress < 100) ||
      (filters.progress === "100%" && work.progress != null && work.progress >= 100) ||
      (filters.progress === "Não informado" && work.progress == null))
  );
}

function FilterBar({ filters, setFilters, count }: { filters: Filters; setFilters: (value: Filters) => void; count: number }) {
  const update = (key: keyof Filters, value: string) => setFilters({ ...filters, [key]: value });
  return <section className="filter-panel" aria-labelledby="filter-title">
    <div className="filter-heading">
      <div><span className="section-kicker">Explore os dados</span><h2 id="filter-title">Cruze as informações</h2></div>
      <div className="filter-result"><strong>{count}</strong><span>registros visíveis</span></div>
    </div>
    <div className="filter-grid">
      <label className="search-filter">Buscar obra, rua, contrato ou empresa<input value={filters.query} onChange={(event) => update("query", event.target.value)} placeholder="Ex.: ponte, Rua Bahia, 017/2026…" /></label>
      <label>Situação<select value={filters.status} onChange={(event) => update("status", event.target.value)}><option>Todos</option><option>Em Andamento</option><option>Paralisada</option><option>Concluída</option></select></label>
      <label>Ciclo do contrato<select value={filters.mandate} onChange={(event) => update("mandate", event.target.value)}><option>Todos</option>{unique(data.records, "mandate").map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Secretaria<select value={filters.secretariat} onChange={(event) => update("secretariat", event.target.value)}><option>Todas</option>{unique(data.records, "secretariat").map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Bairro<select value={filters.neighborhood} onChange={(event) => update("neighborhood", event.target.value)}><option>Todos</option>{unique(data.records, "neighborhood").map((item) => <option key={item}>{item}</option>)}<option>Não identificado</option></select></label>
      <label>Tipo<select value={filters.intervention} onChange={(event) => update("intervention", event.target.value)}><option>Todas</option>{unique(data.records, "intervention").map((item) => <option key={item}>{item}</option>)}<option>Não informada</option></select></label>
      <label>Variação de custo<select value={filters.cost} onChange={(event) => update("cost", event.target.value)}><option>Todos</option><option>Acima de 20%</option><option>Até 20%</option><option>Sem aumento</option><option>Sem valor comparável</option></select></label>
      <label>Prazo<select value={filters.deadline} onChange={(event) => update("deadline", event.target.value)}><option>Todos</option><option>Prazo vencido</option><option>Vence em 90 dias</option><option>Sem prazo</option></select></label>
      <label>Execução física<select value={filters.progress} onChange={(event) => update("progress", event.target.value)}><option>Todos</option><option>0% a 25%</option><option>25% a 75%</option><option>75% a 99%</option><option>100%</option><option>Não informado</option></select></label>
    </div>
    <button className="clear-filters" type="button" onClick={() => setFilters(initialFilters)}>Limpar todos os filtros</button>
  </section>;
}

function MetricStrip({ records }: { records: WorkRecord[] }) {
  const active = records.filter((record) => record.status === "Em Andamento").length;
  const paused = records.filter((record) => record.status === "Paralisada").length;
  const costAlerts = records.filter((record) => (record.costChange ?? -Infinity) > 20).length;
  const overdue = records.filter((record) => record.status !== "Concluída" && record.executionLimit && record.executionLimit < data.collectedAt.slice(0, 10)).length;
  const currentValue = records.reduce((sum, record) => sum + (record.currentValue ?? 0), 0);
  return <div className="metric-strip" aria-label="Indicadores do recorte selecionado">
    <article><span>Registros</span><strong>{records.length}</strong><small>no recorte atual</small></article>
    <article><span>Em andamento</span><strong>{active}</strong><small>situação publicada</small></article>
    <article className="danger"><span>Paralisadas</span><strong>{paused}</strong><small>pedem justificativa</small></article>
    <article className="warning"><span>Prazo original vencido</span><strong>{overdue}</strong><small>entre as não concluídas</small></article>
    <article className="warning"><span>Aumento acima de 20%</span><strong>{costAlerts}</strong><small>com base comparável</small></article>
    <article><span>Valor atual somado</span><strong>{money(currentValue, true)}</strong><small>apenas valores publicados</small></article>
  </div>;
}

type MapMode = "status" | "deadline" | "cost";

function MapPanel({ records, selected, onSelect, onNeighborhoodSelect }: { records: WorkRecord[]; selected: WorkRecord | null; onSelect: (work: WorkRecord) => void; onNeighborhoodSelect: (name: string) => void }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerLayerRef = useRef<any>(null);
  const polygonLayerRef = useRef<any>(null);
  const geoJsonRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>("status");
  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    let attempts = 0;
    const initialize = () => {
      const L = (window as any).L;
      if (!L || !elementRef.current) {
        attempts += 1;
        if (attempts < 80) window.setTimeout(initialize, 100);
        else setLoadFailed(true);
        return;
      }
      if (mapRef.current) return;
      const map = L.map(elementRef.current, { zoomControl: true, minZoom: 10 }).setView([-26.915, -49.085], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      markerLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      fetch("/data/bairros-blumenau.geojson").then((response) => response.json()).then((geojson) => {
        geoJsonRef.current = geojson;
        setReady(true);
      }).catch(() => setReady(true));
    };
    initialize();
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!ready || !L || !map || !markerLayerRef.current) return;
    markerLayerRef.current.clearLayers();
    if (polygonLayerRef.current) map.removeLayer(polygonLayerRef.current);
    const counts = records.reduce<Record<string, number>>((accumulator, record) => {
      if (record.neighborhood) accumulator[record.neighborhood] = (accumulator[record.neighborhood] ?? 0) + 1;
      return accumulator;
    }, {});
    const maxNeighborhood = Math.max(1, ...Object.values(counts));
    if (geoJsonRef.current) {
      polygonLayerRef.current = L.geoJSON(geoJsonRef.current, {
        style: (feature: any) => {
          const count = counts[feature?.properties?.BAIRROS] ?? 0;
          return { color: "#6f1422", weight: 1, opacity: .5, fillColor: "#f3c84b", fillOpacity: count ? .08 + .34 * count / maxNeighborhood : .015 };
        },
        onEachFeature: (feature: any, layer: any) => {
          const name = feature?.properties?.BAIRROS ?? "Bairro";
          layer.bindTooltip(`<b>${escapeHtml(name)}</b><br>${counts[name] ?? 0} registro(s) · clique para filtrar`, { sticky: true });
          layer.on("click", () => onNeighborhoodSelect(name));
          layer.on("mouseover", () => layer.setStyle({ weight: 3, color: "#991f2f", fillOpacity: .5 }));
          layer.on("mouseout", () => polygonLayerRef.current?.resetStyle(layer));
        },
      }).addTo(map);
      polygonLayerRef.current.bringToBack();
    }
    const points: [number, number][] = [];
    records.forEach((record) => {
      if (record.latitude == null || record.longitude == null) return;
      points.push([record.latitude, record.longitude]);
      const radius = Math.max(5, Math.min(13, 5 + Math.sqrt((record.currentValue ?? 0) / 1_000_000) * 1.6));
      const markerColor = mapMode === "deadline"
        ? (isOverdue(record) ? "#991f2f" : record.status === "Concluída" ? "#237a58" : "#2f6f9f")
        : mapMode === "cost" ? costTone(record.costChange) : (statusColors[record.status] ?? "#665b5d");
      const marker = L.circleMarker([record.latitude, record.longitude], {
        radius: selected?.id === record.id ? radius + 4 : radius,
        color: "#ffffff",
        weight: selected?.id === record.id ? 3 : 1.5,
        fillColor: markerColor,
        fillOpacity: selected?.id === record.id ? 1 : .82,
      });
      marker.bindTooltip(`<b>#${escapeHtml(record.code)}</b> ${escapeHtml(record.name)}<br>${escapeHtml(record.status)} · ${escapeHtml(record.neighborhood ?? "bairro não identificado")}`, { direction: "top" });
      marker.bindPopup(`<b>Obra #${escapeHtml(record.code)}</b><br>${escapeHtml(record.name)}<br><small>${escapeHtml(record.status)} · ${escapeHtml(money(record.currentValue))}</small>`);
      marker.on("click", () => onSelect(record));
      marker.addTo(markerLayerRef.current);
    });
    if (points.length) map.fitBounds(points, { padding: [28, 28], maxZoom: 15 });
  }, [records, selected?.id, onSelect, onNeighborhoodSelect, ready, mapMode, resetSignal]);

  const mapped = records.filter((record) => record.latitude != null && record.longitude != null);
  const overdue = records.filter(isOverdue).length;
  const highCost = records.filter((record) => (record.costChange ?? -Infinity) > 20).length;
  const modeLegend = mapMode === "deadline"
    ? [["#991f2f", "Prazo vencido"], ["#2f6f9f", "Em prazo/sem prazo"], ["#237a58", "Concluída"]]
    : mapMode === "cost"
      ? [["#237a58", "Sem aumento"], ["#d7b440", "Até 20%"], ["#d17818", "20% a 50%"], ["#991f2f", "Acima de 50%"], ["#8d8587", "Sem base"]]
      : [["#d39b18", "Em andamento"], ["#991f2f", "Paralisada"], ["#237a58", "Concluída"]];

  return <section className="map-card" id="mapa" aria-labelledby="map-title">
    <div className="panel-heading">
      <div><span className="section-kicker">Mapa investigativo</span><h2 id="map-title">Onde estão as obras</h2><p>Clique em pontos para abrir a obra e em bairros para filtrar. Troque a leitura entre situação, prazo e custo.</p></div>
      <div className="map-summary"><b>{mapped.length}</b><span>pontos no recorte</span><b>{overdue}</b><span>prazos vencidos</span><b>{highCost}</b><span>altas &gt; 20%</span></div>
    </div>
    <div className="map-toolbar" aria-label="Camadas de análise do mapa">
      <div><span>Colorir por</span>{([['status', 'Situação'], ['deadline', 'Prazo'], ['cost', 'Custo']] as [MapMode, string][]).map(([value, label]) => <button type="button" className={mapMode === value ? "active" : ""} aria-pressed={mapMode === value} onClick={() => setMapMode(value)} key={value}>{label}</button>)}</div>
      <button type="button" onClick={() => setResetSignal((value) => value + 1)}>Reenquadrar recorte</button>
    </div>
    <div className="map-legend" aria-label={`Legenda do mapa por ${mapMode}`}>{modeLegend.map(([color, label]) => <span key={label}><i style={{ background: color }} />{label}</span>)}<span className="legend-size"><i />círculo maior = maior valor</span></div>
    <div className="map-layout">
      <div ref={elementRef} className="leaflet-map" role="application" aria-label="Mapa navegável das obras públicas de Blumenau"><div className="map-loading">{loadFailed ? "Não foi possível carregar o mapa agora. Os filtros, gráficos e tabela continuam disponíveis." : "Carregando mapa público…"}</div></div>
      <aside className="map-inspector" aria-live="polite">
        {selected ? <>
          <span className={`status-pill status-${selected.status === "Concluída" ? "done" : selected.status === "Paralisada" ? "paused" : "progress"}`}>{selected.status}</span>
          <small>Obra #{selected.code}</small><h3>{selected.name}</h3><p>{selected.address} · {selected.neighborhood ?? "Bairro não identificado"}</p>
          <dl><div><dt>Ciclo do contrato</dt><dd>{selected.mandate}</dd></div><div><dt>Execução</dt><dd>{percent(selected.progress)}</dd></div><div><dt>Valor atual</dt><dd>{money(selected.currentValue)}</dd></div><div><dt>Variação</dt><dd>{selected.costChange == null ? "Sem base" : `${selected.costChange > 0 ? "+" : ""}${selected.costChange.toFixed(1)}%`}</dd></div><div><dt>Prazo original</dt><dd>{dateBR(selected.executionLimit)}</dd></div></dl>
          <Link className="button primary" href={`/obras/${selected.id}/${selected.slug}`}>Abrir ficha completa</Link>
        </> : <div className="map-empty"><span>⌖</span><h3>Selecione um ponto</h3><p>Clique em uma obra para conferir contrato, execução, prazo e valor sem sair do contexto do mapa.</p></div>}
      </aside>
    </div>
    <p className="data-caution">468 de 483 pontos caem dentro dos limites oficiais de bairro; 15 permanecem como “não identificado”. Isso evita atribuir bairro por aproximação sem base cartográfica.</p>
  </section>;
}

function MandateChart({ records }: { records: WorkRecord[] }) {
  const mandates = unique(data.records, "mandate");
  const rows = mandates.map((mandate) => {
    const subset = records.filter((record) => record.mandate === mandate);
    return { mandate, total: subset.length, done: subset.filter((record) => record.status === "Concluída").length, active: subset.filter((record) => record.status === "Em Andamento").length, paused: subset.filter((record) => record.status === "Paralisada").length };
  }).filter((row) => row.total);
  return <article className="chart-card chart-wide" id="mandatos">
    <div className="chart-title"><div><span className="section-kicker">Comparação responsável</span><h3>Contratos por ciclo de quatro anos</h3></div><span className="chart-badge">situação atual</span></div>
    <p className="chart-intro">Cada barra reúne contratos assinados no ciclo indicado. As cores mostram como esses registros estão classificados hoje — não como estavam no fim daquele mandato.</p>
    <div className="chart-legend" aria-label="Legenda de situação"><span><i className="legend-done" />Concluída</span><span><i className="legend-progress" />Em andamento</span><span><i className="legend-paused" />Paralisada</span></div>
    <div className="stacked-chart">{rows.map((row) => <div className="stack-row" key={row.mandate}><b>{row.mandate}</b><div className="stack-track" aria-label={`${row.mandate}: ${row.total} registros`}><i className="stack-done" style={{ width: `${row.done / row.total * 100}%` }} /><i className="stack-progress" style={{ width: `${row.active / row.total * 100}%` }} /><i className="stack-paused" style={{ width: `${row.paused / row.total * 100}%` }} /></div><strong>{row.total}</strong><small>{row.done} concluídas · {row.active} em andamento · {row.paused} paralisadas</small></div>)}</div>
  </article>;
}

function CostChart({ records }: { records: WorkRecord[] }) {
  const bands = [
    { label: "Sem base comparável", count: records.filter((record) => record.costChange == null).length, tone: "muted" },
    { label: "Sem aumento", count: records.filter((record) => record.costChange != null && record.costChange <= 0).length, tone: "good" },
    { label: "+0% a 20%", count: records.filter((record) => record.costChange != null && record.costChange > 0 && record.costChange <= 20).length, tone: "neutral" },
    { label: "+20% a 50%", count: records.filter((record) => record.costChange != null && record.costChange > 20 && record.costChange <= 50).length, tone: "warning" },
    { label: "Acima de 50%", count: records.filter((record) => record.costChange != null && record.costChange > 50).length, tone: "danger" },
  ];
  const max = Math.max(1, ...bands.map((band) => band.count));
  return <article className="chart-card" id="custos"><div className="chart-title"><div><span className="section-kicker">Contratos</span><h3>Variação do valor publicado</h3></div></div><p className="chart-intro">Compara valor inicial/base prevista com valor atual. Aumento não prova irregularidade: abra a ficha e procure aditivos e justificativas.</p><div className="chart-legend cost-legend" aria-label="Legenda das faixas de custo">{bands.map((band) => <span key={band.label}><i className={`bar-${band.tone}`} />{band.label}</span>)}</div><div className="horizontal-bars">{bands.map((band) => <div key={band.label}><span>{band.label}</span><div><i className={`bar-${band.tone}`} style={{ width: `${band.count / max * 100}%` }} /></div><b>{band.count}</b></div>)}</div></article>;
}

function SecretariatChart({ records }: { records: WorkRecord[] }) {
  const rows = unique(records, "secretariat").map((secretariat) => {
    const subset = records.filter((record) => record.secretariat === secretariat);
    return { secretariat, count: subset.length, value: subset.reduce((sum, record) => sum + (record.currentValue ?? 0), 0) };
  }).sort((a, b) => b.value - a.value).slice(0, 7);
  const max = Math.max(1, ...rows.map((row) => row.value));
  return <article className="chart-card"><div className="chart-title"><div><span className="section-kicker">Concentração</span><h3>Valor atual por secretaria</h3></div></div><p className="chart-intro">Ranking do recorte atual. Registros sem valor não entram na soma, mas continuam na contagem.</p><div className="chart-key"><i /> barra = valor atual somado <b>N</b> = quantidade de registros</div><div className="agency-bars">{rows.map((row) => <div key={row.secretariat}><b>{row.secretariat}</b><div><i style={{ width: `${row.value / max * 100}%` }} /></div><strong>{money(row.value, true)}</strong><small>{row.count} registros</small></div>)}</div></article>;
}

function ScatterChart({ records }: { records: WorkRecord[] }) {
  const points = records.filter((record) => record.status !== "Concluída" && record.progress != null && record.costChange != null);
  const x = (value: number) => 48 + Math.min(110, Math.max(-10, value)) / 120 * 570;
  const y = (value: number) => 210 - Math.min(100, Math.max(0, value)) / 100 * 170;
  return <article className="chart-card chart-wide"><div className="chart-title"><div><span className="section-kicker">Sinal cruzado</span><h3>Execução física × variação de custo</h3></div><span className="chart-badge">{points.length} obras ativas comparáveis</span></div><p className="chart-intro">Pontos no alto avançaram mais; pontos à direita tiveram maior aumento. Use o gráfico para priorizar perguntas, nunca para concluir irregularidade.</p><div className="chart-legend" aria-label="Legenda do gráfico"><span><i className="legend-progress" />Em andamento</span><span><i className="legend-paused" />Paralisada (ponto maior)</span><span><i className="scatter-guide" />linha de atenção: +20%</span></div><div className="scatter-wrap"><svg viewBox="0 0 660 250" role="img" aria-label="Gráfico de dispersão entre execução e variação de custo"><line x1="48" y1="40" x2="48" y2="210" /><line x1="48" y1="210" x2="618" y2="210" /><line className="guide" x1={x(20)} y1="40" x2={x(20)} y2="210" /><text className="axis-title" x="7" y="25">execução física ↑</text><text className="axis-title" x="470" y="247">variação do custo →</text><text x="8" y="45">100%</text><text x="18" y="214">0%</text><text x="45" y="231">−10%</text><text x={x(20) - 12} y="231">+20%</text><text x="585" y="231">+110%</text>{points.map((record) => <circle key={record.id} cx={x(record.costChange!)} cy={y(record.progress!)} r={record.status === "Paralisada" ? 6 : 4.5} fill={statusColors[record.status] ?? "#d39b18"}><title>{`#${record.code} · ${percent(record.progress)} executado · ${record.costChange!.toFixed(1)}% de variação`}</title></circle>)}</svg></div></article>;
}

type ChatMessage = { role: "citizen" | "machadeiro"; text: string; workIds?: Array<number | string> };

const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
const ignoredSearchWords = new Set(["qual", "quais", "como", "onde", "quando", "porque", "obra", "obras", "sobre", "para", "pela", "pelo", "com", "sem", "uma", "das", "dos", "que", "esta", "essa", "status", "situacao", "dados", "informacoes", "informacao", "nome", "nomes", "liste", "mostrar", "mostre", "fale", "explique", "existem", "fica", "ficam", "rua", "avenida", "rodovia", "estrada", "travessa", "alameda"]);

function findWorks(question: string, records: WorkRecord[]) {
  const normalized = normalizeSearch(question);
  const tokens = normalized.split(" ").filter((token) => token.length >= 3 && !ignoredSearchWords.has(token));
  return records.map((work) => {
    const name = normalizeSearch(work.name);
    const address = normalizeSearch(work.address);
    const neighborhood = normalizeSearch(work.neighborhood ?? "");
    const company = normalizeSearch(work.company ?? "");
    let score = normalized.includes(work.code) ? 30 : 0;
    for (const token of tokens) {
      if (name.includes(token)) score += 4;
      if (address.includes(token)) score += 3;
      if (neighborhood.includes(token)) score += 3;
      if (company.includes(token)) score += 1;
    }
    if (tokens.length > 1 && tokens.every((token) => name.includes(token))) score += 8;
    if (tokens.length > 1 && tokens.every((token) => address.includes(token))) score += 8;
    return { work, score };
  }).filter((result) => result.score > 0).sort((a, b) => b.score - a.score || (b.work.currentValue ?? 0) - (a.work.currentValue ?? 0));
}

function directWorkAnswer(work: WorkRecord, question: string) {
  if (/\b(status|situacao|paralisad|concluid|andamento)\b/.test(question)) return `A obra #${work.code} está com a situação “${work.status}”.`;
  if (/\b(bairro|regiao)\b/.test(question)) return `A obra #${work.code} fica no bairro ${work.neighborhood ?? "não identificado na base"}.`;
  if (/\b(endereco|rua|avenida|onde fica|localizacao)\b/.test(question)) return `O endereço publicado da obra #${work.code} é ${work.address}${work.neighborhood ? `, bairro ${work.neighborhood}` : ""}.`;
  if (/\b(prazo|vence|vencimento|data limite|atras)\b/.test(question)) return `O prazo original publicado da obra #${work.code} é ${dateBR(work.executionLimit)}${isOverdue(work) ? ". Essa data já passou e a obra não está concluída" : ""}.`;
  if (/\b(execucao|avanco|percentual|quanto foi feito)\b/.test(question)) return `A execução física publicada da obra #${work.code} é ${percent(work.progress)}.`;
  if (/\b(empresa|construtora|contratada)\b/.test(question)) return `A empresa publicada para a obra #${work.code} é ${work.company ?? "não informada"}.`;
  if (/\b(contrato|numero do contrato)\b/.test(question)) return `O contrato publicado da obra #${work.code} é ${work.contractNumber ?? "não informado"}, com data ${dateBR(work.contractDate)}.`;
  if (/\b(ciclo|mandato|quatro anos|4 anos)\b/.test(question)) return `A obra #${work.code} pertence ao ciclo contratual ${work.mandate}.`;
  if (/\b(valor inicial|custo inicial|orcamento inicial)\b/.test(question)) return `O valor inicial publicado da obra #${work.code} é ${money(work.initialValue)}.`;
  if (/\b(valor|custo|aumento|aditivo|variacao)\b/.test(question)) return `O valor atual publicado da obra #${work.code} é ${money(work.currentValue)}${work.costChange == null ? ", sem base comparável de variação" : `, com variação de ${work.costChange > 0 ? "+" : ""}${work.costChange.toFixed(1)}%`}.`;
  if (/\b(nome|qual obra)\b/.test(question)) return `O nome publicado do registro #${work.code} é “${work.name}”.`;
  return `Encontrei a obra #${work.code}: “${work.name}”. Pergunte pelo status, endereço, prazo, execução, valor, empresa ou contrato para receber somente esse dado.`;
}

function AnalystPanel({ records, selected, onSelect }: { records: WorkRecord[]; selected: WorkRecord | null; onSelect: (work: WorkRecord) => void }) {
  const active = records.filter((record) => record.status !== "Concluída");
  const overdue = active.filter(isOverdue);
  const highCost = records.filter((record) => (record.costChange ?? -Infinity) > 20);
  const neighborhoods = Object.entries(records.reduce<Record<string, number>>((accumulator, record) => { const key = record.neighborhood ?? "Não identificado"; accumulator[key] = (accumulator[key] ?? 0) + 1; return accumulator; }, {})).sort((a, b) => b[1] - a[1]);
  const top = [...records].filter((record) => record.currentValue != null).sort((a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0))[0];
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "machadeiro", text: "Olá, Analista Cidadão. Respondo somente o que você perguntar e cruzo os 483 registros por obra, bairro, rua, prazo e custo. Exemplos: “qual o status da obra 2471?” ou “qual a obra de maior custo no bairro Garcia?”." },
  ]);

  const answerQuestion = (rawQuestion: string) => {
    const clean = rawQuestion.trim();
    if (!clean) return;
    const normalized = normalizeSearch(clean);
    const rankedMatches = findWorks(clean, records);
    const code = normalized.match(/(?:obra|codigo)\s*#?\s*(\d{3,})\b/)?.[1] ?? clean.match(/#(\d{3,})/)?.[1];
    const streetQuestion = /\b(rua|avenida|av |rodovia|estrada|travessa|alameda)\b/.test(`${normalized} `);
    const neighborhood = unique(records, "neighborhood").find((name) => normalized.includes(normalizeSearch(name)));
    const namedWorkQuestion = /\b(construcao|reforma|revitalizacao|pavimentacao|implantacao|ampliacao|ponte|escola|creche|praca|posto|hospital|ginásio|ginasio)\b/.test(normalized);
    const companyQuestion = /\b(empresa|construtora|contratada)\b/.test(normalized);
    const asksCount = /\b(quantas|quantos|numero|total)\b/.test(normalized);
    const asksNames = /\b(nome|nomes|quais obras|liste|listar)\b/.test(normalized);
    const asksStatus = /\b(status|situacao|paralisad|concluid|andamento)\b/.test(normalized);
    const asksValue = /\b(valor|custo|investimento|gasto|gastos|saldo)\b/.test(normalized);
    const asksHighest = /\b(maior|mais cara|mais caro|mais alto)\b/.test(normalized);
    const asksIncrease = /\b(aumento|aditivo|variacao)\b/.test(normalized);
    const asksSpent = /\b(valor executado|gasto executado|ja gasto|já gasto|desembolsado|pago)\b/.test(normalized);
    let answer = "Não identifiquei ainda qual informação você procura. Posso localizar uma obra pelo nome ou código, listar obras de um bairro ou rua e explicar situação, prazo, execução e custo. Escreva um nome, por exemplo: “obras na Rua Bahia” ou “status da obra 2471”.";
    let responseWorks: WorkRecord[] = [];
    if (/^(oi|ola|bom dia|boa tarde|boa noite)\b/.test(normalized)) {
      answer = "Olá! Eu sou o Machadeiro. Para começar, diga um bairro, uma rua, o nome de uma obra ou seu código. Depois eu explico os dados publicados e mostro o caminho para conferi-la no mapa.";
    } else if (/selecionad|esta obra|essa obra/.test(normalized)) {
      answer = selected
        ? directWorkAnswer(selected, normalized)
        : "Ainda não há uma obra selecionada. Clique em um ponto do mapa ou em “Ver no mapa” na fila de fiscalização.";
      if (selected) responseWorks = [selected];
    } else if (code) {
      const found = records.find((work) => work.code === code || String(work.id) === code);
      if (found) {
        answer = directWorkAnswer(found, normalized);
        responseWorks = [found];
      } else answer = `Não encontrei a obra ou registro ${code} dentro do recorte atual. Limpe os filtros ou confira o número informado.`;
    } else if (/\bbairro\b/.test(normalized) && !neighborhood && asksHighest && asksCount) {
      const totals = Object.entries(records.reduce<Record<string, number>>((accumulator, work) => { const key = work.neighborhood ?? "Não identificado"; accumulator[key] = (accumulator[key] ?? 0) + 1; return accumulator; }, {})).sort((a, b) => b[1] - a[1]);
      answer = totals[0] ? `O bairro com maior quantidade de obras é ${totals[0][0]}, com ${totals[0][1]} registro(s).` : "Não há bairros identificados neste recorte.";
    } else if (/\bbairro\b/.test(normalized) && !neighborhood && asksHighest && asksValue) {
      const totals = Object.entries(records.reduce<Record<string, number>>((accumulator, work) => { const key = work.neighborhood ?? "Não identificado"; accumulator[key] = (accumulator[key] ?? 0) + (work.currentValue ?? 0); return accumulator; }, {})).sort((a, b) => b[1] - a[1]);
      answer = totals[0] ? `O bairro com maior valor atual somado é ${totals[0][0]}, com ${money(totals[0][1])}.` : "Não há valores publicados para comparar bairros neste recorte.";
    } else if (streetQuestion && !rankedMatches.length && asksHighest && asksValue) {
      const totals = Object.entries(records.reduce<Record<string, number>>((accumulator, work) => { const key = work.address || "Endereço não informado"; accumulator[key] = (accumulator[key] ?? 0) + (work.currentValue ?? 0); return accumulator; }, {})).sort((a, b) => b[1] - a[1]);
      answer = totals[0] ? `O endereço com maior valor atual somado é ${totals[0][0]}, com ${money(totals[0][1])}.` : "Não há valores publicados para comparar endereços neste recorte.";
    } else if (streetQuestion) {
      responseWorks = rankedMatches.slice(0, 5).map(({ work }) => work);
      if (!responseWorks.length) answer = "Não encontrei esse endereço no recorte atual. Tente escrever apenas o nome principal da rua, sem número ou abreviações.";
      else if (asksCount && !asksValue) answer = `Há ${rankedMatches.length} obra(s) relacionadas ao endereço informado.`;
      else if (asksHighest && asksIncrease) { const highest = [...responseWorks].sort((a, b) => (b.costChange ?? -Infinity) - (a.costChange ?? -Infinity))[0]; answer = highest ? `A maior variação de custo nesse endereço é da obra #${highest.code} — ${highest.name}: ${percent(highest.costChange)}.` : "Não há variação de custo comparável nesse endereço."; responseWorks = highest ? [highest] : []; }
      else if (asksHighest) { const highest = [...rankedMatches].sort((a, b) => (b.work.currentValue ?? 0) - (a.work.currentValue ?? 0))[0]?.work; answer = highest ? `A obra de maior valor nesse endereço é #${highest.code} — ${highest.name}, com ${money(highest.currentValue)}.` : "Não há valores publicados nesse endereço."; responseWorks = highest ? [highest] : []; }
      else if (asksSpent) answer = `O valor executado publicado das obras relacionadas ao endereço soma ${money(rankedMatches.reduce((sum, item) => sum + (item.work.executedValue ?? 0), 0))}.`;
      else if (asksValue) answer = `O valor atual publicado das obras relacionadas ao endereço soma ${money(rankedMatches.reduce((sum, item) => sum + (item.work.currentValue ?? 0), 0))}.`;
      else if (asksStatus) answer = `Nesse endereço, há ${rankedMatches.filter((item) => item.work.status === "Em Andamento").length} obra(s) em andamento, ${rankedMatches.filter((item) => item.work.status === "Paralisada").length} paralisada(s) e ${rankedMatches.filter((item) => item.work.status === "Concluída").length} concluída(s).`;
      else if (asksNames) answer = `Obras encontradas: ${responseWorks.map((work) => `#${work.code} — ${work.name}`).join("; ")}${rankedMatches.length > 5 ? `; e mais ${rankedMatches.length - 5}` : ""}.`;
      else answer = `Encontrei ${rankedMatches.length} obra(s) relacionadas ao endereço. Escolha um resultado abaixo ou pergunte especificamente por quantidade, nomes, status ou valor.`;
    } else if (neighborhood) {
      const subset = records.filter((work) => work.neighborhood === neighborhood);
      const statusCount = { active: subset.filter((work) => work.status === "Em Andamento").length, paused: subset.filter((work) => work.status === "Paralisada").length, done: subset.filter((work) => work.status === "Concluída").length };
      responseWorks = [...subset].sort((a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0)).slice(0, 5);
      if (asksCount && !asksValue) answer = `O bairro ${neighborhood} possui ${subset.length} obra(s) no recorte atual.`;
      else if (asksHighest && asksIncrease) { const highest = [...subset].filter((work) => work.costChange != null).sort((a, b) => (b.costChange ?? 0) - (a.costChange ?? 0))[0]; answer = highest ? `A maior variação de custo no bairro ${neighborhood} é da obra #${highest.code} — ${highest.name}: ${percent(highest.costChange)}.` : `Não há variação de custo comparável no bairro ${neighborhood}.`; responseWorks = highest ? [highest] : []; }
      else if (asksHighest) { const highest = [...subset].sort((a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0))[0]; answer = highest ? `A obra de maior valor no bairro ${neighborhood} é #${highest.code} — ${highest.name}, com ${money(highest.currentValue)}.` : `Não há valores publicados no bairro ${neighborhood}.`; responseWorks = highest ? [highest] : []; }
      else if (asksSpent) answer = `O valor executado publicado das obras do bairro ${neighborhood} soma ${money(subset.reduce((sum, work) => sum + (work.executedValue ?? 0), 0))}.`;
      else if (asksValue) answer = `O valor atual publicado das obras do bairro ${neighborhood} soma ${money(subset.reduce((sum, work) => sum + (work.currentValue ?? 0), 0))}.`;
      else if (asksStatus) answer = `No bairro ${neighborhood}, há ${statusCount.active} obra(s) em andamento, ${statusCount.paused} paralisada(s) e ${statusCount.done} concluída(s).`;
      else if (asksNames) answer = `Obras de maior valor no bairro ${neighborhood}: ${responseWorks.map((work) => `#${work.code} — ${work.name}`).join("; ")}${subset.length > 5 ? `; e mais ${subset.length - 5}` : ""}.`;
      else answer = `Encontrei ${subset.length} obra(s) no bairro ${neighborhood}. Pergunte especificamente por quantidade, nomes, status ou valor para uma resposta direta.`;
    } else if ((namedWorkQuestion || companyQuestion) && rankedMatches[0]?.score >= 4) {
      const bestScore = rankedMatches[0].score;
      responseWorks = rankedMatches.filter((match) => match.score >= Math.max(4, bestScore - 4)).slice(0, 5).map(({ work }) => work);
      answer = responseWorks.length === 1
        ? directWorkAnswer(responseWorks[0], normalized)
        : `Encontrei ${rankedMatches.length} obra(s) relacionadas ao nome informado. As mais próximas são: ${responseWorks.map((work) => `#${work.code} — ${work.name}, ${work.status.toLowerCase()}, em ${work.neighborhood ?? "bairro não identificado"}`).join("; ")}.`;
    } else if (/compar|ciclo|mandato|quatro anos|4 anos/.test(normalized)) {
      const comparison = unique(records, "mandate").map((mandate) => {
        const subset = records.filter((record) => record.mandate === mandate);
        const unfinished = subset.filter((record) => record.status !== "Concluída").length;
        const value = subset.reduce((sum, record) => sum + (record.currentValue ?? 0), 0);
        return `${mandate}: ${subset.length} contratos, ${unfinished} não concluídos e ${money(value, true)} em valor atual`;
      });
      answer = comparison.length ? `Comparação do recorte atual — ${comparison.join("; ")}. Lembrete: o ciclo é definido pela data do contrato, não atribui sozinho responsabilidade política.` : "Não há contratos no recorte atual para comparar.";
    } else if (/paralis/.test(normalized)) {
      const paused = [...records].filter((record) => record.status === "Paralisada").sort((a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0));
      responseWorks = paused.slice(0, 5);
      answer = `${paused.length} obra(s) estão publicadas como paralisadas neste recorte: ${responseWorks.map((work) => `#${work.code} — ${work.name}, em ${work.neighborhood ?? "bairro não identificado"}`).join("; ")}. Para cobrar uma resposta, peça o motivo formal da paralisação, o termo de suspensão e a nova previsão de retomada.`;
    } else if (/concluid/.test(normalized)) {
      const done = records.filter((record) => record.status === "Concluída");
      responseWorks = [...done].sort((a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0)).slice(0, 5);
      answer = `${done.length} obra(s) estão publicadas como concluídas neste recorte. As cinco de maior valor atual são: ${responseWorks.map((work) => `#${work.code} — ${work.name}, em ${work.neighborhood ?? "bairro não identificado"}`).join("; ")}. “Concluída” é a situação publicada hoje; confira a ficha para datas, medições e entrega.`;
    } else if (/andamento|em curso/.test(normalized)) {
      const underway = records.filter((record) => record.status === "Em Andamento");
      responseWorks = [...underway].sort((a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0)).slice(0, 5);
      answer = `${underway.length} obra(s) estão em andamento neste recorte. As cinco de maior valor atual são: ${responseWorks.map((work) => `#${work.code} — ${work.name}, ${percent(work.progress)} de execução, em ${work.neighborhood ?? "bairro não identificado"}`).join("; ")}. Use prazo e avanço para formular perguntas ao órgão responsável.`;
    } else if (/prazo|vencid|atras/.test(normalized)) {
      responseWorks = [...overdue].sort((a, b) => String(a.executionLimit).localeCompare(String(b.executionLimit))).slice(0, 5);
      answer = `${overdue.length} obra(s) não concluídas têm a data limite original anterior à coleta (${dateBR(data.collectedAt)}). Exemplos: ${responseWorks.map((work) => `#${work.code} — ${work.name}, prazo ${dateBR(work.executionLimit)}`).join("; ")}. Isso é um sinal para pedir aditivo, suspensão ou cronograma atualizado — não prova atraso irregular.`;
    } else if (/custo|valor|aumento|aditivo/.test(normalized) && !/maior|mais cara|mais alto/.test(normalized)) {
      responseWorks = [...highCost].sort((a, b) => (b.costChange ?? 0) - (a.costChange ?? 0)).slice(0, 5);
      answer = `${highCost.length} registro(s) têm aumento publicado acima de 20%. Maiores variações: ${responseWorks.map((work) => `#${work.code} — ${work.name}, ${work.costChange?.toFixed(1)}%`).join("; ")}. Compare valor inicial, atual, aditivos e mudanças de escopo; aumento isolado não comprova irregularidade.`;
    } else if (/bairro|regiao|onde/.test(normalized) && !/maior|mais cara|mais alto/.test(normalized)) {
      answer = neighborhoods.length ? `${neighborhoods[0][0]} concentra mais registros no recorte: ${neighborhoods[0][1]}. Quantidade não equivale a investimento; use o mapa e compare também valor e tipo de intervenção.` : "Nenhum bairro aparece no recorte atual.";
    } else if (/maior|mais cara|milhao/.test(normalized)) {
      answer = top ? `A obra de maior valor atual no recorte é #${top.code}, “${top.name}”, com ${money(top.currentValue)}. Ela está ${top.status.toLowerCase()} e pertence ao ciclo ${top.mandate}.` : "Não há valores publicados no recorte atual.";
      if (top) responseWorks = [top];
    } else if (/execucao|avanco|fisica/.test(normalized)) {
      const informed = active.filter((record) => record.progress != null);
      const low = informed.filter((record) => (record.progress ?? 100) <= 25).sort((a, b) => (a.progress ?? 0) - (b.progress ?? 0));
      responseWorks = low.slice(0, 5);
      answer = `${informed.length} obra(s) ativas informam execução física; ${low.length} estão entre 0% e 25%. Exemplos de baixo avanço: ${responseWorks.map((work) => `#${work.code} — ${work.name}, ${percent(work.progress)}`).join("; ")}. Cruze avanço, prazo e medições antes de cobrar uma explicação.`;
    } else if (/nome|listar|liste|mostre/.test(normalized) && /obra/.test(normalized)) {
      responseWorks = records.slice(0, 5);
      answer = `O recorte atual contém ${records.length} obra(s). As primeiras na base são: ${responseWorks.map((work) => `#${work.code} — ${work.name}, ${work.status.toLowerCase()}, em ${work.neighborhood ?? "bairro não identificado"}`).join("; ")}. Para refinar, informe um bairro, rua, situação ou parte do nome.`;
    }
    setMessages((current) => [...current.slice(-8), { role: "citizen", text: clean }, { role: "machadeiro", text: answer, workIds: responseWorks.map((work) => work.id) }]);
    setQuestion("");
  };

  return <aside className="analyst-panel" aria-labelledby="analyst-title">
    <div className="analyst-head"><Image unoptimized priority className="machadeiro-avatar" src="/machadeiro.png" width={84} height={84} alt="Ícone do Machadeiro com um machado" /><div><small>Seu assistente de dados públicos</small><h2 id="analyst-title">Machadeiro</h2><p>Você é o <b>Analista Cidadão</b></p></div><span className="analysis-live">recorte atualizado</span></div>
    {selected && <div className="analyst-selection"><small>Obra selecionada</small><b>#{selected.code} · {selected.status}</b><p>{selected.progress == null ? "Execução física não informada" : `${percent(selected.progress)} de execução física`}; {selected.costChange == null ? "sem base comparável de custo" : `${selected.costChange > 0 ? "+" : ""}${selected.costChange.toFixed(1)}% no valor publicado`}.</p></div>}
    <div className="machadeiro-body"><div className="insight-list">
      <article><span>01</span><div><b>{overdue.length} candidatas a prazo vencido</b><p>A data limite original já passou e a obra não está concluída. Pode haver aditivo, suspensão ou atualização não refletida no campo.</p></div></article>
      <article><span>02</span><div><b>{highCost.length} variações acima de 20%</b><p>Priorize a leitura dos aditivos e compare o objeto contratado com o objeto efetivamente entregue.</p></div></article>
      <article><span>03</span><div><b>{neighborhoods[0]?.[0] ?? "—"} concentra {neighborhoods[0]?.[1] ?? 0} registros</b><p>Quantidade não equivale a investimento nem a benefício social. Compare também valores, população e tipo de intervenção.</p></div></article>
      {top && <article><span>04</span><div><b>Maior valor no recorte: {money(top.currentValue, true)}</b><p>Obra #{top.code}. Valores altos merecem acompanhamento de medições, entregas e alterações contratuais.</p></div></article>}
    </div><div className="machadeiro-chat"><div className="chat-history" aria-live="polite">{messages.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><small>{message.role === "machadeiro" ? "Machadeiro" : "Analista Cidadão"}</small><p>{message.text}</p>{message.role === "machadeiro" && Boolean(message.workIds?.length) && <div className="chat-work-results">{message.workIds?.map((workId) => { const work = records.find((item) => String(item.id) === String(workId)); return work ? <button type="button" key={workId} onClick={() => onSelect(work)}><b>#{work.code}</b><span>{work.name}</span><em>Ver no mapa →</em></button> : null; })}</div>}</div>)}</div>
    <div className="question-builder"><small>Pergunte aos dados deste recorte</small><div className="prompt-chips">{["Qual o status da obra 2471?", "Maior custo no bairro Garcia", "Valor total no bairro Garcia", "Total gasto na Rua Bahia", "Quais estão paralisadas?", "Compare os ciclos"].map((prompt) => <button type="button" onClick={() => answerQuestion(prompt)} key={prompt}>{prompt}</button>)}</div><form onSubmit={(event) => { event.preventDefault(); answerQuestion(question); }}><label htmlFor="machadeiro-question" className="sr-only">Pergunta para o Machadeiro</label><input id="machadeiro-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ex.: qual a obra de maior custo no bairro Garcia?" /><button type="submit">Perguntar</button></form></div></div></div>
    {top && <button type="button" className="machadeiro-map-action" onClick={() => onSelect(top)}>Mostrar a obra de maior valor no mapa</button>}
    <p className="analyst-disclaimer">O Machadeiro lê os campos publicados e responde com cálculos do recorte. Não acusa irregularidade, não substitui auditoria e pode refletir dados desatualizados na fonte.</p>
  </aside>;
}

function PriorityTable({ records, onSelect }: { records: WorkRecord[]; onSelect: (work: WorkRecord) => void }) {
  const ranked = [...records].map((record) => {
    const overdue = record.status !== "Concluída" && Boolean(record.executionLimit && record.executionLimit < data.collectedAt.slice(0, 10));
    const score = (record.status === "Paralisada" ? 5 : 0) + (overdue ? 3 : 0) + ((record.costChange ?? 0) > 20 ? 2 : 0) + ((record.progress ?? 100) < 25 && record.status !== "Concluída" ? 1 : 0);
    return { record, score, overdue };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || (b.record.currentValue ?? 0) - (a.record.currentValue ?? 0)).slice(0, 12);
  return <section className="priority-section" aria-labelledby="priority-title"><div className="panel-heading"><div><span className="section-kicker">Fila de fiscalização</span><h2 id="priority-title">Sinais que merecem documentos</h2><p>Ordenação transparente por paralisação, prazo original vencido, aumento acima de 20% e baixo avanço. É triagem, não acusação.</p></div><Link href="/metodologia">Ver regra completa →</Link></div><div className="priority-table-wrap"><table><thead><tr><th>Obra</th><th>Situação</th><th>Prazo original</th><th>Execução</th><th>Variação</th><th>Valor atual</th><th></th></tr></thead><tbody>{ranked.map(({ record, overdue }) => <tr key={record.id}><td><small>#{record.code} · {record.neighborhood ?? "bairro não identificado"}</small><Link href={`/obras/${record.id}/${record.slug}`}>{record.name}</Link></td><td><span className={`status-pill status-${record.status === "Concluída" ? "done" : record.status === "Paralisada" ? "paused" : "progress"}`}>{record.status}</span></td><td className={overdue ? "cell-alert" : ""}>{dateBR(record.executionLimit)}{overdue && <small>data original vencida</small>}</td><td>{percent(record.progress)}</td><td className={(record.costChange ?? 0) > 20 ? "cell-alert" : ""}>{record.costChange == null ? "Sem base" : `${record.costChange > 0 ? "+" : ""}${record.costChange.toFixed(1)}%`}</td><td>{money(record.currentValue)}</td><td><button type="button" onClick={() => onSelect(record)}>Ver no mapa</button></td></tr>)}</tbody></table>{!ranked.length && <p className="empty-state">Nenhum sinal no recorte atual.</p>}</div></section>;
}

export function CitizenDashboard({ mode = "full" }: { mode?: "full" | "map" | "mandates" }) {
  const [filters, setFilters] = useState(initialFilters);
  const [selected, setSelected] = useState<WorkRecord | null>(null);
  const records = useMemo(() => data.records.filter((work) => matchesFilters(work, filters)), [filters]);
  const selectWork = useCallback((work: WorkRecord) => {
    setSelected(work);
    document.getElementById("mapa")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const selectNeighborhood = useCallback((name: string) => {
    setFilters((current) => ({ ...current, neighborhood: name }));
  }, []);
  return <div className={`citizen-dashboard mode-${mode}`}>
    <FilterBar filters={filters} setFilters={setFilters} count={records.length} />
    <MetricStrip records={records} />
    {mode !== "mandates" && <MapPanel records={records} selected={selected} onSelect={setSelected} onNeighborhoodSelect={selectNeighborhood} />}
    {mode !== "map" && <section className="analytics-section" aria-labelledby="analytics-title"><div className="panel-heading"><div><span className="section-kicker">Painel analítico</span><h2 id="analytics-title">O que o recorte revela</h2><p>Todos os gráficos respondem aos filtros. Passe o cursor nos pontos e compare contagem, valor, avanço e situação.</p></div></div><div className="dashboard-grid"><MandateChart records={records} /><CostChart records={records} /><SecretariatChart records={records} /><ScatterChart records={records} /></div><AnalystPanel records={records} selected={selected} onSelect={selectWork} /></section>}
    <PriorityTable records={records} onSelect={selectWork} />
  </div>;
}
