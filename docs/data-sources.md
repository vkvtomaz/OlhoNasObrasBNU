# Fontes de dados

- EngeGOV Blumenau: fonte primária ativa para situação, identificação do contrato, valores e medições; fotografia coletada em 16/07/2026.
- Portal da Transparência, PNCP e Diário Oficial: interfaces planejadas.
- Snapshot versionado: 483 registros, com URL, horário e hash por registro.

Conectores devem usar timeout, pausa entre requisições, hash e armazenamento bruto. Não contornar CAPTCHA ou autenticação. A validação TLS permanece ativa por padrão; qualquer exceção do ambiente de coleta deve ficar registrada nos metadados.
