from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.alerts.rules import explainable_alert
from app.analytics.indicators import cohort_summary, mandate_summary
from app.core.database import get_db
from app.models import Contact, Work
from app.schemas import AssistantIn, ContactIn, WorkOut

router = APIRouter(prefix="/api/v1")


@router.get("/works", response_model=list[WorkOut])
def works(
    status: str | None = None,
    neighborhood: str | None = None,
    q: str | None = Query(None, max_length=120),
    db: Session = Depends(get_db),
):
    query = db.query(Work)
    if status:
        query = query.filter(Work.official_status == status)
    if neighborhood:
        query = query.filter(Work.neighborhood == neighborhood)
    if q:
        query = query.filter(Work.name.ilike(f"%{q}%"))
    return query.order_by(Work.updated_at.desc()).all()


@router.get("/works/{work_id}", response_model=WorkOut)
def work(work_id: int, db: Session = Depends(get_db)):
    item = db.get(Work, work_id)
    if not item:
        raise HTTPException(404, "Obra não localizada")
    return item


@router.get("/indicators")
def indicators(db: Session = Depends(get_db)):
    items = db.query(Work).all()

    def count(status_name: str) -> int:
        return sum(w.official_status == status_name for w in items)

    return {
        "period": "Fotografia atual da fonte pública",
        "updated_at": max((w.updated_at for w in items), default=datetime.now(timezone.utc)),
        "total": len(items),
        "in_progress": count("Em andamento"),
        "completed": count("Concluída"),
        "paused": count("Paralisada"),
        "bidding": count("Em licitação"),
        "overdue": sum("vencido" in w.calculated_status.lower() for w in items),
        "source": "Portal EngeGOV — Município de Blumenau",
    }


@router.get("/alerts")
def alerts(db: Session = Depends(get_db)):
    return [
        {"work_id": w.id, "work": w.name, **alert}
        for w in db.query(Work).all()
        if (alert := explainable_alert(w))
    ]


@router.get("/analytics/cohorts")
def cohorts(db: Session = Depends(get_db)):
    return {
        "definition": "Obras agrupadas pelo ano de início efetivo; não compara acumulado histórico com fotografia atual.",
        "reference_date": "2026-07-15",
        "items": cohort_summary(db.query(Work).all()),
    }


@router.get("/analytics/mandates")
def mandates(db: Session = Depends(get_db)):
    return {
        "definition": "Mandatos organizam eventos em janelas de quatro anos e não atribuem culpa ou mérito automaticamente.",
        "reference_date": "2026-07-15",
        "items": mandate_summary(db.query(Work).all(), (2025, 2028)),
    }


@router.post("/contacts", status_code=201)
def contact(data: ContactIn, db: Session = Depends(get_db)):
    if not data.consent:
        raise HTTPException(422, "Consentimento necessário")
    protocol = f"OBRAS-{datetime.now():%Y%m%d}-{str(uuid4())[:6].upper()}"
    db.add(Contact(protocol=protocol, **data.model_dump(exclude={"consent"})))
    db.commit()
    return {"protocol": protocol, "message": "Mensagem recebida"}


@router.post("/assistant")
def assistant(data: AssistantIn):
    q = data.question.lower()
    if "aditivo" in q:
        answer = "Termo aditivo é um documento que registra uma mudança formal no contrato, como prazo, valor ou escopo. A mudança, sozinha, não comprova irregularidade."
    elif "mapa" in q or "bairro" in q:
        answer = "Use Mapa no menu e escolha um bairro. A lista textual abaixo do mapa oferece as mesmas obras para quem navega por teclado ou leitor de tela."
    elif "atras" in q or "prazo" in q:
        answer = "O portal separa o prazo original do prazo atualizado. Um alerta de prazo pede verificação e deve ser lido junto aos aditivos e períodos de suspensão."
    else:
        answer = "Não encontrei essa informação na fotografia do EngeGOV. Posso ajudar a localizar obras, explicar prazos, custos, documentos ou formular um pedido de esclarecimento."
    return {
        "answer": answer,
        "confidence": "controlada",
        "source": "/metodologia",
        "updated_at": "2026-07-16",
        "notice": "A assistente não substitui órgãos de controle e não realiza julgamento jurídico.",
    }
