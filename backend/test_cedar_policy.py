import unittest

from cedar_policy import evaluate_recommendation


class CedarPolicyTest(unittest.TestCase):
    def test_unattached_ebs_requires_confirmation(self):
        recommendation = {
            "resource_id": "vol-test",
            "resource_type": "EBS",
            "analysis_status": "High Waste",
        }

        evaluated = evaluate_recommendation(recommendation)

        self.assertEqual(evaluated["cedar_decision"], "Deny")
        self.assertEqual(evaluated["recommendation_policy_status"], "requires_confirmation")


if __name__ == "__main__":
    unittest.main()