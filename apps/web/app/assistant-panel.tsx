"use client";

import { FormEvent, useState } from "react";

type Props = { total: number; active: number; completed: number; paused: number; costAlerts: number };

export function AssistantPanel({ total, active, completed, paused, costAlerts }: Props) {
  const [open, setOpen] = useState(true);
  const [answer, setAnswer] = useState("Pergunte sobre prazos, custos, mandatos ou sobre como fiscalizar uma obra.");

  function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = new FormData(event.currentTarget).get("question")?.toString().toLowerCase() ?? "";
    if (question.includes("quant") || question.includes("total")) {
      setAnswer(`A fotografia coletada tem ${total} registros: ${active} em andamento, ${completed} concluídos e ${paused} paralisados. Concluídos são um estoque histórico; ativos são a situação atual.`);
    } else if (question.includes("custo") || question.includes("valor") || question.includes("aditiv")) {
      setAnswer(`${costAlerts} contratos têm aumento calculado acima de 20% entre o valor inicial e o atual. Isso é uma triagem: reajuste, reequilíbrio e mudança de escopo precisam ser conferidos nos documentos.`);
    } else if (question.includes("mandato") || question.includes("prefeit") || question.includes("elei")) {
      setAnswer("A comparação de quatro em quatro anos usa a data do contrato para formar coortes. Uma obra pode atravessar governos; por isso o portal não atribui automaticamente toda a obra a um prefeito.");
    } else if (question.includes("prazo") || question.includes("atras")) {
      setAnswer("Compare a data limite de execução e o término do contrato com a data de corte. Antes de cobrar, verifique aditivos, suspensões e reinícios: o alerta matemático não substitui os documentos.");
    } else {
      setAnswer("Posso explicar a fotografia atual, os ciclos de quatro anos, aumentos de custo e prazos. Para uma resposta específica, inclua o código da obra e consulte a ficha correspondente.");
    }
  }

  return <aside className={`ai-rail ${open ? "open" : "closed"}`} aria-label="Assistente inteligente do portal">
    <button className="ai-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
      <span aria-hidden="true">✦</span>{open ? "Fechar IA" : "Abrir IA"}
    </button>
    {open && <div className="ai-body">
      <div className="ai-heading"><span className="ai-orb" aria-hidden="true">IA</span><div><b>Fiscaliza Blumenau</b><small>Assistente com respostas controladas</small></div></div>
      <p className="ai-answer" aria-live="polite">{answer}</p>
      <form onSubmit={ask}><label htmlFor="ai-question">O que você quer entender?</label><textarea id="ai-question" name="question" placeholder="Ex.: por que concluídas são mais?" required /><button>Consultar os dados</button></form>
      <div className="ai-chips" aria-label="Perguntas sugeridas">
        {["Quantas estão ativas?", "Como comparar mandatos?", "O que indica aumento de custo?"].map((question) => <button key={question} type="button" onClick={() => {
          if (question.startsWith("Quantas")) setAnswer(`Há ${active} obras em andamento e ${paused} paralisadas na fotografia atual.`);
          else if (question.includes("mandatos")) setAnswer("Use coortes de contrato 2017–2020, 2021–2024 e 2025–2028. Compare obras contratadas no mesmo ciclo e mantenha visível quando atravessaram governos.");
          else setAnswer(`${costAlerts} registros superam 20% de diferença entre valor inicial e atual. Abra a ficha e cobre a justificativa documental.`);
        }}>{question}</button>)}
      </div>
      <small className="ai-notice">A assistente explica dados publicados e não conclui ilegalidade.</small>
    </div>}
  </aside>;
}
