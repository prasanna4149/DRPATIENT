"""Supabase-backed health assistant endpoints."""
from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from datetime import datetime
import os
import requests

from ..config import settings
from ..dependencies import get_bearer_token, get_supabase_client
from ..services.supabase import SupabaseClient, SupabaseResponse

router = APIRouter(prefix="/api/assistant", tags=["Assistant"])


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


SPECIALTY_KEYWORDS: dict[str, list[str]] = {
    "Cardiology": ["heart", "chest pain", "palpitation", "bp", "blood pressure", "hypertension", "stroke"],
    "Dermatology": ["skin", "rash", "itch", "acne", "psoriasis", "eczema", "hair", "nail"],
    "Neurology": ["headache", "migraine", "seizure", "stroke", "numbness", "tingling", "memory", "brain"],
    "Pulmonology": ["cough", "breath", "asthma", "wheezing", "lung", "chest tightness"],
    "Orthopedics": ["joint", "knee", "hip", "back pain", "fracture", "bone", "spine"],
    "Ophthalmology": ["eye", "vision", "blurry", "red eye", "dry eye", "cataract"],
    "ENT": ["ear", "nose", "throat", "sinus", "hearing", "tonsil", "ringing"],
    "Gastroenterology": ["stomach", "abdomen", "liver", "digestion", "ulcer", "vomit", "nausea"],
    "Psychiatry": ["anxiety", "depression", "stress", "sleep", "mental", "panic", "trauma"],
    "Endocrinology": ["diabetes", "thyroid", "hormone", "weight gain", "pcos"],
    "Nephrology": ["kidney", "urine", "dialysis", "renal", "stones"],
    "Urology": ["urine", "prostate", "bladder", "stones", "incontinence"],
    "Pediatrics": ["child", "baby", "infant", "pediatric"],
}


def infer_specialty(text: str) -> Optional[str]:
    text = (text or "").lower()
    best: tuple[str, int] | None = None
    for specialty, keywords in SPECIALTY_KEYWORDS.items():
        score = sum(1 for k in keywords if k in text)
        if best is None or score > best[1]:
            best = (specialty, score)
    return best[0] if best and best[1] > 0 else None


@router.post("/recommend")
async def assistant_recommend_doctor(
    intake: IntakePayload,
    token: str = Depends(get_bearer_token),
    client: SupabaseClient = Depends(get_supabase_client),
) -> Dict[str, Any]:
    specialty = infer_specialty(f"{intake.issue or ''} {intake.symptoms or ''}")
    params: Dict[str, Any] = {"select": "id,name,email,category,bio,experience,degrees", "is_approved": "eq.true"}
    if specialty:
        params["category"] = f"eq.{specialty}"
    response = client.request("GET", "/rest/v1/doctors", token, params=params)
    data = _handle_response(response) or []
    doctors = data
    if intake.exclude_doctor_id:
        doctors = [d for d in doctors if d.get("id") != intake.exclude_doctor_id]
    if not doctors:
        return {"doctor": None, "specialty": specialty}
    return {"doctor": doctors[0], "specialty": specialty}


class AppointmentPayload(BaseModel):
    patient_id: str
    doctor_id: str
    patient_name: str
    doctor_name: str
    doctor_category: str
    datetime: str
    symptoms: Optional[str] = None
    id: Optional[str] = None


def _handle_response(response: SupabaseResponse) -> Any:
    if response.error:
        status_code = response.error.get("status", status.HTTP_500_INTERNAL_SERVER_ERROR)
        raise HTTPException(status_code=status_code, detail={"error": "supabase_error", "details": response.error.get("error")})
    return response.data


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
        "recommendations": None,
        "prescription": None,
        "doctor_notes": None,
        "patient_review": None,
        "patient_rating": None,
        "patient_vitals": None,
        "created_at": None,
        "updated_at": None,
    }
    response = client.request("POST", "/rest/v1/appointments", token, json=appointment)
    data = _handle_response(response)
    return {"appointment": data}


@router.post("/admin/bootstrap-demo", tags=["Admin"], status_code=status.HTTP_201_CREATED)
async def bootstrap_demo_admin() -> dict:
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY")
    if not (settings.supabase_url and service_key):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail={
            "error": "service_key_missing",
            "message": "SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_SERVICE_ROLE_KEY) and SUPABASE_URL must be set",
        })

    email = os.getenv("DEMO_ADMIN_EMAIL", "admin@demo.local")
    password = os.getenv("DEMO_ADMIN_PASSWORD", "Admin@12345")
    name = os.getenv("DEMO_ADMIN_NAME", "Demo Admin")

    headers = {"Authorization": f"Bearer {service_key}", "apikey": service_key, "Content-Type": "application/json"}

    # Create auth user (idempotent: if exists, Supabase returns 409 or existing user)
    create_payload = {
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {"role": "admin", "name": name},
    }
    auth_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/users"
    resp = requests.post(auth_url, headers=headers, json=create_payload, timeout=20)
    if resp.status_code not in (200, 201):
        # If user already exists, try to fetch by email
        if resp.status_code == 409:
            list_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/users"
            list_resp = requests.get(list_url, headers=headers, timeout=20)
            if not list_resp.ok:
                raise HTTPException(status_code=resp.status_code, detail={"error": "auth_admin_error", "details": resp.text})
            users = list_resp.json()
            admin = next((u for u in users if u.get("email") == email), None)
            if not admin:
                raise HTTPException(status_code=resp.status_code, detail={"error": "auth_admin_error", "details": resp.text})
            user_id = admin["id"]
        else:
            raise HTTPException(status_code=resp.status_code, detail={"error": "auth_admin_error", "details": resp.text})
    else:
        user_id = resp.json().get("id")

    # Insert admin profile row using service role (bypass RLS)
    admin_row = {"id": user_id, "name": name, "email": email, "created_at": datetime.utcnow().isoformat()}
    rest_url = f"{settings.supabase_url.rstrip('/')}/rest/v1/admins"
    rest_headers = headers
    rest_params = {"select": "*"}
    rest_resp = requests.post(rest_url, headers=rest_headers, params=rest_params, json=admin_row, timeout=20)
    if not rest_resp.ok and rest_resp.status_code != 409:
        raise HTTPException(status_code=rest_resp.status_code, detail={"error": "rest_insert_error", "details": rest_resp.text})

    return {"email": email, "password": password, "id": user_id}
