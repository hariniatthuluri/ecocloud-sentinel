"""Local Cedar safety evaluation for analysis recommendations."""

from pathlib import Path

import cedarpy


POLICY_PATH = Path(__file__).resolve().parent / "policies.cedar"
POLICY_TEXT = POLICY_PATH.read_text(encoding="utf-8")
PRINCIPAL = {"type": "Application", "id": "ecocloud-sentinel"}
ACTION = {"type": "Action", "id": "recommend"}


def evaluate_recommendation(recommendation):
    resource_id = str(recommendation["resource_id"])
    entity = {
        "uid": {"type": "Recommendation", "id": resource_id},
        "attrs": {
            "resource_type": recommendation["resource_type"],
            "analysis_status": recommendation["analysis_status"],
        },
        "parents": [],
    }
    request = {
        "principal": PRINCIPAL,
        "action": ACTION,
        "resource": {"type": "Recommendation", "id": resource_id},
    }
    result = cedarpy.is_authorized(request, POLICY_TEXT, [entity])
    allowed = result.decision == cedarpy.Decision.Allow
    return {
        **recommendation,
        "cedar_decision": result.decision.value,
        "recommendation_policy_status": "approved_for_review" if allowed else "requires_confirmation",
    }


def evaluate_recommendations(recommendations):
    return [evaluate_recommendation(recommendation) for recommendation in recommendations]