.PHONY: help install test lint format run clean docker-build docker-run

# Default target
help:
	@echo "TypeTutor Backend - Available commands:"
	@echo "  install     - Install dependencies"
	@echo "  test        - Run tests"
	@echo "  lint        - Run linting"
	@echo "  format      - Format code"
	@echo "  run         - Run development server"
	@echo "  clean       - Clean temporary files"
	@echo "  docker-build - Build Docker image"
	@echo "  docker-run  - Run with Docker Compose"

# Install dependencies
install:
	pip install -r requirements.txt
	pip install -r requirements-dev.txt

# Run tests
test:
	pytest

# Run tests with coverage
test-coverage:
	pytest --cov=backend --cov-report=html --cov-report=term

# Lint code
lint:
	flake8 backend/
	black --check backend/

# Format code
format:
	black backend/

# Run development server
run:
	python backend/app.py

# Clean temporary files
clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	rm -rf .pytest_cache/
	rm -rf htmlcov/
	rm -rf .coverage
	rm -rf cache/
	rm -f logs/*.log

# Docker commands
docker-build:
	docker build -t typetutor-backend .

docker-run:
	docker-compose up -d

docker-stop:
	docker-compose down

# Development setup
dev-setup: install
	pre-commit install
	mkdir -p uploads data logs cache
	@echo "Development environment ready!"
