-- Storage policies for comprovantes bucket
-- Allow authenticated users to upload, view, update, and delete

DO $$
BEGIN
  -- Insert policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload comprovantes') THEN
    CREATE POLICY "Users can upload comprovantes" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'comprovantes');
  END IF;

  -- Select policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view comprovantes') THEN
    CREATE POLICY "Users can view comprovantes" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'comprovantes');
  END IF;

  -- Update policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update comprovantes') THEN
    CREATE POLICY "Users can update comprovantes" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'comprovantes');
  END IF;

  -- Delete policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete comprovantes') THEN
    CREATE POLICY "Users can delete comprovantes" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'comprovantes');
  END IF;
END
$$;
