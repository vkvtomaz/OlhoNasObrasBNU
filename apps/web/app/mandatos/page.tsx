import { CitizenDashboard } from "../citizen-dashboard";
import { SiteShell } from "../site-shell";

export const metadata = { title: "Obras e ciclos de quatro anos" };

export default function Mandatos() {
  return <SiteShell><div className="page-head compact-head"><p className="eyebrow">Comparação sem atalho político</p><h1>Contratos por ciclos de quatro anos</h1><p>Os registros são agrupados pela data do contrato. A situação exibida é a atual; isso permite acompanhar travessias entre mandatos sem atribuir automaticamente mérito ou responsabilidade.</p></div><CitizenDashboard mode="mandates" /></SiteShell>;
}
