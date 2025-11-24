-- Add RLS policy for admins to view all patients
CREATE POLICY "Admins can view all patients"
  ON public.patients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.id = auth.uid()
    )
  );

-- Add RLS policy for agents to view all patients
CREATE POLICY "Agents can view all patients"
  ON public.patients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = auth.uid()
    )
  );

-- Add RLS policy for admins to view all messages
CREATE POLICY "Admins can view all messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.id = auth.uid()
    )
  );

-- Add RLS policy for admins to view all appointments (Existing policy might cover it, but ensuring explicit access)
-- The existing policy "Users can view own appointments" includes an admin check:
-- EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid())
-- So appointments are covered.

-- Add RLS policy for agents to view all doctors (if not already covered by "All authenticated users can view approved doctors")
-- Agents might need to see unapproved doctors? Probably not.
-- But let's ensure Agents can see all approved doctors. The existing policy:
-- "All authenticated users can view approved doctors" covers this.
