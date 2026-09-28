# task-service

![JavaScript](https://img.shields.io/badge/language-JavaScript-F7DF1E?style=flat-square)

Task management REST API service

## Features

<!-- readme-scan:start:features -->
- RESTful API: API with 3 endpoints
- Database Persistence: Powered by PostgreSQL
<!-- readme-scan:end:features -->

## Tech Stack

<!-- readme-scan:start:stack -->
| Category | Technologies |
| --- | --- |
| Primary Language | JavaScript |
| Backend / API | `Express` |
| Database / ORM | `PostgreSQL Client (pg)` |
<!-- readme-scan:end:stack -->

## Architecture & Project Structure

<!-- readme-scan:start:architecture -->
```text
express-api/
├── src/ # Source code
│   └── index.js
├── .env.example
└── package.json
```
<!-- readme-scan:end:architecture -->

## Prerequisites & Installation

<!-- readme-scan:start:prerequisites -->
### Prerequisites

- Package Manager: `npm`

### Setup Instructions

1. Clone the repository:

```bash
git clone <repository-url>
cd task-service
```

2. Install dependencies:

```bash
npm install
```
<!-- readme-scan:end:prerequisites -->

## Usage & Execution

<!-- readme-scan:start:usage -->
To run the application:
```bash
npm start
```

### Available Scripts

| Command | Description |
| --- | --- |
| `npm run start` | `node src/index.js` |
| `npm run test` | `node --test` |
<!-- readme-scan:end:usage -->

## Configuration & Environment Variables

<!-- readme-scan:start:env -->
Copy the `.env.example` template to `.env`:
```bash
cp .env.example .env
```

| Variable | Status | In Example | Description |
| --- | --- | --- | --- |
| `PORT` | Required | Yes | e.g. `3000` |
| `DATABASE_URL` | Required | Yes | e.g. `postgres://user:password@localhost:5432/taskdb` |
<!-- readme-scan:end:env -->

## API Documentation

<!-- readme-scan:start:api -->
| Method | Endpoint Path | Source File |
| --- | --- | --- |
| `GET` | `/api/health` | `src/index.js` |
| `GET` | `/api/tasks` | `src/index.js` |
| `POST` | `/api/tasks` | `src/index.js` |
<!-- readme-scan:end:api -->

## Database & Models

<!-- readme-scan:start:database -->
Database Engines: PostgreSQL
<!-- readme-scan:end:database -->
