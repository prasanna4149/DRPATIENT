import os
import sys
from fastapi.testclient import TestClient
from fastapi import FastAPI

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

# Attempt to import the router directly to isolate the issue
try:
    from api.routers.assistant import router
    from api.dependencies import get_bearer_token, get_supabase_client, get_service_role_client
    
    from starlette.testclient import TestClient
    
    # Create a minimal app with just this router
    app = FastAPI()
    app.include_router(router)
    
    client = TestClient(app)
    
    # Mock dependencies to avoid real Supabase/Groq calls
    def mock_get_token():
        return "mock_token"
    
    def mock_get_client():
        return "mock_client"
        
    app.dependency_overrides[get_bearer_token] = mock_get_token
    app.dependency_overrides[get_supabase_client] = mock_get_client
    app.dependency_overrides[get_service_role_client] = mock_get_client
    
    print("Sending request...")
    response = client.post(
        "/api/assistant/chat",
        json={
            "messages": [{"role": "user", "content": "hello"}],
            "patient_context": {"name": "Test", "age": 30}
        }
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
