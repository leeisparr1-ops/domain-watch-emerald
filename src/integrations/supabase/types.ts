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
      auctions: {
        Row: {
          auction_type: string | null
          bid_count: number
          created_at: string
          domain_age: number | null
          domain_name: string
          end_time: string | null
          id: string
          inventory_source: string | null
          price: number
          tld: string | null
          traffic_count: number
          updated_at: string
          valuation: number | null
        }
        Insert: {
          auction_type?: string | null
          bid_count?: number
          created_at?: string
          domain_age?: number | null
          domain_name: string
          end_time?: string | null
          id?: string
          inventory_source?: string | null
          price?: number
          tld?: string | null
          traffic_count?: number
          updated_at?: string
          valuation?: number | null
        }
        Update: {
          auction_type?: string | null
          bid_count?: number
          created_at?: string
          domain_age?: number | null
          domain_name?: string
          end_time?: string | null
          id?: string
          inventory_source?: string | null
          price?: number
          tld?: string | null
          traffic_count?: number
          updated_at?: string
          valuation?: number | null
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
