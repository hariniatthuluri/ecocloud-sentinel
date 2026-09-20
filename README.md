# EcoCloud Sentinel

EcoCloud Sentinel is an AI-powered cloud sustainability assistant that will identify wasteful or underutilized cloud resources, estimate cost and environmental impact, explain the findings, and recommend practical actions.

This initial setup contains a React/Vite frontend, a minimal FastAPI backend, and local mock AWS resource data. AWS integration will be added later.

## Project structure

```text
EcoCloud-Sentinel/
├── frontend/                 # React application built with Vite
├── backend/
│   ├── main.py               # FastAPI application
│   └── requirements.txt      # Backend dependencies
├── data/
│   └── sample_resources.json # Local mock EC2 data
├── README.md
└── .gitignore
```

## Start the frontend

```powershell
cd frontend
npm run dev
```

Vite will print the local development URL in the terminal.

## Start the backend

Create and activate a virtual environment from the project root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn main:app --reload
```

The API is then available at `http://127.0.0.1:8000`. The health check is available at `http://127.0.0.1:8000/api/health`.

## Future work

AWS integration will be added later. This setup does not connect to AWS or include credentials, authentication, a database, Docker, AWS SDKs, or Amazon Bedrock.
