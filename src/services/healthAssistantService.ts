import { supabase } from '../lib/supabaseClient';

export type AssistantState =
  | 'idle'
  | 'fetching_profile'
  | 'profile_incomplete'
  | 'collecting_missing_fields'
  | 'asking_symptoms'
  | 'asking_severity'
  | 'asking_duration'
  | 'asking_budget'
  | 'fetching_doctors'
  | 'suggesting_doctor'
  | 'awaiting_payment'
  | 'booking_appointment'
  | 'completed';

export interface AssistantProfile {
  id: string;
  name: string;
  email: string;
  age?: number | null;
  height?: string | null;
  weight?: string | null;
  sex?: string | null;
}

export interface AssistantDoctor {
  id: string;
  name: string;
  email?: string | null;
  category: string;
  bio?: string | null;
  experience?: string | null;
}

export interface AssistantAppointmentPayload {
  patient_id: string;
  doctor_id: string;
  patient_name: string;
  doctor_name: string;
  doctor_category: string;
  datetime: string;
  symptoms?: string;
  severity?: number;
  duration?: string;
}

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function authedFetch(path: string, options: RequestInit = {}) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('User is not authenticated');
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorBody: any = null;
    try {
      errorBody = await response.json();
    } catch {
      // ignore
    }
    console.error('Assistant API error', response.status, errorBody);
    throw new Error(errorBody?.message || errorBody?.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function fetchAssistantProfile(): Promise<AssistantProfile | null> {
  const data = await authedFetch('/api/assistant/profile', {
    method: 'GET',
  });
  const patient = data.patient as any | null;
  if (!patient) return null;
  return {
    id: patient.id,
    name: patient.name,
    email: patient.email,
    age: patient.age ?? null,
    height: patient.height ?? null,
    weight: patient.weight ?? null,
    sex: patient.sex ?? null,
  };
}

export async function updateAssistantProfile(updates: Partial<AssistantProfile>): Promise<void> {
  const payload: any = {};
  if (updates.age !== undefined) payload.age = updates.age;
  if (updates.height !== undefined) payload.height = updates.height;
  if (updates.weight !== undefined) payload.weight = updates.weight;
  if (updates.sex !== undefined) payload.sex = updates.sex;

  if (Object.keys(payload).length === 0) return;

  await authedFetch('/api/assistant/profile', {
    method: 'PATCH',
    body: JSON.stringify({ updates: payload }),
  });
}

export async function fetchAssistantDoctors(category?: string): Promise<AssistantDoctor[]> {
  const body: any = {};
  if (category) body.category = category;

  const data = await authedFetch('/api/assistant/doctors', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const docs = (data.doctors as any[]) || [];
  return docs.map((d) => ({
    id: d.id,
    name: d.name,
    email: d.email,
    category: d.category,
    bio: d.bio,
    experience: d.experience,
  }));
}

export async function createAssistantAppointment(payload: AssistantAppointmentPayload) {
  const data = await authedFetch('/api/assistant/appointments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.appointment;
}
