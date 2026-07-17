from datetime import date
from collections import defaultdict


def delay_days(end: date | None, reference: date | None = None) -> int | None:
    if not end:
        return None
    return max(0, ((reference or date.today()) - end).days)


def cost_change(initial: float | None, current: float | None) -> float | None:
    if not initial or current is None:
        return None
    return round((current - initial) / initial * 100, 2)


def physical_financial_gap(physical: float, financial: float) -> float:
    return round(financial - physical, 2)


def mandate_for_year(year: int) -> tuple[int, int]:
    """Return the four-year municipal term containing a year.

    Brazilian municipal terms used here begin in 2021, 2025, 2029, etc.
    The term is an analytical time window, not an attribution of blame or merit.
    """
    start = 2021 + ((year - 2021) // 4) * 4
    return start, start + 3


def cohort_summary(works: list) -> list[dict]:
    """Group the same universe of works by effective start year."""
    groups: dict[int, dict] = defaultdict(
        lambda: {"started": 0, "completed": 0, "active": 0, "paused": 0}
    )
    for work in works:
        if not work.start_effective:
            continue
        year = work.start_effective.year
        groups[year]["started"] += 1
        if work.completion_real:
            groups[year]["completed"] += 1
        elif work.official_status == "Paralisada":
            groups[year]["paused"] += 1
        else:
            groups[year]["active"] += 1
    return [{"start_year": year, **values} for year, values in sorted(groups.items())]


def mandate_summary(works: list, current_term: tuple[int, int]) -> list[dict]:
    """Summarize events per term while preserving inherited works."""
    terms: dict[tuple[int, int], dict] = defaultdict(
        lambda: {"contracted": 0, "completed": 0, "received": 0, "left_active": 0}
    )
    for work in works:
        if work.contract_date:
            term = mandate_for_year(work.contract_date.year)
            terms[term]["contracted"] += 1
        if work.completion_real:
            terms[mandate_for_year(work.completion_real.year)]["completed"] += 1
        if work.inherited:
            terms[current_term]["received"] += 1
    for term, values in terms.items():
        term_end = date(term[1], 12, 31)
        values["left_active"] = sum(
            bool(w.start_effective)
            and w.start_effective <= term_end
            and (not w.completion_real or w.completion_real > term_end)
            for w in works
        )
    return [
        {"mandate_start": term[0], "mandate_end": term[1], **values}
        for term, values in sorted(terms.items())
    ]
