import { CitizenDashboard } from "../citizen-dashboard";
import { SiteShell } from "../site-shell";

export const metadata = { title: "Mapa interativo das obras" };

export default function Mapa() {
  return <SiteShell><div className="page-head compact-head"><p className="eyebrow">483 coordenadas publicadas</p><h1>Mapa das obras</h1><p>Filtre por situação, bairro, ciclo, custo, prazo e execução. Clique em qualquer ponto para abrir a ficha pública correspondente.</p></div><CitizenDashboard mode="map" /></SiteShell>;
}
