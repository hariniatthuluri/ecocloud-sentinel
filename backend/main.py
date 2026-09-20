from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from analysis import analyze_resources, analyze_resource, find_waste, load_resources, summarize_resources

app = FastAPI(title="EcoCloud Sentinel API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "EcoCloud Sentinel backend is running"}


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "backend"}


@app.get("/api/resources")
def resources():
    return {"resources": analyze_resources()}


@app.get("/api/resources/{resource_id}")
def resource_detail(resource_id: str):
    resource = next(
        (item for item in load_resources() if item.get("resource_id") == resource_id),
        None,
    )
    if resource is None:
        raise HTTPException(status_code=404, detail="Resource not found")
    return analyze_resource(resource)


@app.get("/api/summary")
def summary():
    analyzed_resources = analyze_resources()
    return summarize_resources(analyzed_resources)


@app.get("/api/findings")
def findings():
    analyzed_resources = analyze_resources()
    return {"findings": find_waste(analyzed_resources)}


@app.get("/api/recommendations")
def recommendations():
    analyzed_resources = analyze_resources()
    return {"recommendations": find_waste(analyzed_resources)}


@app.get("/api/findings/{resource_id}")
def finding_detail(resource_id: str):
    resource = next(
        (item for item in analyze_resources() if item.get("resource_id") == resource_id),
        None,
    )
    if resource is None or resource["analysis_status"] == "Healthy":
        raise HTTPException(status_code=404, detail="Finding not found")
    return resource
