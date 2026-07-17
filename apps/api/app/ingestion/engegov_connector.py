"""Coletor auditável para o portal público EngeGOV de Blumenau.

O portal usa JSF/PrimeFaces. A coleta reproduz somente as requisições de leitura
da tabela e da ficha exibidas pelo navegador, com intervalo entre requisições.
Nenhuma autenticação, CAPTCHA ou área restrita é acessada.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import html
import json
import re
import unicodedata
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from .base_connector import BaseConnector, RawRecord


TABLE_ID = "frmListaObras:tblListaObras"
FORM_ID = "frmListaObras"
DETAIL_IDS = (
    "frmAndamentoObra",
    "frmDadosContratoObra",
    "frmDadosMedicoesObra",
    "frmInfObraEmRevisao",
)
MAP_FORM_ID = "frmMapaObras"
MAP_COMPONENT_ID = "frmMapaObras:gmapObras"
NEIGHBORHOODS_URL = (
    "https://geo.blumenau.sc.gov.br/server/rest/services/Limites/Bairros/MapServer/0/query"
)


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = re.sub(r"\s+", " ", value).strip(" \t\r\n:")
    return cleaned or None


def _find(pattern: str, text: str) -> str | None:
    match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
    return _clean(match.group(1)) if match else None


def _money(value: str | None) -> float | None:
    if not value or value.lower().startswith("não cadastrado"):
        return None
    normalized = re.sub(r"[^0-9,.-]", "", value).replace(".", "").replace(",", ".")
    try:
        return round(float(normalized), 2)
    except ValueError:
        return None


def _percent(value: str | None) -> float | None:
    return _money(value)


def _iso_date(value: str | None) -> str | None:
    if not value:
        return None
    match = re.search(r"\b(\d{2})/(\d{2})/(\d{4})\b", value)
    return f"{match.group(3)}-{match.group(2)}-{match.group(1)}" if match else None


def _slug(text: str, code: str) -> str:
    normalized = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    words = re.sub(r"[^a-zA-Z0-9]+", "-", normalized).strip("-").lower()
    return f"{words[:90].rstrip('-')}-{code}"


def _update_map(response_text: str) -> dict[str, str]:
    root = ET.fromstring(response_text)
    updates: dict[str, str] = {}
    for node in root.findall(".//update"):
        update_id = node.attrib.get("id")
        if update_id:
            updates[update_id] = node.text or ""
    return updates


def _view_state(updates: dict[str, str], current: str) -> str:
    return updates.get("javax.faces.ViewState", current)


def _parse_rows(fragment: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(f"<table><tbody>{fragment}</tbody></table>", "html.parser")
    result: list[dict[str, Any]] = []
    for row in soup.select("tr[data-rk]"):
        cells = [_clean(cell.get_text(" ", strip=True)) or "" for cell in row.select("td")]
        if len(cells) < 6:
            continue
        code = row.get("data-rk") or cells[0]
        result.append(
            {
                "id": int(code) if str(code).isdigit() else code,
                "code": str(code),
                "slug": _slug(cells[2], str(code)),
                "secretariat": cells[1],
                "name": cells[2],
                "address": cells[3],
                "intervention": cells[4],
                "officialStatus": cells[5].title(),
            }
        )
    return result


def _parse_map_markers(fragment: str) -> list[dict[str, Any]]:
    """Extrai os pontos publicados pelo próprio mapa JSF do EngeGOV."""
    pattern = re.compile(
        r"new google\.maps\.Marker\(\{position:new google\.maps\.LatLng\("
        r"(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\).*?title:\"((?:\\.|[^\"])*)\"",
        flags=re.DOTALL,
    )
    markers: list[dict[str, Any]] = []
    for latitude, longitude, raw_title in pattern.findall(fragment):
        try:
            title = json.loads(f'"{raw_title}"')
        except json.JSONDecodeError:
            title = raw_title.replace(r'\"', '"')
        markers.append(
            {
                "latitude": float(latitude),
                "longitude": float(longitude),
                "title": _clean(html.unescape(title)) or "",
            }
        )
    return markers


def _point_in_ring(longitude: float, latitude: float, ring: list[list[float]]) -> bool:
    inside = False
    previous = ring[-1]
    for current in ring:
        x1, y1 = previous[:2]
        x2, y2 = current[:2]
        crosses = (y1 > latitude) != (y2 > latitude)
        if crosses and longitude < (x2 - x1) * (latitude - y1) / (y2 - y1) + x1:
            inside = not inside
        previous = current
    return inside


def _point_in_geometry(longitude: float, latitude: float, geometry: dict[str, Any]) -> bool:
    coordinates = geometry.get("coordinates") or []
    polygons = [coordinates] if geometry.get("type") == "Polygon" else coordinates
    for polygon in polygons:
        if polygon and _point_in_ring(longitude, latitude, polygon[0]):
            if not any(_point_in_ring(longitude, latitude, hole) for hole in polygon[1:]):
                return True
    return False


def _assign_neighborhoods(works: list[dict[str, Any]], geojson: dict[str, Any]) -> int:
    matched = 0
    for work in works:
        location = work.get("location") or {}
        latitude = location.get("latitude")
        longitude = location.get("longitude")
        if latitude is None or longitude is None:
            continue
        for feature in geojson.get("features", []):
            if _point_in_geometry(longitude, latitude, feature.get("geometry") or {}):
                properties = feature.get("properties") or {}
                location["neighborhood"] = properties.get("BAIRROS")
                location["neighborhoodCode"] = properties.get("CD_BAIRRO")
                matched += 1
                break
    return matched


def _fragment_text(fragment: str) -> str:
    soup = BeautifulSoup(fragment, "html.parser")
    return _clean(soup.get_text("\n", strip=True)) or ""


def _parse_detail(updates: dict[str, str]) -> dict[str, Any]:
    contract_text = _fragment_text(updates.get("frmDadosContratoObra", ""))
    progress_text = _fragment_text(updates.get("frmAndamentoObra", ""))
    measurement_text = _fragment_text(updates.get("frmDadosMedicoesObra", ""))
    review_text = _fragment_text(updates.get("frmInfObraEmRevisao", ""))

    contract_value = _money(
        _find(r"Valor Total Contratado\s*:?\s*(?:R\$\s*)?([\d.,]+)", contract_text)
    )
    progress_contract_value = _money(
        _find(r"Valor Total Contratado\s*(?:R\$\s*)?([\d.,]+)", progress_text)
    )

    measurements: list[dict[str, Any]] = []
    pattern = re.compile(
        r"N[ÚU]MERO DA MEDIÇÃO\s*:?\s*(\d+).*?"
        r"Percentual Medido\s*:?\s*([\d.,]+)%?.*?"
        r"Valor Medido\s*:?\s*(?:R\$\s*)?([\d.,]+).*?"
        r"DATA DA MEDIÇÃO\s*:?\s*(\d{2}/\d{2}/\d{4}).*?"
        r"Percentual Acumulado\s*:?\s*([\d.,]+)%?.*?"
        r"Valor Acumulado\s*:?\s*(?:R\$\s*)?([\d.,]+)",
        flags=re.IGNORECASE | re.DOTALL,
    )
    for match in pattern.finditer(measurement_text):
        measurements.append(
            {
                "number": int(match.group(1)),
                "percentMeasured": _percent(match.group(2)),
                "measuredValue": _money(match.group(3)),
                "date": _iso_date(match.group(4)),
                "accumulatedPercent": _percent(match.group(5)),
                "accumulatedValue": _money(match.group(6)),
            }
        )

    return {
        "contract": {
            "company": _find(r"Empresa\s*:?\s*(.*?)\s+CNPJ", contract_text),
            "cnpj": _find(r"CNPJ\s*:?\s*([\d./-]+)", contract_text),
            "procurementNumber": _find(
                r"Número da licitação\s*:?\s*(.*?)\s+Número do Contrato", contract_text
            ),
            "number": _find(r"Número do Contrato\s*:?\s*(.*?)\s+Data do Contrato", contract_text),
            "date": _iso_date(_find(r"Data do Contrato\s*:?\s*(\d{2}/\d{2}/\d{4})", contract_text)),
            "serviceOrder": _find(r"N[º°]\s*Ordem de Serviço\s*:?\s*(.*?)\s+Valor Total", contract_text),
            "initialValue": contract_value or progress_contract_value,
            "startDate": _iso_date(_find(r"Início da obra\s*:?\s*(\d{2}/\d{2}/\d{4})", contract_text)),
            "executionLimit": _iso_date(
                _find(r"Data Limite Execução\s*:?\s*(\d{2}/\d{2}/\d{4})", contract_text)
            ),
            "contractEnd": _iso_date(
                _find(r"Término Contrato\s*:?\s*(\d{2}/\d{2}/\d{4})", contract_text)
            ),
            "resourceType": _find(r"Tipo de Recurso\s*:?\s*(.*?)\s+Local da obra", contract_text),
        },
        "execution": {
            "contractedValue": progress_contract_value or contract_value,
            "executedValue": _money(
                _find(r"Valor Executado \(Medido\)\s*(?:R\$\s*)?([\d.,]+)", progress_text)
            ),
            "balance": _money(_find(r"Saldo do Contrato\s*(?:R\$\s*)?([\d.,]+)", progress_text)),
            "percentExecuted": _percent(
                _find(r"Percentual Executado\s*([\d.,]+)%?", progress_text)
            ),
            "forecastValue": _money(
                _find(r"Valor Total Previsto\s*(?:R\$\s*)?([\d.,]+)", progress_text)
            ),
            "addedValue": _money(
                _find(r"Valor Total Aditivado\s*(?:R\$\s*)?([\d.,]+)", progress_text)
            ),
            "currentValue": _money(
                _find(r"Valor Total Atual\s*(?:R\$\s*)?([\d.,]+)", progress_text)
            ),
            # Paralisações e justificativas ficam em diálogos auxiliares do JSF.
            # O HTML parcial também carrega valores antigos desses diálogos; por
            # isso eles não são atribuídos à obra sem um vínculo documental claro.
        },
        "measurements": measurements,
        "reviewNotice": review_text or None,
    }


class EngegovConnector(BaseConnector):
    source_name = "Portal EngeGOV — Município de Blumenau"
    base_url = "https://engegov.blumenau.sc.gov.br/portal-engegov/dashboard.xhtml?cidade=4898"

    def __init__(
        self,
        *,
        verify_tls: bool = True,
        page_size: int = 100,
        request_delay: float = 0.25,
        include_details: bool = True,
    ) -> None:
        self.verify_tls = verify_tls
        self.page_size = page_size
        self.request_delay = request_delay
        self.include_details = include_details

    async def collect(self) -> list[RawRecord]:
        snapshot = await self.collect_snapshot()
        collected_at = datetime.fromisoformat(snapshot["collectedAt"])
        return [
            RawRecord(
                source=self.source_name,
                collected_at=collected_at,
                content_hash=item["contentHash"],
                payload=item,
            )
            for item in snapshot["works"]
        ]

    async def collect_snapshot(self) -> dict[str, Any]:
        headers = {"User-Agent": "SiteObras-cidadao/1.0 (coleta publica e identificada)"}
        async with httpx.AsyncClient(
            verify=self.verify_tls,
            timeout=httpx.Timeout(45),
            follow_redirects=True,
            headers=headers,
        ) as client:
            initial = await client.get(self.base_url)
            initial.raise_for_status()
            soup = BeautifulSoup(initial.text, "html.parser")
            view = soup.select_one('input[name="javax.faces.ViewState"]')
            form = soup.select_one(f"#{FORM_ID}")
            if not view or not form:
                raise RuntimeError("Estrutura JSF do EngeGOV não encontrada")
            view_state = str(view.get("value"))
            action_url = urljoin(self.base_url, str(form.get("action") or self.base_url))

            totals = {
                "inProgress": int(_find(r"Obras em andamento\s*(\d+)", soup.get_text(" ", strip=True)) or 0),
                "completed": int(_find(r"Obras concluídas\s*(\d+)", soup.get_text(" ", strip=True)) or 0),
                "paused": int(_find(r"Obras paralisadas\s*(\d+)", soup.get_text(" ", strip=True)) or 0),
            }
            total = sum(totals.values())
            works: list[dict[str, Any]] = []

            for first in range(0, total, self.page_size):
                payload = self._pagination_payload(view_state, first)
                response = await client.post(action_url, data=payload, headers=self._ajax_headers())
                response.raise_for_status()
                updates = _update_map(response.text)
                view_state = _view_state(updates, view_state)
                works.extend(_parse_rows(updates.get(TABLE_ID, "")))
                await asyncio.sleep(self.request_delay)

            deduplicated = {str(item["code"]): item for item in works}
            works = list(deduplicated.values())

            # Um único evento de leitura devolve todos os marcadores oficiais.
            map_response = await client.post(
                action_url,
                data=self._map_payload(view_state),
                headers=self._ajax_headers(),
            )
            map_response.raise_for_status()
            map_updates = _update_map(map_response.text)
            view_state = _view_state(map_updates, view_state)
            markers = _parse_map_markers(map_updates.get(MAP_COMPONENT_ID, ""))
            markers_by_title: dict[str, list[dict[str, Any]]] = {}
            for marker in markers:
                markers_by_title.setdefault(marker["title"].casefold(), []).append(marker)
            for index, item in enumerate(works):
                candidates = markers_by_title.get(item["name"].casefold(), [])
                marker = candidates.pop(0) if candidates else (markers[index] if index < len(markers) else None)
                if marker:
                    item["location"] = {
                        "latitude": marker["latitude"],
                        "longitude": marker["longitude"],
                        "neighborhood": None,
                        "neighborhoodCode": None,
                        "source": "Mapa de Obras do EngeGOV",
                    }

            neighborhoods_matched = 0
            try:
                boundary_response = await client.get(
                    NEIGHBORHOODS_URL,
                    params={
                        "where": "1=1",
                        "outFields": "BAIRROS,CD_BAIRRO",
                        "returnGeometry": "true",
                        "outSR": "4326",
                        "f": "geojson",
                        "geometryPrecision": "5",
                        "maxAllowableOffset": "0.00008",
                    },
                )
                boundary_response.raise_for_status()
                neighborhoods_matched = _assign_neighborhoods(works, boundary_response.json())
            except (httpx.HTTPError, json.JSONDecodeError, ValueError):
                # Coordenadas do EngeGOV continuam válidas mesmo se o serviço
                # cartográfico municipal estiver temporariamente indisponível.
                neighborhoods_matched = 0

            if self.include_details:
                for index, item in enumerate(works, start=1):
                    try:
                        payload = self._detail_payload(view_state, str(item["code"]))
                        response = await client.post(action_url, data=payload, headers=self._ajax_headers())
                        response.raise_for_status()
                        updates = _update_map(response.text)
                        view_state = _view_state(updates, view_state)
                        item.update(_parse_detail(updates))
                    except (httpx.HTTPError, ET.ParseError, ValueError) as exc:
                        item["detailError"] = f"{type(exc).__name__}: ficha não coletada"
                    if index < len(works):
                        await asyncio.sleep(self.request_delay)

            collected_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
            for item in works:
                item["sourceUrl"] = self.base_url
                item["collectedAt"] = collected_at
                canonical = json.dumps(item, ensure_ascii=False, sort_keys=True).encode()
                item["contentHash"] = hashlib.sha256(canonical).hexdigest()

            status_counts: dict[str, int] = {}
            for item in works:
                status = item["officialStatus"]
                status_counts[status] = status_counts.get(status, 0) + 1

            return {
                "schemaVersion": 1,
                "source": self.source_name,
                "sourceUrl": self.base_url,
                "collectedAt": collected_at,
                "tlsVerification": self.verify_tls,
                "declaredTotals": {**totals, "total": total},
                "collectedTotals": {"total": len(works), "byStatus": status_counts},
                "methodology": {
                    "unit": "registro de obra/serviço exibido pelo EngeGOV",
                    "currentSnapshot": "situação publicada na data da coleta",
                    "historicalWarning": "concluídas é estoque acumulado; em andamento e paralisadas são fotografia atual",
                    "requestDelaySeconds": self.request_delay,
                },
                "geographicCoverage": {
                    "markers": len(markers),
                    "neighborhoodsMatched": neighborhoods_matched,
                    "pointsSource": "Mapa de Obras do EngeGOV",
                    "boundariesSource": "Prefeitura de Blumenau — serviço cartográfico de bairros",
                    "boundariesUrl": NEIGHBORHOODS_URL,
                },
                "works": works,
            }

    def _pagination_payload(self, view_state: str, first: int) -> dict[str, str]:
        return {
            "javax.faces.partial.ajax": "true",
            "javax.faces.source": TABLE_ID,
            "javax.faces.partial.execute": TABLE_ID,
            "javax.faces.partial.render": TABLE_ID,
            TABLE_ID: TABLE_ID,
            f"{TABLE_ID}_pagination": "true",
            f"{TABLE_ID}_first": str(first),
            f"{TABLE_ID}_rows": str(self.page_size),
            f"{TABLE_ID}_skipChildren": "true",
            f"{TABLE_ID}_encodeFeature": "true",
            FORM_ID: FORM_ID,
            "javax.faces.ViewState": view_state,
        }

    @staticmethod
    def _map_payload(view_state: str) -> dict[str, str]:
        return {
            "javax.faces.partial.ajax": "true",
            "javax.faces.source": f"{MAP_FORM_ID}:console",
            "javax.faces.partial.execute": f"{MAP_FORM_ID}:console",
            "javax.faces.partial.render": f"{MAP_COMPONENT_ID} {MAP_FORM_ID}:pnlNumObrasMapa",
            "javax.faces.behavior.event": "change",
            "javax.faces.partial.event": "change",
            MAP_FORM_ID: MAP_FORM_ID,
            f"{MAP_FORM_ID}:console": "4",
            "javax.faces.ViewState": view_state,
        }

    @staticmethod
    def _detail_payload(view_state: str, row_key: str) -> dict[str, str]:
        return {
            "javax.faces.partial.ajax": "true",
            "javax.faces.source": TABLE_ID,
            "javax.faces.partial.execute": TABLE_ID,
            "javax.faces.partial.render": " ".join(DETAIL_IDS),
            "javax.faces.behavior.event": "rowSelect",
            "javax.faces.partial.event": "rowSelect",
            FORM_ID: FORM_ID,
            f"{TABLE_ID}_selection": row_key,
            f"{TABLE_ID}_instantSelectedRowKey": row_key,
            "javax.faces.ViewState": view_state,
        }

    @staticmethod
    def _ajax_headers() -> dict[str, str]:
        return {
            "Faces-Request": "partial/ajax",
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        }


async def _main() -> None:
    parser = argparse.ArgumentParser(description="Coleta pública do EngeGOV Blumenau")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--page-size", type=int, default=100)
    parser.add_argument("--delay", type=float, default=0.25)
    parser.add_argument("--without-details", action="store_true")
    parser.add_argument(
        "--insecure-tls",
        action="store_true",
        help="Usar somente quando a cadeia de certificados da fonte não validar no ambiente",
    )
    args = parser.parse_args()
    connector = EngegovConnector(
        verify_tls=not args.insecure_tls,
        page_size=max(5, min(args.page_size, 100)),
        request_delay=max(args.delay, 0.05),
        include_details=not args.without_details,
    )
    snapshot = await connector.collect_snapshot()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "output": str(args.output),
                "collected": snapshot["collectedTotals"],
                "details": not args.without_details,
                "tlsVerification": snapshot["tlsVerification"],
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    asyncio.run(_main())
