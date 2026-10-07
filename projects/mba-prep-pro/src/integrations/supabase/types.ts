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
      ai_configurations: {
        Row: {
          created_at: string | null
          created_by: string | null
          guardrails: Json | null
          id: string
          is_active: boolean | null
          name: string
          system_prompt: string
          tools_config: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          guardrails?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          system_prompt: string
          tools_config?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          guardrails?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          system_prompt?: string
          tools_config?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      beta_whitelist: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_at?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          comment: string | null
          context: Database["public"]["Enums"]["feedback_context"]
          created_at: string
          id: string
          rating: number | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          context: Database["public"]["Enums"]["feedback_context"]
          created_at?: string
          id?: string
          rating?: number | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          context?: Database["public"]["Enums"]["feedback_context"]
          created_at?: string
          id?: string
          rating?: number | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_questions: {
        Row: {
          category: string
          created_at: string
          difficulty_level: string
          expected_duration_minutes: number | null
          id: string
          question_text: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          difficulty_level?: string
          expected_duration_minutes?: number | null
          id?: string
          question_text: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          difficulty_level?: string
          expected_duration_minutes?: number | null
          id?: string
          question_text?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      interview_responses: {
        Row: {
          created_at: string
          duration_seconds: number | null
          feedback: string | null
          id: string
          question_id: string
          response_audio_path: string | null
          response_text: string | null
          response_video_path: string | null
          score: number | null
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          feedback?: string | null
          id?: string
          question_id: string
          response_audio_path?: string | null
          response_text?: string | null
          response_video_path?: string | null
          score?: number | null
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          feedback?: string | null
          id?: string
          question_id?: string
          response_audio_path?: string | null
          response_text?: string | null
          response_video_path?: string | null
          score?: number | null
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "interview_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          detailed_evaluation: Json | null
          duration_minutes: number | null
          feedback: Json | null
          id: string
          overall_score: number | null
          presence_score: number | null
          session_type: string
          started_at: string | null
          status: string
          structure_score: number | null
          substance_score: number | null
          top_opportunities: Json | null
          transcript: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          detailed_evaluation?: Json | null
          duration_minutes?: number | null
          feedback?: Json | null
          id?: string
          overall_score?: number | null
          presence_score?: number | null
          session_type: string
          started_at?: string | null
          status?: string
          structure_score?: number | null
          substance_score?: number | null
          top_opportunities?: Json | null
          transcript?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          detailed_evaluation?: Json | null
          duration_minutes?: number | null
          feedback?: Json | null
          id?: string
          overall_score?: number | null
          presence_score?: number | null
          session_type?: string
          started_at?: string | null
          status?: string
          structure_score?: number | null
          substance_score?: number | null
          top_opportunities?: Json | null
          transcript?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          career_objectives: string | null
          created_at: string
          education_background: string | null
          email: string | null
          first_name: string | null
          id: string
          industry_experience: string[] | null
          interviews_limit: number | null
          interviews_used: number | null
          last_name: string | null
          leadership_examples: string | null
          processed_skills: string[] | null
          resume_metadata: Json | null
          resume_processed_at: string | null
          schools_limit: number | null
          subscription_tier: string | null
          tier_purchased_at: string | null
          updated_at: string
          user_id: string
          work_experience_summary: string | null
        }
        Insert: {
          career_objectives?: string | null
          created_at?: string
          education_background?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          industry_experience?: string[] | null
          interviews_limit?: number | null
          interviews_used?: number | null
          last_name?: string | null
          leadership_examples?: string | null
          processed_skills?: string[] | null
          resume_metadata?: Json | null
          resume_processed_at?: string | null
          schools_limit?: number | null
          subscription_tier?: string | null
          tier_purchased_at?: string | null
          updated_at?: string
          user_id: string
          work_experience_summary?: string | null
        }
        Update: {
          career_objectives?: string | null
          created_at?: string
          education_background?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          industry_experience?: string[] | null
          interviews_limit?: number | null
          interviews_used?: number | null
          last_name?: string | null
          leadership_examples?: string | null
          processed_skills?: string[] | null
          resume_metadata?: Json | null
          resume_processed_at?: string | null
          schools_limit?: number | null
          subscription_tier?: string | null
          tier_purchased_at?: string | null
          updated_at?: string
          user_id?: string
          work_experience_summary?: string | null
        }
        Relationships: []
      }
      school_interview_questions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          questions_text: string
          school_id: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          questions_text: string
          school_id?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          questions_text?: string
          school_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_interview_questions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          acceptance_rate: string | null
          avg_gmat: number | null
          created_at: string
          description: string | null
          id: number
          interview_style: string | null
          location: string | null
          name: string
          program: string | null
          ranking: number | null
          required_documents: string[] | null
          specialties: string[] | null
          type: string
          updated_at: string
        }
        Insert: {
          acceptance_rate?: string | null
          avg_gmat?: number | null
          created_at?: string
          description?: string | null
          id?: number
          interview_style?: string | null
          location?: string | null
          name: string
          program?: string | null
          ranking?: number | null
          required_documents?: string[] | null
          specialties?: string[] | null
          type: string
          updated_at?: string
        }
        Update: {
          acceptance_rate?: string | null
          avg_gmat?: number | null
          created_at?: string
          description?: string | null
          id?: number
          interview_style?: string | null
          location?: string | null
          name?: string
          program?: string | null
          ranking?: number | null
          required_documents?: string[] | null
          specialties?: string[] | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      study_materials: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          description: string | null
          difficulty_level: string | null
          id: string
          is_published: boolean
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          id?: string
          is_published?: boolean
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          id?: string
          is_published?: boolean
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_notes: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          created_at: string
          id: string
          message: string
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          id?: string
          message: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          id?: string
          message?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_schools: {
        Row: {
          application_status: string | null
          created_at: string
          id: string
          interviews_limit: number | null
          interviews_used: number | null
          materials_processed_at: string | null
          materials_summary: string | null
          school_id: number
          user_id: string
        }
        Insert: {
          application_status?: string | null
          created_at?: string
          id?: string
          interviews_limit?: number | null
          interviews_used?: number | null
          materials_processed_at?: string | null
          materials_summary?: string | null
          school_id: number
          user_id: string
        }
        Update: {
          application_status?: string | null
          created_at?: string
          id?: string
          interviews_limit?: number | null
          interviews_used?: number | null
          materials_processed_at?: string | null
          materials_summary?: string | null
          school_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_schools_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_ai_configuration: {
        Args: { _config_id: string }
        Returns: undefined
      }
      can_select_school: { Args: { _user_id: string }; Returns: boolean }
      delete_user_account: { Args: never; Returns: undefined }
      get_tier_limits: {
        Args: { _tier: string }
        Returns: {
          interviews_per_school: number
          schools_limit: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_email_whitelisted: { Args: { _email: string }; Returns: boolean }
      needs_resume_processing: {
        Args: { _document_updated_at: string; _user_id: string }
        Returns: boolean
      }
      purchase_additional_interview: {
        Args: { _school_id: number; _user_id: string }
        Returns: undefined
      }
      update_candidate_metadata: {
        Args: {
          _education: string
          _experience_summary: string
          _industries: string[]
          _leadership: string
          _metadata: Json
          _objectives: string
          _skills: string[]
          _user_id: string
        }
        Returns: undefined
      }
      upgrade_user_tier: {
        Args: { _new_tier: string; _user_id: string }
        Returns: undefined
      }
      use_school_interview: {
        Args: { _school_id: number; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      feedback_context: "dashboard" | "post_interview" | "report_review"
      ticket_category: "bug" | "question" | "feature_request" | "other"
      ticket_status: "open" | "in_progress" | "resolved"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
      feedback_context: ["dashboard", "post_interview", "report_review"],
      ticket_category: ["bug", "question", "feature_request", "other"],
      ticket_status: ["open", "in_progress", "resolved"],
    },
  },
} as const
