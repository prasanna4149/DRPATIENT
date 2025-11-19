/*
  # Healthcare Booking Platform - Complete Database Schema

  ## Overview
  This migration creates the complete database schema for a healthcare booking platform
  with patients, doctors, agents, admins, appointments, messages, and real-time chat.

  ## Tables Created

  ### 1. patients
  - `id` (uuid, primary key) - References auth.users
  - `name` (text) - Patient's full name
  - `email` (text, unique) - Patient's email
  - `age` (int) - Patient's age
  - `sex` (text) - Patient's sex (male/female/other)
  - `height` (text) - Patient's height
  - `weight` (text) - Patient's weight
  - `medications` (text) - Current medications
  - `allergies` (text) - Known allergies
  - `created_at` (timestamptz) - Record creation timestamp

  ### 2. doctors
  - `id` (uuid, primary key) - References auth.users
  - `name` (text) - Doctor's full name
  - `email` (text, unique) - Doctor's email
  - `category` (text) - Medical specialty
  - `bio` (text) - Professional bio
  - `experience` (text) - Years of experience
  - `degrees` (text) - Qualifications and certifications
  - `is_approved` (boolean) - Admin approval status
  - `created_at` (timestamptz) - Record creation timestamp

  ### 3. admins
  - `id` (uuid, primary key) - References auth.users
  - `name` (text) - Admin's full name
  - `email` (text, unique) - Admin's email
  - `created_at` (timestamptz) - Record creation timestamp

  ### 4. agents
  - `id` (uuid, primary key) - References auth.users
  - `name` (text) - Agent's full name
  - `email` (text, unique) - Agent's email
  - `location` (text) - Agent's location
  - `contact_number` (text) - Agent's contact number
  - `agent_experience` (int) - Years of experience
  - `preferred_region` (text) - Preferred working region
  - `created_at` (timestamptz) - Record creation timestamp

  ### 5. appointments
  - `id` (uuid, primary key) - Appointment ID
  - `patient_id` (uuid) - References patients
  - `doctor_id` (uuid) - References doctors
  - `patient_name` (text) - Patient's name
  - `doctor_name` (text) - Doctor's name
  - `doctor_category` (text) - Medical specialty
  - `datetime` (timestamptz) - Appointment date and time
  - `status` (text) - Status (pending/accepted/completed/cancelled/no_show)
  - `notes` (text) - Appointment notes
  - `recommendations` (text) - Doctor's recommendations
  - `prescription` (text) - Prescribed medication
  - `doctor_notes` (text) - Private doctor notes
  - `patient_review` (text) - Patient's review
  - `patient_rating` (int) - Patient's rating (1-5)
  - `patient_vitals` (jsonb) - Patient vitals (BP, temperature)
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 6. messages
  - `id` (uuid, primary key) - Message ID
  - `appointment_id` (uuid) - References appointments
  - `sender_id` (uuid) - References auth.users
  - `sender_role` (text) - Role (patient/doctor)
  - `content` (text) - Message content
  - `timestamp` (timestamptz) - Message timestamp
  - `read` (boolean) - Read status
  - `attachment_url` (text) - File attachment URL
  - `attachment_meta` (jsonb) - File metadata

  ### 7. activity_logs
  - `id` (uuid, primary key) - Log ID
  - `user_id` (uuid) - References auth.users
  - `user_role` (text) - Role (patient/doctor/admin)
  - `user_name` (text) - User's name
  - `action` (text) - Action performed
  - `details` (text) - Action details
  - `timestamp` (timestamptz) - Action timestamp

  ### 8. chat_messages
  - `id` (uuid, primary key) - Message ID
  - `sender_id` (uuid) - References auth.users
  - `receiver_id` (uuid) - References auth.users
  - `message` (text) - Message content
  - `timestamp` (timestamptz) - Message timestamp
  - `sender_name` (text) - Sender's name
  - `receiver_name` (text) - Receiver's name

  ## Security (RLS)
  - All tables have RLS enabled
  - Users can only access their own data
  - Doctors can view/update appointments assigned to them
  - Admins can approve doctors
  - Patients and doctors can message within their appointments
  - Agents and patients can chat directly

  ## Real-time Subscriptions
  - All tables are added to realtime publication for live updates
*/

-- Create patients table
CREATE TABLE IF NOT EXISTS public.patients (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  age int,
  sex text CHECK (sex IN ('male', 'female', 'other')),
  height text,
  weight text,
  medications text,
  allergies text,
  created_at timestamptz DEFAULT now()
);

-- Create doctors table
CREATE TABLE IF NOT EXISTS public.doctors (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  category text NOT NULL,
  bio text,
  experience text,
  degrees text,
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create admins table
CREATE TABLE IF NOT EXISTS public.admins (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Create agents table
CREATE TABLE IF NOT EXISTS public.agents (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  location text,
  contact_number text,
  agent_experience int,
  preferred_region text,
  created_at timestamptz DEFAULT now()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_name text NOT NULL,
  doctor_name text NOT NULL,
  doctor_category text NOT NULL,
  datetime timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled', 'no_show')),
  notes text,
  recommendations text,
  prescription text,
  doctor_notes text,
  patient_review text,
  patient_rating int CHECK (patient_rating >= 1 AND patient_rating <= 5),
  patient_vitals jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('patient', 'doctor')),
  content text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  read boolean DEFAULT false,
  attachment_url text,
  attachment_meta jsonb
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_role text NOT NULL CHECK (user_role IN ('patient', 'doctor', 'admin')),
  user_name text NOT NULL,
  action text NOT NULL,
  details text,
  timestamp timestamptz DEFAULT now()
);

-- Create chat_messages table (for patient-agent direct messaging)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  sender_name text,
  receiver_name text
);

-- Enable Row Level Security on all tables
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for patients
CREATE POLICY "Users can view own patient profile"
  ON public.patients FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own patient profile"
  ON public.patients FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own patient profile"
  ON public.patients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for doctors
CREATE POLICY "Users can view own doctor profile"
  ON public.doctors FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "All authenticated users can view approved doctors"
  ON public.doctors FOR SELECT
  TO authenticated
  USING (is_approved = true);

CREATE POLICY "Users can update own doctor profile"
  ON public.doctors FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own doctor profile"
  ON public.doctors FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can approve doctors"
  ON public.doctors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.id = auth.uid()
    )
  );

-- RLS Policies for admins
CREATE POLICY "Users can view own admin profile"
  ON public.admins FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own admin profile"
  ON public.admins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for agents
CREATE POLICY "Users can view own agent profile"
  ON public.agents FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "All authenticated users can view agents"
  ON public.agents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own agent profile"
  ON public.agents FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own agent profile"
  ON public.agents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for appointments
CREATE POLICY "Users can view own appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (
    patient_id = auth.uid() OR 
    doctor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.id = auth.uid()
    )
  );

CREATE POLICY "Patients can create appointments"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Doctors can update appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Patients can update appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- RLS Policies for messages
CREATE POLICY "Users can view appointment messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = messages.appointment_id
      AND (appointments.patient_id = auth.uid() OR appointments.doctor_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = messages.appointment_id
      AND (appointments.patient_id = auth.uid() OR appointments.doctor_id = auth.uid())
    )
  );

-- RLS Policies for activity_logs
CREATE POLICY "Admins can view all activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.id = auth.uid()
    )
  );

CREATE POLICY "Users can view own activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert activity logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for chat_messages
CREATE POLICY "Users can view direct chats"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send direct messages"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update own messages read status"
  ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_datetime ON public.appointments(datetime);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_messages_appointment_id ON public.messages(appointment_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_id ON public.chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.patients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;