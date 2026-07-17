import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the citizen portal", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /De Olho nas Obras/);
  assert.match(html, /483 registros e coordenadas/i);
  assert.match(html, /Obra pública/i);
  assert.match(html, /Mapa investigativo/i);
  assert.match(html, /Cruze as informações/i);
  assert.match(html, /Analista Cidadão/i);
  assert.match(html, /Machadeiro/i);
  assert.match(html, /Pergunte aos dados deste recorte/i);
  assert.match(html, /Contratos por ciclo de quatro anos/i);
  assert.doesNotMatch(html, /sintétic|fictíci|demonstrativ/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("metadata and language are site-specific", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /pt-BR/);
  assert.match(layout, /Mapa e painel cidadão/);
  assert.match(layout, /leaflet@1\.9\.4/);
  assert.doesNotMatch(layout, /Starter Project/);
});

test("dashboard ships the complete real geographic dataset", async () => {
  const dashboard = JSON.parse(await readFile(new URL("../app/dashboard-data.json", import.meta.url), "utf8"));
  const neighborhoods = JSON.parse(await readFile(new URL("../public/data/bairros-blumenau.geojson", import.meta.url), "utf8"));
  assert.equal(dashboard.records.length, 483);
  assert.equal(dashboard.records.filter((work) => Number.isFinite(work.latitude) && Number.isFinite(work.longitude)).length, 483);
  assert.equal(dashboard.records.filter((work) => work.neighborhood).length, 468);
  assert.equal(neighborhoods.features.length, 35);
  assert.deepEqual([...new Set(dashboard.records.map((work) => work.mandate))].sort(), ["2013–2016", "2017–2020", "2021–2024", "2025–2028", "Data não informada"].sort());
  assert.equal(dashboard.records.some((work) => work.mandate.includes("?")), false);
  await access(new URL("../public/machadeiro.png", import.meta.url));
});

test("dedicated map, dashboard and mandate routes render", async () => {
  for (const path of ["/mapa", "/painel", "/mandatos"]) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.match(html, /Cruze as informações/i, path);
  }
});
