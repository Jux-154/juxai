-- Ajouter pseudo à la table profiles ou créer si n'existe pas
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  pseudo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies pour profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Créer la table des salons multi
CREATE TABLE public.multi_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  current_speaker_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.multi_rooms ENABLE ROW LEVEL SECURITY;

-- Policies pour multi_rooms
CREATE POLICY "Anyone can view active rooms" ON public.multi_rooms
  FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can create rooms" ON public.multi_rooms
  FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host can update own room" ON public.multi_rooms
  FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Host can delete own room" ON public.multi_rooms
  FOR DELETE USING (auth.uid() = host_id);

-- Créer la table des membres de salon
CREATE TABLE public.room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.multi_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'guest' CHECK (role IN ('admin', 'guest')),
  queue_position INTEGER,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(room_id, user_id)
);

-- Enable RLS
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

-- Policies pour room_members
CREATE POLICY "Anyone can view room members" ON public.room_members
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join rooms" ON public.room_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms" ON public.room_members
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Host can manage members" ON public.room_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.multi_rooms 
      WHERE id = room_id AND host_id = auth.uid()
    )
  );

-- Créer la table des messages de salon
CREATE TABLE public.room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.multi_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_ai_response BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- Policies pour room_messages
CREATE POLICY "Room members can view messages" ON public.room_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.room_members 
      WHERE room_id = room_messages.room_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Room members can send messages" ON public.room_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.room_members 
      WHERE room_id = room_messages.room_id AND user_id = auth.uid()
    )
  );

-- File d'attente pour les messages
CREATE TABLE public.message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.multi_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL,
  is_processed BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.message_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can view queue" ON public.message_queue
  FOR SELECT USING (true);

CREATE POLICY "Room members can join queue" ON public.message_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queue entry" ON public.message_queue
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own queue entry" ON public.message_queue
  FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.multi_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Set REPLICA IDENTITY FULL for realtime
ALTER TABLE public.multi_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.room_members REPLICA IDENTITY FULL;
ALTER TABLE public.room_messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_queue REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Trigger pour updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_multi_rooms_updated_at
  BEFORE UPDATE ON public.multi_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();