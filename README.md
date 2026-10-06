# De Olho nas Obras — Blumenau

Portal cidadão, acessível e apartidário para acompanhar obras e serviços públicos de Blumenau por contrato, prazo, custo e ciclos municipais de quatro anos.

Projeto acadêmico desenvolvido em colaboração. O histórico do [repositório original](https://github.com/GAVRr/SiteObras) foi preservado nesta versão.

## Dados públicos reais

A fotografia incluída no projeto foi coletada em 16/07/2026 do [Portal EngeGOV de Blumenau](https://engegov.blumenau.sc.gov.br/portal-engegov/dashboard.xhtml?cidade=4898): 483 registros, sendo 105 em andamento, 371 concluídos e 7 paralisados. Cada registro preserva a URL da fonte, o horário da coleta e o hash do conteúdo.

“Concluídas” é um estoque histórico do portal. “Em andamento” e “paralisadas” representam a situação na data da coleta; esses números não devem ser comparados diretamente como desempenho de um governo.

## Pré-requisitos

Para executar o projeto completo, instale:

- [Git](https://git-scm.com/downloads);
- [Docker Desktop](https://docs.docker.com/desktop/) com o mecanismo em execução.

No Windows, o Docker Desktop deve usar o backend WSL 2. Recomenda-se pelo menos 8 GB de memória RAM. Não é necessário instalar Python, Node.js, PostgreSQL ou Redis separadamente: o Docker fornece todos esses ambientes.

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

## Recarregar os dados públicos

Para carregar novamente no banco a fotografia já incluída no repositório:

```text
docker compose run --rm api python -m app.seed
```

Para coletar uma nova fotografia do Portal EngeGOV:

```text
docker compose run --rm api python -m app.ingestion.engegov_connector --output app/data/engegov-snapshot.json
```

Depois de validar a nova fotografia, copie o mesmo arquivo para `apps/web/app/engegov-snapshot.json`, que é a versão incorporada ao site estático, e reconstrua os serviços.

O coletor valida TLS por padrão. A opção `--insecure-tls` existe apenas para ambientes em que a cadeia pública do servidor não é reconhecida; essa condição fica registrada no snapshot.

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
