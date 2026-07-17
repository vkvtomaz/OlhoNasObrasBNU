import Link from "next/link";
import { CitizenDashboard } from "./citizen-dashboard";
import { dateTimeBR, snapshot } from "./data";
import { SiteShell } from "./site-shell";

export function PortalHome() {
  return <SiteShell>
    <div className="flag-ribbon" aria-hidden="true"><i /><i /><i /><i /><i /></div>
    <section className="observatory-hero">
      <div className="hero-main">
        <p className="eyebrow">Observatório cidadão · Blumenau</p>
        <h1>Obra pública<br />sob os olhos de <em>todos.</em></h1>
        <p className="hero-lead">Localize contratos no mapa, compare ciclos de quatro anos e identifique sinais de prazo, custo e execução. Dados difíceis viram perguntas públicas verificáveis.</p>
        <div className="hero-cta"><a className="button primary" href="#painel">Explorar o painel</a><Link className="button ghost" href="/obras">Consultar todas as obras</Link></div>
        <div className="hero-proof"><span><b>483</b> registros reais</span><span><b>483</b> coordenadas publicadas</span><span><b>35</b> bairros oficiais</span><span><b>2014–2026</b> contratos na base</span></div>
      </div>
      <aside className="hero-brief">
        <div className="brief-top"><span className="live-dot">Fotografia pública</span><small>{dateTimeBR(snapshot.collectedAt)}</small></div>
        <strong>Não compare<br /><em>estoque</em> com fluxo.</strong>
        <p>As 371 concluídas se acumulam desde 2020 no painel — e há contratos anteriores. Já “em andamento” e “paralisadas” mostram apenas a situação atual.</p>
        <div className="brief-numbers"><div><b>105</b><span>em andamento</span></div><div><b>7</b><span>paralisadas</span></div><div><b>371</b><span>concluídas no histórico</span></div></div>
        <a href={snapshot.sourceUrl} target="_blank" rel="noreferrer">Conferir o EngeGOV oficial ↗</a>
      </aside>
    </section>

    <section className="interpretation-band" aria-labelledby="interpretation-title">
      <span>Como ler</span><h2 id="interpretation-title">Um mandato não “ganha” uma obra só porque o contrato começou nele.</h2><p>Há obras que atravessam eleições, recebem aditivos e mudam de situação. Por isso, o portal agrupa pelo ano do contrato e mantém visível que a situação é a publicada hoje.</p>
    </section>

    <div id="painel"><CitizenDashboard /></div>

    <section className="source-method-strip">
      <div><span className="section-kicker">Rastreabilidade</span><h2>Veja, questione, confirme.</h2></div>
      <ol><li><b>1</b><span><strong>Encontre o sinal</strong>Use mapa, filtros e gráficos para recortar.</span></li><li><b>2</b><span><strong>Abra a ficha</strong>Confira contrato, medições e datas.</span></li><li><b>3</b><span><strong>Cobre com precisão</strong>Informe código, documento, valor e prazo.</span></li></ol>
      <Link className="button light" href="/ajuda">Como fiscalizar</Link>
    </section>
  </SiteShell>;
}
