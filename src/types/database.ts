export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      barangays: {
        Row: {
          created_at: string;
          facility_id: string | null;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          facility_id?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          facility_id?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "barangays_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      checkups: {
        Row: {
          barangay_id: string;
          checkup_date: string;
          created_at: string;
          diastolic: number | null;
          fasting_glucose: number | null;
          id: string;
          notes: string | null;
          outcome: Database["public"]["Enums"]["screening_outcome"] | null;
          patient_id: string;
          recorded_by: string | null;
          systolic: number | null;
          updated_at: string;
        };
        Insert: {
          barangay_id: string;
          checkup_date?: string;
          created_at?: string;
          diastolic?: number | null;
          fasting_glucose?: number | null;
          id?: string;
          notes?: string | null;
          outcome?: Database["public"]["Enums"]["screening_outcome"] | null;
          patient_id: string;
          recorded_by?: string | null;
          systolic?: number | null;
          updated_at?: string;
        };
        Update: {
          barangay_id?: string;
          checkup_date?: string;
          created_at?: string;
          diastolic?: number | null;
          fasting_glucose?: number | null;
          id?: string;
          notes?: string | null;
          outcome?: Database["public"]["Enums"]["screening_outcome"] | null;
          patient_id?: string;
          recorded_by?: string | null;
          systolic?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checkups_barangay_id_fkey";
            columns: ["barangay_id"];
            isOneToOne: false;
            referencedRelation: "barangays";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkups_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      facilities: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      households: {
        Row: {
          address: string | null;
          barangay_id: string;
          created_at: string;
          id: string;
          name: string | null;
          purok_id: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          barangay_id: string;
          created_at?: string;
          id?: string;
          name?: string | null;
          purok_id?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          barangay_id?: string;
          created_at?: string;
          id?: string;
          name?: string | null;
          purok_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "households_barangay_id_fkey";
            columns: ["barangay_id"];
            isOneToOne: false;
            referencedRelation: "barangays";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "households_purok_id_fkey";
            columns: ["purok_id"];
            isOneToOne: false;
            referencedRelation: "puroks";
            referencedColumns: ["id"];
          },
        ];
      };
      patients: {
        Row: {
          barangay_id: string;
          birthdate: string;
          created_at: string;
          first_name: string;
          household_id: string | null;
          id: string;
          middle_name: string | null;
          patient_code: string | null;
          qr_version: number;
          sex: Database["public"]["Enums"]["sex"];
          surname: string;
          updated_at: string;
          user_id: string | null;
          verification_status: Database["public"]["Enums"]["citizen_verification_status"];
        };
        Insert: {
          barangay_id: string;
          birthdate: string;
          created_at?: string;
          first_name: string;
          household_id?: string | null;
          id?: string;
          middle_name?: string | null;
          patient_code?: string | null;
          qr_version?: number;
          sex: Database["public"]["Enums"]["sex"];
          surname: string;
          updated_at?: string;
          user_id?: string | null;
          verification_status?: Database["public"]["Enums"]["citizen_verification_status"];
        };
        Update: {
          barangay_id?: string;
          birthdate?: string;
          created_at?: string;
          first_name?: string;
          household_id?: string | null;
          id?: string;
          middle_name?: string | null;
          patient_code?: string | null;
          qr_version?: number;
          sex?: Database["public"]["Enums"]["sex"];
          surname?: string;
          updated_at?: string;
          user_id?: string | null;
          verification_status?: Database["public"]["Enums"]["citizen_verification_status"];
        };
        Relationships: [
          {
            foreignKeyName: "patients_barangay_id_fkey";
            columns: ["barangay_id"];
            isOneToOne: false;
            referencedRelation: "barangays";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "patients_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          barangay_id: string | null;
          created_at: string;
          facility_id: string | null;
          full_name: string | null;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          barangay_id?: string | null;
          created_at?: string;
          facility_id?: string | null;
          full_name?: string | null;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          barangay_id?: string | null;
          created_at?: string;
          facility_id?: string | null;
          full_name?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_barangay_id_fkey";
            columns: ["barangay_id"];
            isOneToOne: false;
            referencedRelation: "barangays";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      puroks: {
        Row: {
          barangay_id: string;
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          barangay_id: string;
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          barangay_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "puroks_barangay_id_fkey";
            columns: ["barangay_id"];
            isOneToOne: false;
            referencedRelation: "barangays";
            referencedColumns: ["id"];
          },
        ];
      };
      referrals: {
        Row: {
          barangay_id: string;
          created_at: string;
          created_by: string | null;
          facility_id: string | null;
          id: string;
          patient_id: string;
          reason: string | null;
          status: Database["public"]["Enums"]["referral_status"];
          updated_at: string;
        };
        Insert: {
          barangay_id: string;
          created_at?: string;
          created_by?: string | null;
          facility_id?: string | null;
          id?: string;
          patient_id: string;
          reason?: string | null;
          status?: Database["public"]["Enums"]["referral_status"];
          updated_at?: string;
        };
        Update: {
          barangay_id?: string;
          created_at?: string;
          created_by?: string | null;
          facility_id?: string | null;
          id?: string;
          patient_id?: string;
          reason?: string | null;
          status?: Database["public"]["Enums"]["referral_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "referrals_barangay_id_fkey";
            columns: ["barangay_id"];
            isOneToOne: false;
            referencedRelation: "barangays";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referrals_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referrals_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      risk_rules: {
        Row: {
          bp_diastolic_cutoff: number;
          bp_monitor_diastolic: number;
          bp_monitor_systolic: number;
          bp_systolic_cutoff: number;
          created_at: string;
          family_history_min_age: number;
          fasting_glucose_cutoff: number;
          fasting_glucose_monitor: number;
          is_active: boolean;
          updated_at: string;
          version: number;
        };
        Insert: {
          bp_diastolic_cutoff?: number;
          bp_monitor_diastolic?: number;
          bp_monitor_systolic?: number;
          bp_systolic_cutoff?: number;
          created_at?: string;
          family_history_min_age?: number;
          fasting_glucose_cutoff?: number;
          fasting_glucose_monitor?: number;
          is_active?: boolean;
          updated_at?: string;
          version: number;
        };
        Update: {
          bp_diastolic_cutoff?: number;
          bp_monitor_diastolic?: number;
          bp_monitor_systolic?: number;
          bp_systolic_cutoff?: number;
          created_at?: string;
          family_history_min_age?: number;
          fasting_glucose_cutoff?: number;
          fasting_glucose_monitor?: number;
          is_active?: boolean;
          updated_at?: string;
          version?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_barangay_id: { Args: Record<PropertyKey, never>; Returns: string };
      current_role_name: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      today_manila: { Args: Record<PropertyKey, never>; Returns: string };
    };
    Enums: {
      citizen_verification_status: "unverified" | "verified";
      doctor_application_status: "pending" | "approved" | "rejected";
      referral_status: "sent" | "received" | "seen" | "follow_up_set" | "closed" | "cancelled";
      screening_outcome: "normal" | "monitor" | "needs_referral";
      sex: "male" | "female";
      user_role: "admin" | "barangay_staff" | "physician" | "citizen";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      citizen_verification_status: ["unverified", "verified"],
      doctor_application_status: ["pending", "approved", "rejected"],
      referral_status: ["sent", "received", "seen", "follow_up_set", "closed", "cancelled"],
      screening_outcome: ["normal", "monitor", "needs_referral"],
      sex: ["male", "female"],
      user_role: ["admin", "barangay_staff", "physician", "citizen"],
    },
  },
} as const;
