.PHONY: dev dev-tmux build lint reset-data help

help:
	@echo "Available commands:"
	@echo "  make dev          - Start dev server"
	@echo "  make dev-tmux     - Start dev server in tmux session"
	@echo "  make build        - Production build"
	@echo "  make lint         - Run ESLint"
	@echo "  make reset-data   - Reset localStorage dev data"

dev:
	npm run dev

dev-tmux:
	@if tmux has-session -t sidekick 2>/dev/null; then \
		tmux attach -t sidekick; \
	else \
		tmux new-session -d -s sidekick -c "$(PWD)" "npm run dev"; \
		tmux attach -t sidekick; \
	fi

build:
	npm run build

lint:
	npm run lint

reset-data:
	npm run reset-data
