"""Transparent local heuristics for the simulated EcoCloud Sentinel environment."""

import json
from pathlib import Path


# Prototype thresholds are centralized so the heuristic rules can be tuned later.
ANALYSIS_THRESHOLDS = {
    "ec2_high_waste_cpu_below": 5.0,
    "ec2_underutilized_cpu_below": 15.0,
    "ebs_oversized_gb_at_least": 500,
    "rds_underutilized_cpu_below": 5.0,
    "rds_underutilized_connections_below": 10,
    "rds_healthy_cpu_at_least": 20.0,
    "s3_high_waste_storage_gb_at_least": 1000,
    "s3_stale_days_at_least": 365,
    "s3_optimization_storage_gb_at_least": 100,
    "s3_inactive_days_at_least": 90,
}

# Prototype-only factor. This is not an official AWS carbon calculation.
PROTOTYPE_CO2_KG_PER_DOLLAR = 0.12
DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "sample_resources.json"
WASTE_STATUSES = {"High Waste", "Underutilized", "Optimization Candidate"}


def load_resources():
    """Load the representative local infrastructure fixture."""
    with DATA_PATH.open(encoding="utf-8") as data_file:
        return json.load(data_file)


def resource_type(resource):
    return resource.get("type", resource.get("resource_type", "Unknown"))


def classify_resource(resource):
    """Classify one resource using type-specific prototype heuristics."""
    kind = resource_type(resource)

    if kind == "EC2":
        cpu = resource.get("cpu_utilization", 0.0)
        if cpu < ANALYSIS_THRESHOLDS["ec2_high_waste_cpu_below"]:
            return "High Waste"
        if cpu < ANALYSIS_THRESHOLDS["ec2_underutilized_cpu_below"]:
            return "Underutilized"
        return "Healthy"

    if kind == "EBS":
        if not resource.get("attached", False):
            return "High Waste"
        if resource.get("size_gb", 0) >= ANALYSIS_THRESHOLDS["ebs_oversized_gb_at_least"]:
            return "Optimization Candidate"
        return "Healthy"

    if kind == "RDS":
        cpu = resource.get("cpu_utilization", 0.0)
        connections = resource.get("connections", 0)
        if (
            cpu < ANALYSIS_THRESHOLDS["rds_underutilized_cpu_below"]
            and connections < ANALYSIS_THRESHOLDS["rds_underutilized_connections_below"]
        ):
            return "Underutilized"
        if cpu < ANALYSIS_THRESHOLDS["rds_healthy_cpu_at_least"]:
            return "Optimization Candidate"
        return "Healthy"

    if kind == "S3":
        storage = resource.get("storage_gb", 0)
        inactive_days = resource.get("last_activity_days", 0)
        if (
            inactive_days >= ANALYSIS_THRESHOLDS["s3_stale_days_at_least"]
            and storage >= ANALYSIS_THRESHOLDS["s3_high_waste_storage_gb_at_least"]
        ):
            return "High Waste"
        if (
            inactive_days >= ANALYSIS_THRESHOLDS["s3_inactive_days_at_least"]
            and storage >= ANALYSIS_THRESHOLDS["s3_optimization_storage_gb_at_least"]
        ):
            return "Optimization Candidate"
        return "Healthy"

    return "Healthy"


def severity_for(status):
    return {
        "High Waste": "critical",
        "Underutilized": "warning",
        "Optimization Candidate": "review",
        "Healthy": "healthy",
    }[status]


def waste_category_for(resource, status):
    if status == "Healthy":
        return "Healthy utilization"
    categories = {
        "EC2": {"High Waste": "Idle compute", "Underutilized": "Underutilized compute"},
        "EBS": {"High Waste": "Unattached storage", "Optimization Candidate": "Oversized storage"},
        "RDS": {"Underutilized": "Underutilized database", "Optimization Candidate": "Database capacity review"},
        "S3": {"High Waste": "Stale object storage", "Optimization Candidate": "Inactive object storage"},
    }
    return categories.get(resource_type(resource), {}).get(status, "Resource efficiency review")


def estimate_savings(resource, status):
    """Estimate potential savings, not guaranteed savings or an AWS bill calculation."""
    monthly_cost = resource.get("monthly_cost", 0.0)
    factors = {"High Waste": 1.0, "Underutilized": 0.5, "Optimization Candidate": 0.25, "Healthy": 0.0}
    return monthly_cost * factors[status]


def estimate_prototype_carbon(resource):
    """Estimate avoidable carbon with a replaceable prototype formula.

    This is not an official AWS carbon calculation. The prototype estimates
    avoidable impact as monthly cost * inefficiency factor * conversion factor.
    CPU-backed resources use unused CPU; storage uses unattached/stale share.
    """
    kind = resource_type(resource)
    if kind in {"EC2", "RDS"}:
        inefficiency = max(0.0, 1.0 - resource.get("cpu_utilization", 0.0) / 100.0)
    elif kind == "EBS":
        inefficiency = 1.0 if not resource.get("attached", False) else min(resource.get("size_gb", 0) / 1000, 1.0) * 0.25
    elif kind == "S3":
        inefficiency = min(resource.get("last_activity_days", 0) / 365.0, 1.0)
    else:
        inefficiency = 0.0
    return resource.get("monthly_cost", 0.0) * inefficiency * PROTOTYPE_CO2_KG_PER_DOLLAR


