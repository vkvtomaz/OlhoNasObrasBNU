def explainable_alert(work) -> dict | None:
    gap = None
    if work.financial_progress is not None and work.physical_progress is not None:
        gap = work.financial_progress - work.physical_progress
    if gap is not None and gap >= 20:
        return {
            "severity": "attention",
            "title": "Diferença físico-financeira identificada",
            "explanation": f"O avanço financeiro supera o físico em {gap:.0f} pontos percentuais.",
            "limitation": "O indicador pede verificação documental e não comprova irregularidade.",
        }
    if "vencido" in work.calculated_status.lower():
        return {
            "severity": "attention",
            "title": "Prazo informado aparentemente vencido",
            "explanation": "A data atual ultrapassa o término disponível.",
            "limitation": "Pode haver aditivo ou suspensão ainda não localizado.",
        }
    return None
