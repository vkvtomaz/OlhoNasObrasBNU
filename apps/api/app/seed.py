"""Carrega a fotografia pública do EngeGOV no banco local."""

import json
from datetime import date, datetime
from pathlib import Path

from app.core.database import SessionLocal, engine
from app.models import Base, Contract, Document, Work

SNAPSHOT = Path(__file__).resolve().parent / "data" / "engegov-snapshot.json"


def parsed_date(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


def mandate_for(value: str | None) -> tuple[int | None, int | None]:
    if not value:
        return None, None
    year = int(value[:4])
    start = 2021 + ((year - 2021) // 4) * 4
    return start, start + 3


def calculated_status(status: str, deadline: date | None, collected: date) -> str:
    if status == "Concluída":
        return "Concluída segundo a fonte"
    if status == "Paralisada":
        return "Paralisada segundo a fonte — verificar motivo e documentos"
    if deadline and deadline < collected:
        return "Data limite original vencida — verificar aditivos e suspensões"
    return "Ativa sem alerta de prazo original"


def seed() -> None:
    Base.metadata.create_all(engine)
    snapshot = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    collected_at = datetime.fromisoformat(snapshot["collectedAt"])
    collected_date = collected_at.date()
    db = SessionLocal()
    try:
        # Elimina somente os exemplos da versão anterior.
        for item in db.query(Work).filter(Work.is_demo.is_(True)).all():
            db.delete(item)
        db.flush()

        for index, row in enumerate(snapshot["works"], start=1):
            contract = row.get("contract") or {}
            execution = row.get("execution") or {}
            mandate_start, mandate_end = mandate_for(contract.get("date"))
            deadline = parsed_date(contract.get("executionLimit"))
            work = db.query(Work).filter(Work.source_code == str(row["code"])).one_or_none()
            if work is None:
                work = Work(id=index, slug=row["slug"])
                db.add(work)
            work.source_code = str(row["code"])
            work.slug = row["slug"]
            work.name = row["name"]
            work.purpose = row["intervention"]
            work.neighborhood = row["address"]
            work.official_status = row["officialStatus"]
            work.calculated_status = calculated_status(row["officialStatus"], deadline, collected_date)
            work.initial_value = execution.get("forecastValue") or contract.get("initialValue") or execution.get("contractedValue")
            work.current_value = execution.get("currentValue") or execution.get("contractedValue") or work.initial_value
            work.paid_value = execution.get("executedValue")
            work.physical_progress = execution.get("percentExecuted")
            work.financial_progress = (
                round(float(work.paid_value) / float(work.current_value) * 100, 2)
                if work.paid_value is not None and work.current_value
                else None
            )
            work.contract_date = parsed_date(contract.get("date"))
            work.start_effective = parsed_date(contract.get("startDate"))
            work.original_end = deadline
            work.updated_end = parsed_date(contract.get("contractEnd"))
            work.completion_real = None
            work.mandate_start = mandate_start
            work.mandate_end = mandate_end
            work.inherited = row["officialStatus"] != "Concluída" and bool(contract.get("date") and contract["date"] < "2025-01-01")
            work.updated_at = collected_at
            work.source_name = snapshot["source"]
            work.is_demo = False
            db.flush()
            work.contracts.clear()
            work.documents.clear()
            if contract.get("number") or contract.get("company"):
                work.contracts.append(Contract(number=contract.get("number") or "Não informado", contractor=contract.get("company") or "Não informada"))
            work.documents.append(Document(title="Ficha pública no EngeGOV", kind="Fonte primária", source_url=row["sourceUrl"], sha256=row["contentHash"]))
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
