"""Supabase-backed health assistant endpoints with Groq AI."""
from __future__ import annotations

from typing import Any, Dict, Optional, List
import json
import os

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from datetime import datetime
from groq import Groq

from ..config import settings
from ..dependencies import get_bearer_token, get_supabase_client, get_service_role_client
from ..services.supabase import SupabaseClient, SupabaseResponse

router = APIRouter(prefix="/api/assistant", tags=["Assistant"])

# Groq client - initialized lazily
_groq_client = None

def get_groq_client():
    """Get or create the Groq client instance."""
    global _groq_client
    if _groq_client is None:
        if not settings.groq_api_key:
            print("[ERROR] GROQ_API_KEY is not set in environment")
            print(f"[DEBUG] Current working directory: {os.getcwd()}")
            print(f"[DEBUG] Settings groq_api_key: {settings.groq_api_key}")
            raise HTTPException(status_code=503, detail="Groq API key not configured")
        try:
            _groq_client = Groq(api_key=settings.groq_api_key)
            print(f"[SUCCESS] Groq client initialized with model: {settings.groq_model}")
        except Exception as e:
            print(f"[ERROR] Failed to initialize Groq client: {e}")
            raise HTTPException(status_code=503, detail=f"Failed to initialize Groq: {str(e)}")
    return _groq_client

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    patient_context: Optional[Dict[str, Any]] = None

class UpdatesPayload(BaseModel):
    updates: Dict[str, Any] = Field(..., min_length=1, description="Fields to update on the patient profile")

class DoctorFilters(BaseModel):
    category: Optional[str] = Field(default=None, description="Optional doctor category filter")

class IntakePayload(BaseModel):
    issue: Optional[str] = None
    symptoms: Optional[str] = None
    duration: Optional[str] = None
    severity: Optional[int] = None
    medications: Optional[str] = None
    allergies: Optional[str] = None
    exclude_doctor_id: Optional[str] = None

class AppointmentPayload(BaseModel):
    patient_id: str
    doctor_id: str
    patient_name: str
    doctor_name: str
    doctor_category: str
    datetime: str
    symptoms: Optional[str] = None
    id: Optional[str] = None

SYSTEM_PROMPT = """You are a professional medical intake assistant for a healthcare platform.
Your goal is to gather specific information to recommend the best doctor.

Required Information:
1. Chief Complaint (main issue)
2. Symptoms
3. Duration
4. Severity (1-10)
5. Current Medications
6. Allergies

VALID MEDICAL SPECIALTIES (Use these EXACT slugs for "specialty"):
- general-physician (General healthcare, primary care)
- gynaecology-sexology (Women's health, reproductive care)
- dermatology (Skin, hair, nail conditions)
- psychiatry-psychology (Mental health, behavioral disorders)
- gastroenterology (Digestive system)
- pediatrics (Children's healthcare)
- ent (Ear, nose, throat)
- urology-nephrology (Urinary system, kidneys)
- orthopedics (Bone, joint disorders)
- neurology (Brain, nervous system)
- cardiology (Heart, cardiovascular)
- nutrition-diabetology (Diabetes, nutrition)
- ophthalmology (Eye, vision)
- dentistry (Oral, dental)
- pulmonology (Lungs, respiratory)
- oncology (Cancer)
- physiotherapy (Physical therapy)
- general-surgery (Surgical procedures)
- veterinary (Animals)

CRITICAL RULES:
- Keep responses SHORT and conversational (1-2 sentences max)
- Ask ONLY ONE question at a time
- Be warm and empathetic but concise
- Don't list multiple questions - just ask the next most important one
- Once you have ALL required info, output the JSON block to trigger doctor search
- The "specialty" in the JSON MUST be one of the slugs listed above.

When you have all information, output this JSON block:
```json
{"action": "recommend_doctor", "data": {"issue": "...", "symptoms": "...", "duration": "...", "severity": "...", "medications": "...", "allergies": "...", "specialty": "valid-slug-from-list"}}
```

Example conversation:
User: "I have a headache" 
You: "I'm sorry to hear that. How long have you been experiencing this headache?"
User: "3 days"
You: "On a scale of 1-10, how severe is the pain?"
"""

