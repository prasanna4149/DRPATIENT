-- Add RLS policy for admins to view all doctors
CREATE POLICY "Admins can view all doctors"
  ON public.doctors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.id = auth.uid()
    )
  );
