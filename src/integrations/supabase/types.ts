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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          mode: string
          provider: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode?: string
          provider?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          provider?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachments: Json
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          metadata: Json
          result_type: string | null
          result_url: string | null
          result_urls: Json
          role: string
        }
        Insert: {
          attachments?: Json
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json
          result_type?: string | null
          result_url?: string | null
          result_urls?: Json
          role: string
        }
        Update: {
          attachments?: Json
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          result_type?: string | null
          result_url?: string | null
          result_urls?: Json
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_video_projects: {
        Row: {
          aspect_ratio: string | null
          created_at: string
          duration_seconds: number | null
          error_message: string | null
          has_audio: boolean | null
          has_overlay: boolean | null
          id: string
          message_id: string | null
          output_url: string | null
          overlay_config: Json | null
          provider: string
          scenes_done: number
          status: string
          thumbnail_url: string | null
          title: string
          total_scenes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          aspect_ratio?: string | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          has_audio?: boolean | null
          has_overlay?: boolean | null
          id?: string
          message_id?: string | null
          output_url?: string | null
          overlay_config?: Json | null
          provider?: string
          scenes_done?: number
          status?: string
          thumbnail_url?: string | null
          title?: string
          total_scenes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          aspect_ratio?: string | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          has_audio?: boolean | null
          has_overlay?: boolean | null
          id?: string
          message_id?: string | null
          output_url?: string | null
          overlay_config?: Json | null
          provider?: string
          scenes_done?: number
          status?: string
          thumbnail_url?: string | null
          title?: string
          total_scenes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_video_projects_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_video_scenes: {
        Row: {
          clip_url: string | null
          created_at: string
          duration: number
          error_msg: string | null
          fal_req_id: string | null
          id: string
          image_url: string | null
          overlay: Json | null
          project_id: string
          prompt: string
          scene_index: number
          status: string
        }
        Insert: {
          clip_url?: string | null
          created_at?: string
          duration?: number
          error_msg?: string | null
          fal_req_id?: string | null
          id?: string
          image_url?: string | null
          overlay?: Json | null
          project_id: string
          prompt: string
          scene_index: number
          status?: string
        }
        Update: {
          clip_url?: string | null
          created_at?: string
          duration?: number
          error_msg?: string | null
          fal_req_id?: string | null
          id?: string
          image_url?: string | null
          overlay?: Json | null
          project_id?: string
          prompt?: string
          scene_index?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_video_scenes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "chat_video_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          created_at: string
          delta: number
          id: string
          project_id: string | null
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          project_id?: string | null
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          project_id?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_images: {
        Row: {
          cost_usd: number
          created_at: string
          error_message: string | null
          has_overlay: boolean
          id: string
          image_url: string
          model: string
          overlay_cfg: Json
          prompt: string
          provider: string
          status: string
          user_id: string
        }
        Insert: {
          cost_usd?: number
          created_at?: string
          error_message?: string | null
          has_overlay?: boolean
          id?: string
          image_url: string
          model?: string
          overlay_cfg?: Json
          prompt: string
          provider?: string
          status?: string
          user_id: string
        }
        Update: {
          cost_usd?: number
          created_at?: string
          error_message?: string | null
          has_overlay?: boolean
          id?: string
          image_url?: string
          model?: string
          overlay_cfg?: Json
          prompt?: string
          provider?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_videos: {
        Row: {
          created_at: string
          duration_s: number | null
          error_message: string | null
          external_id: string | null
          has_overlay: boolean
          id: string
          model: string
          overlay_cfg: Json
          prompt: string
          provider: string
          status: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          duration_s?: number | null
          error_message?: string | null
          external_id?: string | null
          has_overlay?: boolean
          id?: string
          model: string
          overlay_cfg?: Json
          prompt: string
          provider: string
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          duration_s?: number | null
          error_message?: string | null
          external_id?: string | null
          has_overlay?: boolean
          id?: string
          model?: string
          overlay_cfg?: Json
          prompt?: string
          provider?: string
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits: number
          display_name: string | null
          id: string
          total_spent_usd: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          display_name?: string | null
          id?: string
          total_spent_usd?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          display_name?: string | null
          id?: string
          total_spent_usd?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_scenes: {
        Row: {
          cost_usd: number
          created_at: string
          duration_s: number
          fal_request_id: string | null
          id: string
          image_url: string | null
          project_id: string
          prompt: string
          scene_index: number
          status: Database["public"]["Enums"]["scene_status"]
          updated_at: string
          video_clip_url: string | null
        }
        Insert: {
          cost_usd?: number
          created_at?: string
          duration_s?: number
          fal_request_id?: string | null
          id?: string
          image_url?: string | null
          project_id: string
          prompt: string
          scene_index: number
          status?: Database["public"]["Enums"]["scene_status"]
          updated_at?: string
          video_clip_url?: string | null
        }
        Update: {
          cost_usd?: number
          created_at?: string
          duration_s?: number
          fal_request_id?: string | null
          id?: string
          image_url?: string | null
          project_id?: string
          prompt?: string
          scene_index?: number
          status?: Database["public"]["Enums"]["scene_status"]
          updated_at?: string
          video_clip_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_scenes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          duration_s: number | null
          error_message: string | null
          id: string
          num_scenes: number
          prompt: string
          status: Database["public"]["Enums"]["project_status"]
          thumbnail_url: string | null
          title: string
          total_cost_usd: number
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          duration_s?: number | null
          error_message?: string | null
          id?: string
          num_scenes?: number
          prompt: string
          status?: Database["public"]["Enums"]["project_status"]
          thumbnail_url?: string | null
          title?: string
          total_cost_usd?: number
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          duration_s?: number | null
          error_message?: string | null
          id?: string
          num_scenes?: number
          prompt?: string
          status?: Database["public"]["Enums"]["project_status"]
          thumbnail_url?: string | null
          title?: string
          total_cost_usd?: number
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      project_status:
        | "draft"
        | "generating_script"
        | "generating_images"
        | "generating_clips"
        | "composing"
        | "ready"
        | "failed"
      scene_status:
        | "pending"
        | "generating_image"
        | "generating_clip"
        | "ready"
        | "failed"
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
    Enums: {
      project_status: [
        "draft",
        "generating_script",
        "generating_images",
        "generating_clips",
        "composing",
        "ready",
        "failed",
      ],
      scene_status: [
        "pending",
        "generating_image",
        "generating_clip",
        "ready",
        "failed",
      ],
    },
  },
} as const
