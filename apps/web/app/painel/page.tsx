import { CitizenDashboard } from "../citizen-dashboard";
import { SiteShell } from "../site-shell";

export const metadata = { title: "Painel inteligente de obras" };

export default function Painel() {
  return <SiteShell><div className="page-head compact-head"><p className="eyebrow">Observatório cidadão</p><h1>Painel inteligente</h1><p>Uma leitura integrada de localização, ciclos de quatro anos, prazos, custos e execução física — com filtros que atualizam toda a análise.</p></div><CitizenDashboard /></SiteShell>;
}
