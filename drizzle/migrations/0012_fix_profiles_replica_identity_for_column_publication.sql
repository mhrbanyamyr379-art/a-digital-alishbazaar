-- The safe-column realtime publication cannot cover REPLICA IDENTITY FULL,
-- which made every UPDATE on profiles fail. Primary key identity is enough.
ALTER TABLE public.profiles REPLICA IDENTITY DEFAULT;
