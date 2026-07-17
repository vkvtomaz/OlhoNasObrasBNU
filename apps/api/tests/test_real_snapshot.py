import hashlib
import json
from pathlib import Path


API_SNAPSHOT = Path(__file__).parents[1] / "app" / "data" / "engegov-snapshot.json"
WEB_SNAPSHOT = Path(__file__).parents[2] / "web" / "app" / "engegov-snapshot.json"


def test_real_snapshot_is_complete_and_shared_with_web():
    assert API_SNAPSHOT.read_bytes() == WEB_SNAPSHOT.read_bytes()
    snapshot = json.loads(API_SNAPSHOT.read_text(encoding="utf-8"))
    assert snapshot["declaredTotals"] == {
        "inProgress": 105,
        "completed": 371,
        "paused": 7,
        "total": 483,
    }
    assert snapshot["collectedTotals"]["total"] == 483
    assert len(snapshot["works"]) == 483
    assert sum(bool(work.get("contract", {}).get("date")) for work in snapshot["works"]) >= 480
    assert sum(bool(work.get("location", {}).get("latitude")) for work in snapshot["works"]) == 483
    assert sum(bool(work.get("location", {}).get("neighborhood")) for work in snapshot["works"]) == 468
    assert snapshot["geographicCoverage"]["markers"] == 483
    assert not any("detailError" in work for work in snapshot["works"])


def test_snapshot_record_hashes_are_reproducible():
    snapshot = json.loads(API_SNAPSHOT.read_text(encoding="utf-8"))
    for work in snapshot["works"]:
        expected = work["contentHash"]
        payload = {key: value for key, value in work.items() if key != "contentHash"}
        canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True).encode()
        assert hashlib.sha256(canonical).hexdigest() == expected


def test_map_marker_parser_reads_official_google_map_script():
    from app.ingestion.engegov_connector import _parse_map_markers

    fragment = (
        'new google.maps.Marker({position:new google.maps.LatLng(-26.919143,-49.060146),'
        'map:map,title:"REVISÃO DA PASSARELA",icon:"marker_orange.png"});'
    )
    assert _parse_map_markers(fragment) == [
        {
            "latitude": -26.919143,
            "longitude": -49.060146,
            "title": "REVISÃO DA PASSARELA",
        }
    ]
