# EcoCloud Sentinel 🌱☁️

> **Detect cloud waste. Quantify its impact. Act on the savings.**

EcoCloud Sentinel is a cloud sustainability analyzer that identifies inefficient infrastructure, estimates its cost and environmental impact, and provides actionable optimization recommendations.

## ✨ Features

* 📊 Infrastructure sustainability dashboard
* 🔍 Waste detection across EC2, RDS, EBS and S3
* 💰 Estimated monthly cost and potential savings
* 🌱 Prototype carbon-impact estimation
* 💡 Resource-specific optimization recommendations
* 🔎 Resource and finding details
* ⚡ FastAPI backend + React frontend

## 🏗️ Architecture

```text
Representative Infrastructure Data
                ↓
         FastAPI Backend
                ↓
        Analysis Engine
                ↓
   Detect → Explain → Quantify → Recommend
                ↓
          React Dashboard
```

## 🛠️ Tech Stack

* **Frontend:** React, Vite, JavaScript
* **Backend:** Python, FastAPI
* **Data:** JSON
* **Analysis:** Rule-based infrastructure analysis

## 🚀 Run Locally

### Backend

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs at `http://127.0.0.1:8000`

### Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://127.0.0.1:5173`

## 📊 Prototype

The included dataset contains **12 representative cloud resources** across EC2, RDS, EBS and S3.

Current analysis identifies:

* **8 resources requiring review**
* **2 optimization candidates**
* **4 healthy resources**
* **$234.17/month estimated potential savings**
* **53.67 kg/month prototype carbon impact**

These values are based on the included representative dataset.

## ☁️ AWS Context

EcoCloud Sentinel models AWS infrastructure and is designed to help identify cloud waste and optimization opportunities.

The current hackathon prototype runs locally using representative infrastructure data rather than connecting to live AWS resources.

The carbon-impact calculation is a **prototype estimate**, not an official AWS emissions measurement.

## 🔐 Safety

EcoCloud Sentinel provides recommendations but does not automatically modify or delete cloud resources.

## 📌 Status

**Functional hackathon prototype**

Built for **AWS Bharat Builds**.

AWS integration will be added later. This setup does not connect to AWS or include credentials, authentication, a database, Docker, AWS SDKs, or Amazon Bedrock.