def recommendation_for(resource, status):
    kind = resource_type(resource)
    if status == "High Waste":
        if kind == "EC2":
            return "Verify whether this instance is still required before stopping or decommissioning it."
        if kind == "EBS":
            return "Verify the volume is no longer needed, then delete it if confirmed unused."
        if kind == "S3":
            return "Review lifecycle, retention, archival, or deletion options."
        return "Review this resource and consider stopping or decommissioning it if it is no longer required."
    if status == "Underutilized":
        if kind == "EC2":
            return "Consider scheduling this instance during active usage periods."
        if kind == "RDS":
            return "Review instance sizing and consider downsizing if workload requirements allow."
        return "Review this resource and consider scheduling it during active usage periods."
    if status == "Optimization Candidate":
        if kind == "EBS":
            return "Review whether a smaller volume is sufficient for the workload."
        if kind == "S3":
            return "Review lifecycle, retention, archival, or deletion options."
        return "Review capacity and usage trends before making a right-sizing change."
    return "No immediate action required."


def metrics_for(resource):
    kind = resource_type(resource)
    if kind == "EC2":
        return {
            "cpu_utilization": resource.get("cpu_utilization"),
            "memory_utilization": resource.get("memory_utilization"),
            "running_hours": resource.get("running_hours"),
        }
    if kind == "EBS":
        return {
            "size_gb": resource.get("size_gb"),
            "attached": resource.get("attached"),
        }
    if kind == "RDS":
        return {
            "cpu_utilization": resource.get("cpu_utilization"),
            "connections": resource.get("connections"),
            "running_hours": resource.get("running_hours"),
        }
    if kind == "S3":
        return {
            "storage_gb": resource.get("storage_gb"),
            "object_count": resource.get("object_count"),
            "last_activity_days": resource.get("last_activity_days"),
        }
    return {}


def explanation_for(resource, status):
    """Explain the classification with actual metrics and configured thresholds."""
    kind = resource_type(resource)
    cost = resource.get("monthly_cost", 0.0)
    if kind in {"EC2", "RDS"}:
        cpu = resource.get("cpu_utilization", 0.0)
        if kind == "EC2" and status == "High Waste":
            threshold = ANALYSIS_THRESHOLDS["ec2_high_waste_cpu_below"]
            return f"CPU utilization is {cpu:g}%, below the configured high-waste threshold of {threshold:g}%. At an estimated ${cost:.2f} per month, this resource is a candidate for optimization."
        if kind == "EC2":
            threshold = ANALYSIS_THRESHOLDS["ec2_underutilized_cpu_below"]
            return f"CPU utilization is {cpu:g}%, below the configured healthy threshold of {threshold:g}%. At an estimated ${cost:.2f} per month, this resource may not need continuous capacity."
        connections = resource.get("connections", 0)
        return f"RDS CPU utilization is {cpu:g}% with {connections} active connections. These metrics indicate {status.lower()} usage at an estimated ${cost:.2f} per month."
    if kind == "EBS":
        if status == "High Waste":
            return f"This {resource.get('size_gb', 0):g} GB EBS volume is unattached, while its estimated monthly cost is ${cost:.2f}."
        return f"This attached EBS volume is {resource.get('size_gb', 0):g} GB at an estimated ${cost:.2f} per month, which exceeds the prototype review threshold for storage size."
    if kind == "S3":
        return f"This bucket contains {resource.get('storage_gb', 0):g} GB across {resource.get('object_count', 0):,} objects, with activity {resource.get('last_activity_days', 0)} days ago. Its estimated monthly cost is ${cost:.2f}."
    return f"This resource was classified as {status} using the local prototype heuristics at an estimated ${cost:.2f} per month."


def analyze_resource(resource):
    """Return one standardized analyzed resource plus legacy compatibility aliases."""
    status = classify_resource(resource)
    kind = resource_type(resource)
    potential_savings = round(estimate_savings(resource, status), 2)
    carbon_impact = round(estimate_prototype_carbon(resource), 2)
    explanation = explanation_for(resource, status)
    runtime_status = resource.get("state") or resource.get("status") or (
        "attached" if resource.get("attached") else "unattached" if kind == "EBS" else "active"
    )
    return {
        **resource,
        "type": kind,
        "resource_type": kind,
        "runtime_status": runtime_status,
        "status": status,
        "severity": severity_for(status),
        "waste_category": waste_category_for(resource, status),
        "metrics": metrics_for(resource),
        "monthly_cost": round(resource.get("monthly_cost", 0.0), 2),
        "potential_savings": potential_savings,
        "estimated_carbon_impact": carbon_impact,
        "explanation": explanation,
        "recommendation": recommendation_for(resource, status),
        "analysis_status": status,
        "estimated_monthly_savings": potential_savings,
        "estimated_co2_impact": carbon_impact,
        "analysis_explanation": explanation,
    }


def analyze_resources():
    return [analyze_resource(resource) for resource in load_resources()]


def summarize_resources(resources):
    """Aggregate dynamically calculated prototype estimates for the dashboard."""
    return {
        "resources_scanned": len(resources),
        "total_resources": len(resources),
        "wasteful_resources": sum(resource["status"] in WASTE_STATUSES for resource in resources),
        "optimization_candidates": sum(resource["status"] == "Optimization Candidate" for resource in resources),
        "healthy_resources": sum(resource["status"] == "Healthy" for resource in resources),
        "estimated_monthly_cost": round(sum(resource["monthly_cost"] for resource in resources), 2),
        "potential_monthly_savings": round(sum(resource["potential_savings"] for resource in resources), 2),
        "estimated_potential_savings": round(sum(resource["potential_savings"] for resource in resources), 2),
        "estimated_co2_impact": round(sum(resource["estimated_carbon_impact"] for resource in resources), 2),
        "estimated_carbon_impact": round(sum(resource["estimated_carbon_impact"] for resource in resources), 2),
    }


def find_waste(resources):
    return [resource for resource in resources if resource["status"] in WASTE_STATUSES]
