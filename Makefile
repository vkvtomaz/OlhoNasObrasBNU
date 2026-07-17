.PHONY: dev test seed
dev:
	docker compose up --build
test:
	docker compose run --rm api pytest && cd apps/web && pnpm test
seed:
	docker compose run --rm api python -m app.seed

