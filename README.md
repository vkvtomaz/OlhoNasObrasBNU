# De Olho nas Obras — Blumenau

Portal cidadão, acessível e apartidário para acompanhar obras e serviços públicos de Blumenau por contrato, prazo, custo e ciclos municipais de quatro anos.

## Dados públicos reais

A fotografia incluída no projeto foi coletada em 16/07/2026 do [Portal EngeGOV de Blumenau](https://engegov.blumenau.sc.gov.br/portal-engegov/dashboard.xhtml?cidade=4898): 483 registros, sendo 105 em andamento, 371 concluídos e 7 paralisados. Cada registro preserva URL da fonte, horário da coleta e hash de conteúdo.

“Concluídas” é um estoque histórico do portal. “Em andamento” e “paralisadas” são a situação atual na data da coleta; esses números não devem ser comparados diretamente como desempenho de um governo.

## Executar

1. Copie `.env.example` para `.env`.
2. Execute `docker compose up --build`.
3. Acesse `http://localhost:3000`; a documentação da API fica em `http://localhost:8000/docs`.

Para carregar novamente o banco: `docker compose run --rm api python -m app.seed`.

Para atualizar a fotografia pública, execute no ambiente da API:

```text
python -m app.ingestion.engegov_connector --output app/data/engegov-snapshot.json
```

Depois da validação, copie o mesmo snapshot para `apps/web/app/engegov-snapshot.json`, que é a versão incorporada ao site estático.

O coletor valida TLS por padrão. `--insecure-tls` existe apenas para ambientes em que a cadeia pública do servidor não é reconhecida e essa condição precisa ficar registrada no snapshot.

## Estrutura

- `apps/api`: API FastAPI, banco, indicadores, alertas e coletor JSF do EngeGOV.
- `apps/web`: interface pública em TypeScript, snapshot JSON e assistente com respostas controladas.
- `docs`: arquitetura, metodologia, fontes e diretrizes.

Alertas são triagens matemáticas para orientar fiscalização; não constituem acusação ou conclusão legal.
