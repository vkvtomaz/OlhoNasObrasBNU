# Arquitetura

O monorepo separa apresentação, regras e integrações. `apps/web` contém rotas públicas Next.js/TypeScript; `apps/api` contém API FastAPI, serviços, regras analíticas e persistência SQLAlchemy. PostgreSQL/PostGIS é a fonte tratada; conectores preservam registros brutos antes da normalização. Redis fica disponível para cache e tarefas futuras.

Fluxo: fonte pública → conector isolado → registro bruto imutável → normalização → banco tratado → indicadores/alertas → API → interface. Nenhuma regra de negócio relevante deve residir na rota HTTP.

O conector EngeGOV lê somente a área pública JSF/PrimeFaces, pagina a tabela e abre as fichas exibidas ao cidadão. A coleta é sequencial, registra intervalo, URL, horário e hash, e não acessa autenticação, CAPTCHA ou área restrita. O snapshot validado alimenta tanto a API quanto a versão estática do site.
