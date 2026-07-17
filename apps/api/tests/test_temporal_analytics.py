from datetime import date
from types import SimpleNamespace

from app.analytics.indicators import cohort_summary, cost_change, mandate_for_year, mandate_summary


def work(**overrides):
    values = {
        "start_effective": date(2023, 1, 10),
        "contract_date": date(2022, 12, 1),
        "completion_real": None,
        "official_status": "Em andamento",
        "inherited": False,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def test_mandates_are_four_year_windows():
    assert mandate_for_year(2024) == (2021, 2024)
    assert mandate_for_year(2025) == (2025, 2028)


def test_cohort_uses_start_year_and_same_universe():
    items = cohort_summary(
        [
            work(completion_real=date(2024, 5, 1)),
            work(official_status="Paralisada"),
            work(start_effective=date(2025, 2, 1)),
        ]
    )
    assert items[0] == {"start_year": 2023, "started": 2, "completed": 1, "active": 0, "paused": 1}
    assert items[1]["start_year"] == 2025


def test_inherited_work_is_counted_as_received_not_new_contract():
    items = mandate_summary(
        [
            work(contract_date=date(2023, 8, 1), inherited=True),
            work(contract_date=date(2025, 2, 1), start_effective=date(2025, 3, 1)),
        ],
        (2025, 2028),
    )
    current = next(item for item in items if item["mandate_start"] == 2025)
    assert current["received"] == 1
    assert current["contracted"] == 1


def test_cost_change_is_mathematical_triage_only():
    assert cost_change(100, 120) == 20
