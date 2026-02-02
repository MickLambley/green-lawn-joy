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
      addresses: {
        Row: {
          admin_notes: string | null
          city: string
          country: string
          created_at: string
          fixed_price: number | null
          id: string
          postal_code: string
          price_per_sqm: number | null
          slope: Database["public"]["Enums"]["slope_type"]
          square_meters: number | null
          state: string
          status: Database["public"]["Enums"]["address_status"]
          street_address: string
          tier_count: number
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          admin_notes?: string | null
          city: string
          country?: string
          created_at?: string
          fixed_price?: number | null
          id?: string
          postal_code: string
          price_per_sqm?: number | null
          slope?: Database["public"]["Enums"]["slope_type"]
          square_meters?: number | null
          state: string
          status?: Database["public"]["Enums"]["address_status"]
          street_address: string
          tier_count?: number
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          admin_notes?: string | null
          city?: string
          country?: string
          created_at?: string
          fixed_price?: number | null
          id?: string
          postal_code?: string
          price_per_sqm?: number | null
          slope?: Database["public"]["Enums"]["slope_type"]
          square_meters?: number | null
          state?: string
          status?: Database["public"]["Enums"]["address_status"]
          street_address?: string
          tier_count?: number
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      alternative_suggestions: {
        Row: {
          booking_id: string
          contractor_id: string
          created_at: string
          id: string
          responded_at: string | null
          status: string
          suggested_date: string
          suggested_time_slot: string
        }
        Insert: {
          booking_id: string
          contractor_id: string
          created_at?: string
          id?: string
          responded_at?: string | null
          status?: string
          suggested_date: string
          suggested_time_slot: string
        }
        Update: {
          booking_id?: string
          contractor_id?: string
          created_at?: string
          id?: string
          responded_at?: string | null
          status?: string
          suggested_date?: string
          suggested_time_slot?: string
        }
        Relationships: [
          {
            foreignKeyName: "alternative_suggestions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alternative_suggestions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          address_id: string
          admin_notes: string | null
          alternative_date: string | null
          alternative_suggested_at: string | null
          alternative_suggested_by: string | null
          alternative_time_slot: string | null
          clippings_removal: boolean
          contractor_accepted_at: string | null
          contractor_id: string | null
          created_at: string
          grass_length: string
          id: string
          is_public_holiday: boolean
          is_weekend: boolean
          notes: string | null
          payment_intent_id: string | null
          payment_status: string
          preferred_contractor_id: string | null
          quote_breakdown: Json | null
          scheduled_date: string
          scheduled_time: string | null
          status: Database["public"]["Enums"]["booking_status"]
          time_slot: string
          total_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_id: string
          admin_notes?: string | null
          alternative_date?: string | null
          alternative_suggested_at?: string | null
          alternative_suggested_by?: string | null
          alternative_time_slot?: string | null
          clippings_removal?: boolean
          contractor_accepted_at?: string | null
          contractor_id?: string | null
          created_at?: string
          grass_length?: string
          id?: string
          is_public_holiday?: boolean
          is_weekend?: boolean
          notes?: string | null
          payment_intent_id?: string | null
          payment_status?: string
          preferred_contractor_id?: string | null
          quote_breakdown?: Json | null
          scheduled_date: string
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          time_slot?: string
          total_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_id?: string
          admin_notes?: string | null
          alternative_date?: string | null
          alternative_suggested_at?: string | null
          alternative_suggested_by?: string | null
          alternative_time_slot?: string | null
          clippings_removal?: boolean
          contractor_accepted_at?: string | null
          contractor_id?: string | null
          created_at?: string
          grass_length?: string
          id?: string
          is_public_holiday?: boolean
          is_weekend?: boolean
          notes?: string | null
          payment_intent_id?: string | null
          payment_status?: string
          preferred_contractor_id?: string | null
          quote_breakdown?: Json | null
          scheduled_date?: string
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          time_slot?: string
          total_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_preferred_contractor_id_fkey"
            columns: ["preferred_contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors: {
        Row: {
          business_name: string | null
          created_at: string
          id: string
          is_active: boolean
          phone: string | null
          service_areas: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          service_areas?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          service_areas?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          contractor_id: string
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          contractor_id: string
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          contractor_id?: string
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      address_status: "pending" | "verified" | "rejected"
      app_role: "admin" | "user" | "contractor"
      booking_status: "pending" | "confirmed" | "completed" | "cancelled"
      slope_type: "flat" | "mild" | "steep"
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
      address_status: ["pending", "verified", "rejected"],
      app_role: ["admin", "user", "contractor"],
      booking_status: ["pending", "confirmed", "completed", "cancelled"],
      slope_type: ["flat", "mild", "steep"],
    },
  },
} as const
