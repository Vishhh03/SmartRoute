import sys
import json
import requests

def run_diagnostics():
    print("="*60)
    print(" SMARTROUTE BACKEND DIAGNOSTICS")
    print("="*60)
    
    base_url = "http://localhost:5000"
    
    # 1. Test Server Connectivity & Health
    print("\n[1] Checking Server Health (/api/health)...")
    try:
        health_resp = requests.get(f"{base_url}/api/health", timeout=5)
        print(f"Status: {health_resp.status_code}")
        try:
            health_data = health_resp.json()
            print("Response:", json.dumps(health_data, indent=2))
            if health_data.get("status") == "degraded":
                print("⚠️ WARNING: Server is degraded. Models might be missing or failed to load.")
        except json.JSONDecodeError:
            print("Response is not JSON:", health_resp.text)
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Cannot connect to backend. Is the Flask server running on port 5000?")
        sys.exit(1)
    except Exception as e:
        print(f"❌ ERROR: {e}")

    # 2. Test Route Generation (the exact coordinates that failed)
    print("\n[2] Testing Route Generation (/api/route-path)...")
    payload = {
        "start": [44.953, -93.2981],
        "end": [44.8833, -93.212]
    }
    
    try:
        route_resp = requests.post(
            f"{base_url}/api/route-path", 
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=15
        )
        print(f"Status: {route_resp.status_code}")
        
        try:
            route_data = route_resp.json()
            if route_resp.status_code == 200:
                print("✅ SUCCESS: Route generated successfully!")
                print(f"Segments analyzed: {route_data['metrics']['total_segments']}")
                print(f"CO2 Saved: {route_data['metrics']['co2_saved_grams']}g")
            elif route_resp.status_code == 401:
                print("🔑 AUTH ERROR: The backend returned 401. This means the ORS_API_KEY is missing or invalid in the .env file.")
                print("Response:", route_data.get("error", "Unknown auth error"))
            elif route_resp.status_code == 500:
                print("❌ SERVER ERROR (500): The backend crashed while processing.")
                print("Response:", json.dumps(route_data, indent=2))
            else:
                print(f"⚠️ UNEXPECTED STATUS ({route_resp.status_code}):")
                print("Response:", json.dumps(route_data, indent=2))
        except json.JSONDecodeError:
            print("❌ SERVER CRASH: Response is not JSON (likely an unhandled exception trace):")
            print(route_resp.text[:500] + ("..." if len(route_resp.text) > 500 else ""))
            
    except Exception as e:
        print(f"❌ ERROR during request: {e}")
        
    print("\n" + "="*60)
    print(" Please copy the output above and share it with your friend!")
    print("="*60)

if __name__ == "__main__":
    # Ensure requests is installed
    try:
        import requests
    except ImportError:
        print("Please install requests first: pip install requests")
        sys.exit(1)
        
    run_diagnostics()
