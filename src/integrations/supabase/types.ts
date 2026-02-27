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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_advisor_cache: {
        Row: {
          created_at: string
          domain_name: string
          id: string
          response: Json
        }
        Insert: {
          created_at?: string
          domain_name: string
          id?: string
          response: Json
        }
        Update: {
          created_at?: string
          domain_name?: string
          id?: string
          response?: Json
        }
        Relationships: []
      }
      auctions: {
        Row: {
          auction_type: string | null
          bid_count: number
          brandability_score: number | null
          created_at: string
          domain_age: number | null
          domain_name: string
          domain_risk: Json | null
          end_time: string | null
          id: string
          inventory_source: string | null
          price: number
          pronounceability_score: number | null
          scores_computed_at: string | null
          tld: string | null
          trademark_risk: string | null
          traffic_count: number
          updated_at: string
          valuation: number | null
        }
        Insert: {
          auction_type?: string | null
          bid_count?: number
          brandability_score?: number | null
          created_at?: string
          domain_age?: number | null
          domain_name: string
          domain_risk?: Json | null
          end_time?: string | null
          id?: string
          inventory_source?: string | null
          price?: number
          pronounceability_score?: number | null
          scores_computed_at?: string | null
          tld?: string | null
          trademark_risk?: string | null
          traffic_count?: number
          updated_at?: string
          valuation?: number | null
        }
        Update: {
          auction_type?: string | null
          bid_count?: number
          brandability_score?: number | null
          created_at?: string
          domain_age?: number | null
          domain_name?: string
          domain_risk?: Json | null
          end_time?: string | null
          id?: string
          inventory_source?: string | null
          price?: number
          pronounceability_score?: number | null
          scores_computed_at?: string | null
          tld?: string | null
          trademark_risk?: string | null
          traffic_count?: number
          updated_at?: string
          valuation?: number | null
        }
        Relationships: []
      }
      comparable_sales: {
        Row: {
          created_at: string
          domain_name: string
          id: string
          notes: string | null
          sale_date: string | null
          sale_price: number
          tld: string | null
          venue: string | null
        }
        Insert: {
          created_at?: string
          domain_name: string
          id?: string
          notes?: string | null
          sale_date?: string | null
          sale_price: number
          tld?: string | null
          venue?: string | null
        }
        Update: {
          created_at?: string
          domain_name?: string
          id?: string
          notes?: string | null
          sale_date?: string | null
          sale_price?: number
          tld?: string | null
          venue?: string | null
        }
        Relationships: []
      }
      csv_upload_jobs: {
        Row: {
          created_at: string
          error_count: number | null
          error_message: string | null
          id: string
          inserted_rows: number | null
          inventory_source: string
          processed_rows: number | null
          status: string
          total_rows: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_count?: number | null
          error_message?: string | null
          id?: string
          inserted_rows?: number | null
          inventory_source?: string
          processed_rows?: number | null
          status?: string
          total_rows?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_count?: number | null
          error_message?: string | null
          id?: string
          inserted_rows?: number | null
          inventory_source?: string
          processed_rows?: number | null
          status?: string
          total_rows?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dismissed_domains: {
        Row: {
          dismissed_at: string
          domain_name: string
          id: string
          user_id: string
        }
        Insert: {
          dismissed_at?: string
          domain_name: string
          id?: string
          user_id: string
        }
        Update: {
          dismissed_at?: string
          domain_name?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      emailed_domains: {
        Row: {
          auction_id: string
          domain_name: string
          emailed_at: string
          id: string
          pattern_id: string
          user_id: string
        }
        Insert: {
          auction_id: string
          domain_name: string
          emailed_at?: string
          id?: string
          pattern_id: string
          user_id: string
        }
        Update: {
          auction_id?: string
          domain_name?: string
          emailed_at?: string
          id?: string
          pattern_id?: string
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          auction_id: string | null
          created_at: string
          domain_name: string
          id: string
          user_id: string
        }
        Insert: {
          auction_id?: string | null
          created_at?: string
          domain_name: string
          id?: string
          user_id: string
        }
        Update: {
          auction_id?: string | null
          created_at?: string
          domain_name?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      generator_sessions: {
        Row: {
          competitors: string | null
          created_at: string
          id: string
          industry: string | null
          input_mode: string
          inspired_by: string | null
          keywords: string | null
          session_name: string
          style: string
          suggestions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          competitors?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          input_mode?: string
          inspired_by?: string | null
          keywords?: string | null
          session_name?: string
          style?: string
          suggestions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          competitors?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          input_mode?: string
          inspired_by?: string | null
          keywords?: string | null
          session_name?: string
          style?: string
          suggestions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pattern_alerts: {
        Row: {
          alerted_at: string
          auction_id: string
          domain_name: string
          id: string
          pattern_id: string
          user_id: string
        }
        Insert: {
          alerted_at?: string
          auction_id: string
          domain_name: string
          id?: string
          pattern_id: string
          user_id: string
        }
        Update: {
          alerted_at?: string
          auction_id?: string
          domain_name?: string
          id?: string
          pattern_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pattern_alerts_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pattern_alerts_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "user_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_domains: {
        Row: {
          auto_valuation: number | null
          created_at: string
          domain_name: string
          id: string
          next_renewal_date: string | null
          notes: string | null
          purchase_date: string | null
          purchase_price: number
          purchase_source: string | null
          renewal_cost_yearly: number | null
          sale_date: string | null
          sale_price: number | null
          status: string
          tags: string[] | null
          tld: string | null
          updated_at: string
          user_id: string
          valuation_updated_at: string | null
        }
        Insert: {
          auto_valuation?: number | null
          created_at?: string
          domain_name: string
          id?: string
          next_renewal_date?: string | null
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number
          purchase_source?: string | null
          renewal_cost_yearly?: number | null
          sale_date?: string | null
          sale_price?: number | null
          status?: string
          tags?: string[] | null
          tld?: string | null
          updated_at?: string
          user_id: string
          valuation_updated_at?: string | null
        }
        Update: {
          auto_valuation?: number | null
          created_at?: string
          domain_name?: string
          id?: string
          next_renewal_date?: string | null
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number
          purchase_source?: string | null
          renewal_cost_yearly?: number | null
          sale_date?: string | null
          sale_price?: number | null
          status?: string
          tags?: string[] | null
          tld?: string | null
          updated_at?: string
          user_id?: string
          valuation_updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shared_reports: {
        Row: {
          analysis: Json
          created_at: string
          created_by: string | null
          domain_name: string
          expires_at: string | null
          id: string
          pre_scores: Json | null
        }
        Insert: {
          analysis: Json
          created_at?: string
          created_by?: string | null
          domain_name: string
          expires_at?: string | null
          id?: string
          pre_scores?: Json | null
        }
        Update: {
          analysis?: Json
          created_at?: string
          created_by?: string | null
          domain_name?: string
          expires_at?: string | null
          id?: string
          pre_scores?: Json | null
        }
        Relationships: []
      }
      sync_control: {
        Row: {
          id: number
          last_triggered_at: string
        }
        Insert: {
          id: number
          last_triggered_at?: string
        }
        Update: {
          id?: number
          last_triggered_at?: string
        }
        Relationships: []
      }
      sync_history: {
        Row: {
          auctions_count: number
          duration_ms: number | null
          error_message: string | null
          id: string
          inventory_source: string
          success: boolean
          synced_at: string
        }
        Insert: {
          auctions_count?: number
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          inventory_source: string
          success?: boolean
          synced_at?: string
        }
        Update: {
          auctions_count?: number
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          inventory_source?: string
          success?: boolean
          synced_at?: string
        }
        Relationships: []
      }
      sync_locks: {
        Row: {
          expires_at: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
        }
        Insert: {
          expires_at?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
        }
        Update: {
          expires_at?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
        }
        Relationships: []
      }
      trending_market_data: {
        Row: {
          generated_at: string
          hot_niches: Json
          id: string
          market_signals: Json
          model_used: string | null
          trending_keywords: Json
          updated_at: string
        }
        Insert: {
          generated_at?: string
          hot_niches?: Json
          id?: string
          market_signals?: Json
          model_used?: string | null
          trending_keywords?: Json
          updated_at?: string
        }
        Update: {
          generated_at?: string
          hot_niches?: Json
          id?: string
          market_signals?: Json
          model_used?: string | null
          trending_keywords?: Json
          updated_at?: string
        }
        Relationships: []
      }
      user_patterns: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          last_matched_at: string | null
          max_age: number | null
          max_length: number | null
          max_price: number | null
          min_age: number | null
          min_length: number | null
          min_price: number | null
          pattern: string
          pattern_type: string
          tld_filter: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          last_matched_at?: string | null
          max_age?: number | null
          max_length?: number | null
          max_price?: number | null
          min_age?: number | null
          min_length?: number | null
          min_price?: number | null
          pattern: string
          pattern_type?: string
          tld_filter?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          last_matched_at?: string | null
          max_age?: number | null
          max_length?: number | null
          max_price?: number | null
          min_age?: number | null
          min_length?: number | null
          min_price?: number | null
          pattern?: string
          pattern_type?: string
          tld_filter?: string | null
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
      user_settings: {
        Row: {
          created_at: string
          email_notifications_enabled: boolean | null
          id: string
          last_email_sent_at: string | null
          notification_email: string | null
          notification_frequency_hours: number
          subscription_plan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications_enabled?: boolean | null
          id?: string
          last_email_sent_at?: string | null
          notification_email?: string | null
          notification_frequency_hours?: number
          subscription_plan?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications_enabled?: boolean | null
          id?: string
          last_email_sent_at?: string | null
          notification_email?: string | null
          notification_frequency_hours?: number
          subscription_plan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_sync_lock: {
        Args: { lock_duration_minutes?: number; lock_holder: string }
        Returns: boolean
      }
      get_auction_count: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_sync_locked: {
        Args: never
        Returns: {
          expires_at: string
          is_locked: boolean
          locked_at: string
          locked_by: string
        }[]
      }
      release_sync_lock: { Args: { lock_holder: string }; Returns: boolean }
      trigger_auction_sync: { Args: never; Returns: undefined }
      trigger_pattern_check: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
