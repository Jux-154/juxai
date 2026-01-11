export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      hashtags: {
        Row: {
          id: string
          name: string
          use_count: number
        }
        Insert: {
          id?: string
          name: string
          use_count?: number
        }
        Update: {
          id?: string
          name?: string
          use_count?: number
        }
        Relationships: []
      }
      image_requests: {
        Row: {
          created_at: string | null
          id: string
          image_base64: string | null
          input_image: string | null
          negative: string | null
          progress: number | null
          prompt: string
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_base64?: string | null
          input_image?: string | null
          negative?: string | null
          progress?: number | null
          prompt: string
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_base64?: string | null
          input_image?: string | null
          negative?: string | null
          progress?: number | null
          prompt?: string
          status?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          publication_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          publication_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          publication_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
        ]
      }
      message_queue: {
        Row: {
          created_at: string
          id: string
          is_processed: boolean
          position: number
          room_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_processed?: boolean
          position: number
          room_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_processed?: boolean
          position?: number
          room_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          pseudo: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pseudo?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pseudo?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      publication_hashtags: {
        Row: {
          hashtag_id: string
          id: string
          publication_id: string
        }
        Insert: {
          hashtag_id: string
          id?: string
          publication_id: string
        }
        Update: {
          hashtag_id?: string
          id?: string
          publication_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_hashtags_hashtag_id_fkey"
            columns: ["hashtag_id"]
            isOneToOne: false
            referencedRelation: "hashtags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_hashtags_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
        ]
      }
      publications: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_id: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_id: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publications_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: true
            referencedRelation: "user_images"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          created_at: string
          id: string
          imput_message: Json | null
          model: string | null
          prompt: string
          response: string | null
          search_results: Json | null
          status: string
          updated_at: string
          use_web_search: boolean | null
        }
        Insert: {
          created_at?: string
          id?: string
          imput_message?: Json | null
          model?: string | null
          prompt: string
          response?: string | null
          search_results?: Json | null
          status?: string
          updated_at?: string
          use_web_search?: boolean | null
        }
        Update: {
          created_at?: string
          id?: string
          imput_message?: Json | null
          model?: string | null
          prompt?: string
          response?: string | null
          search_results?: Json | null
          status?: string
          updated_at?: string
          use_web_search?: boolean | null
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          created_at: string
          credits: number
          id: string
          last_reset_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits?: number
          id?: string
          last_reset_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          last_reset_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_images: {
        Row: {
          created_at: string
          id: string
          prompt: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prompt: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          avatar_url: string | null
          created_at: string
          feed_mode: string
          id: string
          pseudo: string | null
          pseudo_changed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          feed_mode?: string
          id?: string
          pseudo?: string | null
          pseudo_changed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          feed_mode?: string
          id?: string
          pseudo?: string | null
          pseudo_changed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      viewed_publications: {
        Row: {
          id: string
          publication_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          publication_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          publication_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "viewed_publications_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_change_pseudo: { Args: { check_user_id: string }; Returns: boolean }
      check_pseudo_available: {
        Args: { check_pseudo: string; current_user_id: string }
        Returns: boolean
      }
      cleanup_expired_rooms: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
