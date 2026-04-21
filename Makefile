.PHONY: up down build rebuild restart logs rebuild

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

rebuild:
	docker compose build --no-cache

restart:
	docker compose down && docker compose up -d

rebuild:
	docker compose down && docker compose build && docker compose up -d

logs:
	docker compose logs
