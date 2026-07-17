"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export function SiteShell({children}:{children:React.ReactNode}) {
  const [contrast,setContrast]=useState(false);
  const [scale,setScale]=useState(100);
  const [menu,setMenu]=useState(false);
  useEffect(()=>{document.documentElement.dataset.contrast=contrast?"high":"";document.documentElement.style.fontSize=`${scale}%`},[contrast,scale]);
  return <>
    <a className="skip" href="#conteudo">Pular para o conteúdo</a>
    <div className="official-source-banner" role="status"><span aria-hidden="true">●</span><strong>Base pública real:</strong> 483 registros e coordenadas do EngeGOV, coletados em 16/07/2026. Confira sempre a fonte oficial.</div>
    <header className="topbar">
      <Link className="brand" href="/" aria-label="De Olho nas Obras, página inicial"><span className="brand-mark" aria-hidden="true"><i></i><b>BO</b></span><span><b>De Olho nas Obras</b><small>Blumenau · fiscalização cidadã</small></span></Link>
      <button className="menu-button" onClick={()=>setMenu(!menu)} aria-expanded={menu} aria-controls="menu">Menu</button>
      <nav id="menu" className={menu?"nav open":"nav"} aria-label="Navegação principal"><Link href="/painel">Painel</Link><Link href="/mapa">Mapa</Link><Link href="/obras">Obras</Link><Link href="/mandatos">Mandatos</Link><Link href="/prazos-e-custos">Custos e prazos</Link><Link href="/metodologia">Metodologia</Link><Link href="/ajuda">Fiscalize</Link></nav>
      <div className="access-tools" aria-label="Ferramentas de acessibilidade"><button onClick={()=>setScale(Math.max(90,scale-10))} aria-label="Diminuir texto">A−</button><button onClick={()=>setScale(Math.min(130,scale+10))} aria-label="Aumentar texto">A+</button><button onClick={()=>setContrast(!contrast)} aria-pressed={contrast}>Contraste</button></div>
    </header>
    <main id="conteudo">{children}</main>
    <footer><div><b>De Olho nas Obras</b><p>Observatório cidadão independente de Blumenau. Dados públicos explicados com contexto, método e ligação para a fonte.</p></div><div><Link href="/mapa">Mapa</Link><Link href="/mandatos">Mandatos</Link><Link href="/acessibilidade">Acessibilidade</Link><Link href="/fontes">Fontes oficiais</Link><Link href="/contato">Correções</Link></div><p className="footer-note">Alertas são triagens matemáticas, não acusações. Valores, prazos e situações podem ser atualizados pelo órgão responsável; confirme os documentos oficiais antes de concluir.</p></footer>
  </>;
}
