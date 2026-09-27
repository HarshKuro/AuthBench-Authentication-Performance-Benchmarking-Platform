"""
CLI runner for Scientific Analytics Engine
Reads JSON input from stdin or file, outputs statistical analysis JSON.
"""

import sys
import json
from engine import ScientificAnalyticsEngine

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        print("Running analytics engine self-test...")
        np_pwd = [75, 78, 82, 85, 79, 81, 74, 90, 84, 88, 79, 80]
        np_qrotp = [210, 225, 240, 235, 250, 218, 260, 245, 238, 255, 230, 242]

        norm_pwd = ScientificAnalyticsEngine.test_normality(np_pwd)
        dist_pwd = ScientificAnalyticsEngine.compute_distribution_metrics(np_pwd)
        comp = ScientificAnalyticsEngine.compare_two_groups(np_qrotp, np_pwd, "QR_OTP", "PASSWORD")

        print("Normality check:", json.dumps(norm_pwd, indent=2))
        print("Comparison:", json.dumps(comp, indent=2))
        print("Analytics engine self-test PASSED successfully!")
        return

    # Read from stdin
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            print(json.dumps({"error": "No input JSON provided"}))
            return

        payload = json.loads(raw)
        action = payload.get("action", "compare")

        if action == "compare":
            res = ScientificAnalyticsEngine.compare_two_groups(
                payload["group_a"],
                payload["group_b"],
                payload.get("name_a", "Method_A"),
                payload.get("name_b", "Method_B")
            )
            print(json.dumps(res, indent=2))
        elif action == "omnibus":
            res = ScientificAnalyticsEngine.omnibus_kruskal_wallis(payload["groups"])
            print(json.dumps(res, indent=2))
        elif action == "distribution":
            res = ScientificAnalyticsEngine.compute_distribution_metrics(payload["data"])
            ci = ScientificAnalyticsEngine.bootstrap_confidence_interval(payload["data"])
            res["ci95"] = ci
            print(json.dumps(res, indent=2))
        elif action == "saturation":
            res = ScientificAnalyticsEngine.detect_saturation_knee(
                payload["concurrency"],
                payload["throughputs"],
                payload["latencies_p95"]
            )
            print(json.dumps(res, indent=2))
        else:
            print(json.dumps({"error": f"Unknown action: {action}"}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
