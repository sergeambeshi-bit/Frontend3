import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

export const supabase = createClient(
  "https://jigkbxgvojwdiwnxpwoa.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppZ2tieGd2b2p3ZGl3bnhwd29hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MTQxNDQsImV4cCI6MjA5MDM5MDE0NH0.he_LHz8xddwaMwQfTj9fV20TbFQdpgAdGyEmR9I1NAM"
);