import Link from "next/link";
import { costChange, dateBR, dateTimeBR, money, snapshot, statusClass, works } from "../data";
import { SiteShell } from "../site-shell";

export const metadata = { title: "Obras públicas de Blumenau" };

export default async function ObrasPage({searchParams}:{searchParams:Promise<{q?:string;status?:string}>}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLocaleLowerCase("pt-BR");
  const status = params.status ?? "Todas";
  const filtered = works.filter((work) => {
    const haystack = `${work.code} ${work.name} ${work.address} ${work.secretariat} ${work.contract.number ?? ""}`.toLocaleLowerCase("pt-BR");
    return (!query || haystack.includes(query)) && (status === "Todas" || work.status === status);
  });
  return <SiteShell>
    <div className="page-head civic-page-head"><p className="eyebrow">Consulta auditável</p><h1>Obras e serviços publicados</h1><p>{filtered.length} de {works.length} registros. Situação, contrato e valores vêm da fotografia do EngeGOV coletada em {dateTimeBR(snapshot.collectedAt)}.</p></div>
    <section className="list-controls" aria-label="Filtros da lista"><form><label>Buscar<input name="q" defaultValue={params.q} placeholder="Código, obra, rua ou contrato" /></label><label>Situação<select name="status" defaultValue={status}><option>Todas</option><option>Em Andamento</option><option>Concluída</option><option>Paralisada</option></select></label><button className="button primary">Aplicar filtros</button></form><a href={snapshot.sourceUrl} target="_blank" rel="noreferrer">Abrir a fonte oficial ↗</a></section>
    <div className="table-wrap works-table"><table><caption>{filtered.length} registros encontrados · valores “não informados” não entram em somas ou alertas</caption><thead><tr><th>Código e obra</th><th>Situação atual</th><th>Contrato / ciclo</th><th>Execução</th><th>Valor inicial</th><th>Valor atual</th><th>Variação</th><th>Prazo original</th></tr></thead><tbody>{filtered.map((work) => {const change=costChange(work);return <tr key={work.id}><td><small>#{work.code} · {work.secretariat}</small><Link href={`/obras/${work.id}/${work.slug}`}><b>{work.name}</b></Link><small>{work.address} · {work.intervention}</small></td><td><span className={`status ${statusClass(work.status)}`}>{work.status}</span></td><td>{work.contract.number ?? "Não informado"}<small>{dateBR(work.contract.date)} · ciclo {work.mandate}</small></td><td>{work.physicalProgress == null ? "Não informada" : `${work.physicalProgress.toLocaleString("pt-BR")}%`}</td><td>{money(work.initialValue)}</td><td>{money(work.currentValue)}</td><td className={change != null && change > 20 ? "cost-warning" : ""}>{change == null ? "—" : `${change > 0 ? "+" : ""}${change.toFixed(1)}%`}</td><td>{dateBR(work.contract.executionLimit)}</td></tr>})}</tbody></table>{!filtered.length&&<p className="empty-state">Nenhum registro corresponde aos filtros.</p>}</div>
  </SiteShell>;
}