def _handle_response(response: SupabaseResponse) -> Any:
    if response.error:
        status_code = response.error.get("status", status.HTTP_500_INTERNAL_SERVER_ERROR)
        raise HTTPException(status_code=status_code, detail={"error": "supabase_error", "details": response.error.get("error")})
    return response.data

# Mapping from AI slugs to Database Category Names
SLUG_TO_CATEGORY = {
    "general-physician": "general-physician",
    "gynaecology-sexology": "gynaecology-sexology",
    "dermatology": "dermatology",
    "psychiatry-psychology": "psychiatry-psychology",
    "gastroenterology": "gastroenterology",
    "pediatrics": "pediatrics",
    "ent": "ent",
    "urology-nephrology": "urology-nephrology",
    "orthopedics": "orthopedics",
    "neurology": "neurology",
    "cardiology": "cardiology",
    "nutrition-diabetology": "nutrition-diabetology",
    "ophthalmology": "ophthalmology",
    "dentistry": "dentistry",
    "pulmonology": "pulmonology",
    "oncology": "oncology",
    "physiotherapy": "physiotherapy",
    "general-surgery": "general-surgery",
    "veterinary": "veterinary"
}

@router.post("/chat")
async def chat_assistant(
    payload: ChatRequest,
    token: str = Depends(get_bearer_token),
    client: SupabaseClient = Depends(get_supabase_client),
) -> Dict[str, Any]:
    # Get admin client for RLS bypass
    admin_client = get_service_role_client()

    # Get or initialize Groq client
    groq_client = get_groq_client()

    # Prepare messages for Groq
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    # Add patient context if available
    if payload.patient_context:
        context_str = f"Patient Context: Name: {payload.patient_context.get('name')}, Age: {payload.patient_context.get('age')}"
        messages.append({"role": "system", "content": context_str})

    # Append conversation history
    for msg in payload.messages:
        messages.append({"role": msg.role, "content": msg.content})

    try:
        completion = groq_client.chat.completions.create(
            model=settings.groq_model,
            messages=messages,
            temperature=0.7,
            max_completion_tokens=8192,
            top_p=1,
            reasoning_effort="medium",
            stream=False
        )
        
        ai_message = completion.choices[0].message.content
        
        # Check for action block
        action_data = None
        if "```json" in ai_message:
            try:
                json_str = ai_message.split("```json")[1].split("```")[0].strip()
                action_block = json.loads(json_str)
                if action_block.get("action") == "recommend_doctor":
                    action_data = action_block.get("data")
                    # Clean up the message to remove the JSON block from the user view if desired, 
                    # but keeping it might be fine if the frontend handles it.
                    # Let's strip it for cleaner UI.
                    ai_message = ai_message.split("```json")[0].strip()
            except Exception as e:
                print(f"Failed to parse action block: {e}")

        response = {
            "message": ai_message,
            "action": None,
            "data": None
        }

        if action_data:
            # Fetch doctors based on specialty
            specialty_slug = action_data.get("specialty")
            print(f"[DEBUG] AI inferred specialty slug: {specialty_slug}")
            
            # Map slug to DB category name
            db_category = SLUG_TO_CATEGORY.get(specialty_slug, specialty_slug)
            print(f"[DEBUG] Mapped to DB category: {db_category}")

            params = {"select": "*", "is_approved": "eq.true"}
            if db_category:
                # Use ilike for case-insensitive matching
                params["category"] = f"ilike.{db_category}"
            
            print(f"[DEBUG] Querying doctors with params: {params}")
            
            service_key = settings.supabase_service_role_key or settings.supabase_anon_key
            
            doc_resp = admin_client.request("GET", "/rest/v1/doctors", service_key, params=params)
            doctors = _handle_response(doc_resp) or []
            print(f"[DEBUG] Found {len(doctors)} doctors matching specialty")
            
            # DEBUG: If no doctors found, check if they exist but are unapproved
            if not doctors and db_category:
                debug_params = {"select": "*", "category": f"ilike.{db_category}"}
                debug_resp = admin_client.request("GET", "/rest/v1/doctors", service_key, params=debug_params)
                unapproved = _handle_response(debug_resp) or []
                if unapproved:
                    print(f"[WARNING] Found {len(unapproved)} doctors for {db_category} but they are NOT APPROVED (is_approved != true).")
                    print(f"[WARNING] Unapproved doctors: {[d.get('name') for d in unapproved]}")

            # If no doctors found for specialty, try fetching all approved
            if not doctors and db_category:
                 print(f"[DEBUG] No doctors found for {db_category} (slug: {specialty_slug}), falling back to all approved")
                 params.pop("category")
                 doc_resp = admin_client.request("GET", "/rest/v1/doctors", service_key, params=params)
                 doctors = _handle_response(doc_resp) or []
                 print(f"[DEBUG] Fallback found {len(doctors)} doctors. Available categories: {[d.get('category') for d in doctors]}")

            # Return only the FIRST matching doctor
            recommended_doctor = doctors[0] if doctors else None
            if recommended_doctor:
                print(f"[DEBUG] Recommending doctor: {recommended_doctor.get('name')} ({recommended_doctor.get('category')})")

            response["action"] = "recommend_doctor"
            response["data"] = {
                "doctors": [recommended_doctor] if recommended_doctor else [],
                "intake_summary": action_data
            }

        return response

    except Exception as e:
        print(f"Groq Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")

