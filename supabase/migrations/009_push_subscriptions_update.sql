-- upsert requires UPDATE permission in addition to INSERT.
-- The original policy set was missing FOR UPDATE, causing the
-- ON CONFLICT DO UPDATE path to fail with an RLS violation.
CREATE POLICY "push_update" ON public.push_subscriptions
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
