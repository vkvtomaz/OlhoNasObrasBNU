# De Olho nas Obras — Blumenau

Portal cidadão, acessível e apartidário para acompanhar obras e serviços públicos de Blumenau por contrato, prazo, custo e ciclos municipais de quatro anos.
Projeto acadêmico desenvolvido em colaboração.

## Dados públicos reais

A fotografia incluída no projeto foi coletada em 16/07/2026 do [Portal EngeGOV de Blumenau](https://engegov.blumenau.sc.gov.br/portal-engegov/dashboard.xhtml?cidade=4898): 483 registros, sendo 105 em andamento, 371 concluídos e 7 paralisados. Cada registro preserva a URL da fonte, o horário da coleta e o hash do conteúdo.

“Concluídas” é um estoque histórico do portal. “Em andamento” e “paralisadas” representam a situação na data da coleta; esses números não devem ser comparados diretamente como desempenho de um governo.

## Pré-requisitos

Para executar o projeto completo, instale:

- [Git](https://git-scm.com/downloads);
- [Docker Desktop](https://docs.docker.com/desktop/) com o mecanismo em execução.

Confirme a instalação em um terminal novo:

```text
git --version
docker --version
docker compose version
```

## Executar o projeto

### 1. Baixar o repositório

```text
git clone https://github.com/vkvtomaz/OlhoNasObrasBNU.git
cd OlhoNasObrasBNU
```

### 2. Criar o arquivo de configuração

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

No Linux ou macOS:

```bash
cp .env.example .env
```

Os valores padrão já são suficientes para executar o projeto localmente. As configurações opcionais de e-mail e OpenAI podem permanecer vazias.

### 3. Construir e iniciar os serviços

```text
docker compose up --build -d
```

Na primeira execução, o Docker baixará as imagens e dependências. Esse processo pode levar alguns minutos. A API executará as migrações automaticamente e carregará os 483 registros públicos no banco.

Confira o estado dos serviços:

```text
docker compose ps
```

Os serviços `db`, `redis` e `api` devem aparecer como saudáveis, e o serviço `web` deve aparecer como ativo.

### 4. Acessar

- Portal: [http://localhost:3000](http://localhost:3000)
- Documentação interativa da API: [http://localhost:8000/docs](http://localhost:8000/docs)
- Verificação de saúde da API: [http://localhost:8000/health](http://localhost:8000/health)

## Encerrar ou reiniciar

Para encerrar os serviços sem apagar os dados:

```text
docker compose down
```

Para iniciá-los novamente:

```text
docker compose up -d
```

Para acompanhar os registros de execução:

```text
docker compose logs -f
```

Pressione `Ctrl+C` para sair da visualização dos registros sem desligar os serviços.

## Atualizar o projeto

Após receber novas alterações do repositório:

```text
git pull
docker compose up --build -d
```

As migrações pendentes serão aplicadas automaticamente, preservando os dados existentes.

## Web scraping do EngeGOV

Uma das partes centrais deste projeto é o coletor desenvolvido em Python para obter dados públicos diretamente do Portal EngeGOV de Blumenau. O portal utiliza JSF/PrimeFaces, portanto a coleta não se limita a ler uma página HTML: o código preserva o estado da sessão, reproduz as requisições AJAX de paginação, abre as fichas individuais e interpreta as respostas parciais em XML e HTML.

O coletor está em [`apps/api/app/ingestion/engegov_connector.py`](apps/api/app/ingestion/engegov_connector.py) e utiliza `httpx` e `BeautifulSoup`. Ele reúne:

- identificação, situação e descrição das obras e serviços;
- secretaria, endereço e tipo de intervenção;
- dados de contratos, empresas, datas, valores e medições;
- coordenadas publicadas no mapa e identificação do bairro;
- URL da fonte, horário da coleta e hash de conteúdo de cada registro.

A implementação foi projetada para ser auditável e respeitosa com a fonte pública:

- acessa somente páginas públicas, sem autenticação ou áreas restritas;
- não tenta contornar CAPTCHA ou mecanismos de proteção;
- valida TLS por padrão;
- executa a coleta sequencialmente e aplica intervalo entre requisições;
- registra metadados suficientes para conferir a origem dos dados;
- limita o tamanho de página aceito pelo portal.

O portal exibido pelo projeto não executa web scraping a cada acesso. Ele utiliza um **snapshot versionado**, gerado previamente pelo coletor. Isso melhora o desempenho, permite reproduzir análises e evita requisições desnecessárias ao EngeGOV.

Os dois arquivos abaixo devem permanecer idênticos:

- `apps/api/app/data/engegov-snapshot.json`, utilizado pela API e pela carga do banco;
- `apps/web/app/engegov-snapshot.json`, incorporado à interface durante a construção.

### Executar uma nova coleta

Como a coleta consulta uma fonte externa e pode demorar, execute-a somente quando houver necessidade de atualizar a fotografia pública.

No Windows PowerShell:

```powershell
docker compose run --rm --volume "${PWD}:/workspace" api python -m app.ingestion.engegov_connector --output /workspace/apps/api/app/data/engegov-snapshot.json
Copy-Item apps/api/app/data/engegov-snapshot.json apps/web/app/engegov-snapshot.json
```

No Linux ou macOS:

```bash
docker compose run --rm --volume "$PWD:/workspace" api python -m app.ingestion.engegov_connector --output /workspace/apps/api/app/data/engegov-snapshot.json
cp apps/api/app/data/engegov-snapshot.json apps/web/app/engegov-snapshot.json
```

Depois da coleta, revise as alterações nos arquivos JSON, execute os testes e reconstrua a aplicação:

```text
docker compose up --build -d
```

O parâmetro `--insecure-tls` existe apenas para ambientes em que a cadeia pública de certificados não é reconhecida. Seu uso reduz a segurança e fica registrado nos metadados do snapshot. Como a estrutura do portal de origem pode mudar, uma falha futura na coleta pode exigir a atualização dos seletores ou dos parâmetros JSF.

## Recarregar os dados públicos

Para carregar novamente no banco a fotografia já incluída no repositório:

```text
docker compose run --rm api python -m app.seed
```

Esse comando é idempotente: registros já existentes são atualizados pelo código da fonte, em vez de serem duplicados.

## Problemas comuns

### O comando `docker` não foi encontrado

Abra o Docker Desktop, aguarde o mecanismo iniciar e abra um terminal novo. No Windows, talvez seja necessário reiniciar o computador após a instalação.

### Uma porta já está em uso

O portal utiliza a porta `3000` e a API utiliza a porta `8000`. Encerre a aplicação que estiver usando a porta ou altere o mapeamento correspondente em `docker-compose.yml`.

### Um serviço não iniciou

Consulte os registros do serviço:

```text
docker compose logs api
docker compose logs web
docker compose logs db
```

Depois de corrigir o problema, reconstrua a aplicação:

```text
docker compose up --build -d
```

## Estrutura

- `apps/api`: API FastAPI, banco, indicadores, alertas e coletor JSF do EngeGOV;
- `apps/web`: interface pública em TypeScript, snapshot JSON e assistente com respostas controladas;
- `docs`: arquitetura, metodologia, fontes e diretrizes;
- `docker-compose.yml`: orquestra PostgreSQL/PostGIS, Redis, API e interface.

## Observação legal e ética

Os alertas são triagens matemáticas para orientar fiscalização. Eles não constituem acusação, prova de irregularidade ou conclusão legal.
