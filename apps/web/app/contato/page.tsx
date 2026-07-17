"use client";
import { FormEvent, useState } from "react";
import { SiteShell } from "../site-shell";

export default function ContactPage(){
  const [message,setMessage]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=event.currentTarget;
    const data=Object.fromEntries(new FormData(form));
    try{
      const response=await fetch(`${process.env.NEXT_PUBLIC_API_URL||"http://localhost:8000/api/v1"}/contacts`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...data,consent:true})});
      if(!response.ok)throw new Error();
      setMessage(`Mensagem recebida. Protocolo: ${(await response.json()).protocol}`);
      form.reset();
    }catch{
      setMessage("O canal de envio está temporariamente indisponível. Use os canais oficiais da Prefeitura e informe o código da obra.");
    }
  }
  return <SiteShell><div className="page-head"><p className="eyebrow">Participação cidadã</p><h1>Contato, colaboração e correções</h1><p>Informe erros, peça dados para pesquisa ou relate uma barreira de acessibilidade. Não envie dados pessoais desnecessários.</p></div><section className="content-card"><form className="contact-form" onSubmit={submit}><label>Nome<input name="name" required minLength={2}/></label><label>E-mail<input name="email" type="email" required/></label><label>Categoria<select name="category" required><option value="">Selecione</option><option>Informação incorreta</option><option>Documento incorreto</option><option>Obra ausente</option><option>Problema de acessibilidade</option><option>Dúvida de pesquisa</option></select></label><label>Assunto<input name="subject" required/></label><label>Mensagem<textarea name="message" required minLength={10}></textarea></label><label className="consent"><input type="checkbox" required/> Concordo com o uso destes dados apenas para responder a solicitação.</label><button className="button primary">Enviar mensagem</button>{message&&<div className="answer" role="status">{message}</div>}</form><aside className="callout"><b>Fortaleça a solicitação</b><p>Inclua o código EngeGOV, número do contrato, campo questionado e data da consulta.</p></aside></section></SiteShell>;
}