# --- Existing Endpoints (kept for compatibility or direct usage) ---

@router.post("/recommend")
async def assistant_recommend_doctor(
    intake: IntakePayload,
    token: str = Depends(get_bearer_token),
    client: SupabaseClient = Depends(get_supabase_client),
) -> Dict[str, Any]:
    # Legacy endpoint, simplified
    params = {"select": "*", "is_approved": "eq.true"}
    response = client.request("GET", "/rest/v1/doctors", token, params=params)
    doctors = _handle_response(response) or []
    return {"doctor": doctors[0] if doctors else None, "specialty": "General"}

@router.get("/profile")
async def assistant_get_profile(
    token: str = Depends(get_bearer_token),
    client: SupabaseClient = Depends(get_supabase_client),
) -> Dict[str, Any]:
    params = {"select": "*", "limit": 1}
    response = client.request("GET", "/rest/v1/patients", token, params=params)
    data = _handle_response(response)
    patient = (data or [None])[0]
    return {"patient": patient}

@router.patch("/profile")
async def assistant_update_profile(
    payload: UpdatesPayload,
    token: str = Depends(get_bearer_token),
    client: SupabaseClient = Depends(get_supabase_client),
) -> Dict[str, Any]:
    params = {"id": "eq.auth.uid()"}
    response = client.request("PATCH", "/rest/v1/patients", token, params=params, json=payload.updates)
    data = _handle_response(response)
    return {"updated": data}

@router.post("/doctors")
async def assistant_get_doctors(
    filters: DoctorFilters,
    token: str = Depends(get_bearer_token),
    client: SupabaseClient = Depends(get_supabase_client),
) -> Dict[str, Any]:
    params = {"select": "*", "is_approved": "eq.true"}
    if filters.category:
        params["category"] = f"eq.{filters.category}"
    response = client.request("GET", "/rest/v1/doctors", token, params=params)
    data = _handle_response(response)
    return {"doctors": data or []}

@router.post("/appointments", status_code=status.HTTP_201_CREATED)
async def assistant_create_appointment(
    payload: AppointmentPayload,
    token: str = Depends(get_bearer_token),
    client: SupabaseClient = Depends(get_supabase_client),
) -> Dict[str, Any]:
    import uuid
    appointment = {
        "id": payload.id or str(uuid.uuid4()),
        "patient_id": payload.patient_id,
        "doctor_id": payload.doctor_id,
        "patient_name": payload.patient_name,
        "doctor_name": payload.doctor_name,
        "doctor_category": payload.doctor_category,
        "datetime": payload.datetime,
        "status": "pending",
        "notes": payload.symptoms,
        "created_at": datetime.utcnow().isoformat(),
    }
    response = client.request("POST", "/rest/v1/appointments", token, json=appointment)
    data = _handle_response(response)
    return {"appointment": data}

@router.post("/admin/bootstrap-demo", tags=["Admin"], status_code=status.HTTP_201_CREATED)
async def bootstrap_demo_admin() -> dict:
    # ... (Keep existing implementation if needed, or simplify)
    return {"message": "Demo admin bootstrap not modified"}

