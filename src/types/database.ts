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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      access_grants: {
        Row: {
          expires_at: string
          granted_at: string
          grantee_user_id: string
          id: string
          patient_id: string
          revoked_at: string | null
          source: Database["public"]["Enums"]["grant_source"]
        }
        Insert: {
          expires_at: string
          granted_at?: string
          grantee_user_id: string
          id?: string
          patient_id: string
          revoked_at?: string | null
          source: Database["public"]["Enums"]["grant_source"]
        }
        Update: {
          expires_at?: string
          granted_at?: string
          grantee_user_id?: string
          id?: string
          patient_id?: string
          revoked_at?: string | null
          source?: Database["public"]["Enums"]["grant_source"]
        }
        Relationships: [
          {
            foreignKeyName: "access_grants_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_user_id: string | null
          barangay_id: string | null
          created_at: string
          detail: Json
          id: string
          patient_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_user_id?: string | null
          barangay_id?: string | null
          created_at?: string
          detail?: Json
          id?: string
          patient_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_user_id?: string | null
          barangay_id?: string | null
          created_at?: string
          detail?: Json
          id?: string
          patient_id?: string | null
        }
        Relationships: []
      }
      barangays: {
        Row: {
          created_at: string
          facility_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          facility_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          facility_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "barangays_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      checkups: {
        Row: {
          barangay_id: string
          checkup_date: string
          created_at: string
          diastolic: number | null
          fasting_glucose: number | null
          id: string
          notes: string | null
          outcome: Database["public"]["Enums"]["screening_outcome"] | null
          patient_id: string
          recorded_by: string | null
          systolic: number | null
          updated_at: string
        }
        Insert: {
          barangay_id: string
          checkup_date?: string
          created_at?: string
          diastolic?: number | null
          fasting_glucose?: number | null
          id?: string
          notes?: string | null
          outcome?: Database["public"]["Enums"]["screening_outcome"] | null
          patient_id: string
          recorded_by?: string | null
          systolic?: number | null
          updated_at?: string
        }
        Update: {
          barangay_id?: string
          checkup_date?: string
          created_at?: string
          diastolic?: number | null
          fasting_glucose?: number | null
          id?: string
          notes?: string | null
          outcome?: Database["public"]["Enums"]["screening_outcome"] | null
          patient_id?: string
          recorded_by?: string | null
          systolic?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkups_barangay_id_fkey"
            columns: ["barangay_id"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkups_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_codes: {
        Row: {
          code_hash: string
          consumed_at: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          failed_attempts: number
          id: string
          locked: boolean
          patient_id: string
        }
        Insert: {
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at: string
          failed_attempts?: number
          id?: string
          locked?: boolean
          patient_id: string
        }
        Update: {
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          failed_attempts?: number
          id?: string
          locked?: boolean
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_codes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          granted_at: string
          grantee_user_id: string | null
          id: string
          patient_id: string
          revoked_at: string | null
          status: Database["public"]["Enums"]["consent_status"]
        }
        Insert: {
          granted_at?: string
          grantee_user_id?: string | null
          id?: string
          patient_id: string
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
        }
        Update: {
          granted_at?: string
          grantee_user_id?: string | null
          id?: string
          patient_id?: string
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
        }
        Relationships: [
          {
            foreignKeyName: "consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_applications: {
        Row: {
          created_at: string
          document_paths: string[]
          facility_id: string | null
          full_name: string | null
          id: string
          prc_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["doctor_application_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_paths?: string[]
          facility_id?: string | null
          full_name?: string | null
          id?: string
          prc_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["doctor_application_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_paths?: string[]
          facility_id?: string | null
          full_name?: string | null
          id?: string
          prc_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["doctor_application_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_applications_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      households: {
        Row: {
          address: string | null
          barangay_id: string
          created_at: string
          id: string
          name: string | null
          purok_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          barangay_id: string
          created_at?: string
          id?: string
          name?: string | null
          purok_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          barangay_id?: string
          created_at?: string
          id?: string
          name?: string | null
          purok_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "households_barangay_id_fkey"
            columns: ["barangay_id"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "households_purok_id_fkey"
            columns: ["purok_id"]
            isOneToOne: false
            referencedRelation: "puroks"
            referencedColumns: ["id"]
          },
        ]
      }
      id_card_prints: {
        Row: {
          batch_size: number
          id: string
          id_card_id: string
          printed_at: string
          printed_by: string | null
        }
        Insert: {
          batch_size?: number
          id?: string
          id_card_id: string
          printed_at?: string
          printed_by?: string | null
        }
        Update: {
          batch_size?: number
          id?: string
          id_card_id?: string
          printed_at?: string
          printed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "id_card_prints_id_card_id_fkey"
            columns: ["id_card_id"]
            isOneToOne: false
            referencedRelation: "id_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      id_cards: {
        Row: {
          id: string
          issued_at: string
          issued_by: string | null
          patient_id: string
          qr_version: number
        }
        Insert: {
          id?: string
          issued_at?: string
          issued_by?: string | null
          patient_id: string
          qr_version: number
        }
        Update: {
          id?: string
          issued_at?: string
          issued_by?: string | null
          patient_id?: string
          qr_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "id_cards_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      pairing_attempts: {
        Row: {
          attempted_at: string
          attempted_by: string | null
          id: string
          patient_id: string
          succeeded: boolean
        }
        Insert: {
          attempted_at?: string
          attempted_by?: string | null
          id?: string
          patient_id: string
          succeeded: boolean
        }
        Update: {
          attempted_at?: string
          attempted_by?: string | null
          id?: string
          patient_id?: string
          succeeded?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pairing_attempts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_notes: {
        Row: {
          clinical_note: string | null
          created_at: string
          follow_up_date: string | null
          has_follow_up: boolean
          id: string
          patient_id: string
          patient_instructions: string | null
          physician_id: string | null
        }
        Insert: {
          clinical_note?: string | null
          created_at?: string
          follow_up_date?: string | null
          has_follow_up?: boolean
          id?: string
          patient_id: string
          patient_instructions?: string | null
          physician_id?: string | null
        }
        Update: {
          clinical_note?: string | null
          created_at?: string
          follow_up_date?: string | null
          has_follow_up?: boolean
          id?: string
          patient_id?: string
          patient_instructions?: string | null
          physician_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          barangay_id: string
          birthdate: string
          created_at: string
          first_name: string
          household_id: string | null
          id: string
          middle_name: string | null
          patient_code: string | null
          qr_version: number
          sex: Database["public"]["Enums"]["sex"]
          surname: string
          updated_at: string
          user_id: string | null
          verification_status: Database["public"]["Enums"]["citizen_verification_status"]
        }
        Insert: {
          barangay_id: string
          birthdate: string
          created_at?: string
          first_name: string
          household_id?: string | null
          id?: string
          middle_name?: string | null
          patient_code?: string | null
          qr_version?: number
          sex: Database["public"]["Enums"]["sex"]
          surname: string
          updated_at?: string
          user_id?: string | null
          verification_status?: Database["public"]["Enums"]["citizen_verification_status"]
        }
        Update: {
          barangay_id?: string
          birthdate?: string
          created_at?: string
          first_name?: string
          household_id?: string | null
          id?: string
          middle_name?: string | null
          patient_code?: string | null
          qr_version?: number
          sex?: Database["public"]["Enums"]["sex"]
          surname?: string
          updated_at?: string
          user_id?: string | null
          verification_status?: Database["public"]["Enums"]["citizen_verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "patients_barangay_id_fkey"
            columns: ["barangay_id"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          dosage: string | null
          drug_name: string
          duration: string | null
          frequency: string | null
          id: string
          instructions: string | null
          line_no: number
          prescription_id: string
          quantity: string | null
          strength: string | null
        }
        Insert: {
          dosage?: string | null
          drug_name: string
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          line_no: number
          prescription_id: string
          quantity?: string | null
          strength?: string | null
        }
        Update: {
          dosage?: string | null
          drug_name?: string
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          line_no?: number
          prescription_id?: string
          quantity?: string | null
          strength?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          follow_up_date: string | null
          id: string
          issued_at: string
          patient_id: string
          physician_id: string
          physician_license: string
          status: Database["public"]["Enums"]["prescription_status"]
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          follow_up_date?: string | null
          id?: string
          issued_at?: string
          patient_id: string
          physician_id: string
          physician_license: string
          status?: Database["public"]["Enums"]["prescription_status"]
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          follow_up_date?: string | null
          id?: string
          issued_at?: string
          patient_id?: string
          physician_id?: string
          physician_license?: string
          status?: Database["public"]["Enums"]["prescription_status"]
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          barangay_id: string | null
          created_at: string
          facility_id: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          barangay_id?: string | null
          created_at?: string
          facility_id?: string | null
          full_name?: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          barangay_id?: string | null
          created_at?: string
          facility_id?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_barangay_id_fkey"
            columns: ["barangay_id"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      puroks: {
        Row: {
          barangay_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          barangay_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          barangay_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "puroks_barangay_id_fkey"
            columns: ["barangay_id"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          barangay_id: string
          created_at: string
          created_by: string | null
          facility_id: string | null
          id: string
          patient_id: string
          reason: string | null
          status: Database["public"]["Enums"]["referral_status"]
          updated_at: string
        }
        Insert: {
          barangay_id: string
          created_at?: string
          created_by?: string | null
          facility_id?: string | null
          id?: string
          patient_id: string
          reason?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
          updated_at?: string
        }
        Update: {
          barangay_id?: string
          created_at?: string
          created_by?: string | null
          facility_id?: string | null
          id?: string
          patient_id?: string
          reason?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_barangay_id_fkey"
            columns: ["barangay_id"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          barangay_id: string
          created_at: string
          due_date: string
          id: string
          patient_id: string
          sent_at: string | null
          source: string | null
          status: Database["public"]["Enums"]["reminder_status"]
          updated_at: string
        }
        Insert: {
          barangay_id: string
          created_at?: string
          due_date: string
          id?: string
          patient_id: string
          sent_at?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          updated_at?: string
        }
        Update: {
          barangay_id?: string
          created_at?: string
          due_date?: string
          id?: string
          patient_id?: string
          sent_at?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_barangay_id_fkey"
            columns: ["barangay_id"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_rules: {
        Row: {
          bp_diastolic_cutoff: number
          bp_monitor_diastolic: number
          bp_monitor_systolic: number
          bp_systolic_cutoff: number
          created_at: string
          family_history_min_age: number
          fasting_glucose_cutoff: number
          fasting_glucose_monitor: number
          is_active: boolean
          updated_at: string
          version: number
        }
        Insert: {
          bp_diastolic_cutoff?: number
          bp_monitor_diastolic?: number
          bp_monitor_systolic?: number
          bp_systolic_cutoff?: number
          created_at?: string
          family_history_min_age?: number
          fasting_glucose_cutoff?: number
          fasting_glucose_monitor?: number
          is_active?: boolean
          updated_at?: string
          version: number
        }
        Update: {
          bp_diastolic_cutoff?: number
          bp_monitor_diastolic?: number
          bp_monitor_systolic?: number
          bp_systolic_cutoff?: number
          created_at?: string
          family_history_min_age?: number
          fasting_glucose_cutoff?: number
          fasting_glucose_monitor?: number
          is_active?: boolean
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_referral: {
        Args: {
          p_next: Database["public"]["Enums"]["referral_status"]
          p_referral_id: string
        }
        Returns: Database["public"]["Enums"]["referral_status"]
      }
      approve_doctor: {
        Args: { p_application_id: string; p_approve: boolean; p_notes?: string }
        Returns: undefined
      }
      cancel_prescription: {
        Args: { p_prescription_id: string; p_reason?: string }
        Returns: undefined
      }
      compute_risk: {
        Args: {
          p_diastolic: number
          p_fasting_glucose: number
          p_systolic: number
        }
        Returns: Database["public"]["Enums"]["screening_outcome"]
      }
      current_barangay_id: { Args: never; Returns: string }
      current_role_name: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_active_grant: {
        Args: { p_patient_id: string; p_user_id: string }
        Returns: boolean
      }
      issue_prescription: {
        Args: {
          p_follow_up_date?: string
          p_items: Json
          p_license: string
          p_patient_id: string
        }
        Returns: string
      }
      log_audit: {
        Args: {
          p_action: Database["public"]["Enums"]["audit_action"]
          p_barangay_id?: string
          p_detail?: Json
          p_patient_id?: string
        }
        Returns: undefined
      }
      open_patient_record: { Args: { p_patient_id: string }; Returns: string }
      pairing_key_hash: {
        Args: { p_birthdate: string; p_surname: string }
        Returns: string
      }
      record_card_prints: {
        Args: { p_batch_size?: number; p_patient_id: string }
        Returns: string
      }
      record_rx_print: {
        Args: { p_prescription_id: string }
        Returns: undefined
      }
      register_citizen: {
        Args: {
          p_birthdate: string
          p_first_name: string
          p_household_id?: string
          p_sex: Database["public"]["Enums"]["sex"]
          p_surname: string
          p_user_id?: string
        }
        Returns: string
      }
      reset_patient_qr: { Args: { p_patient_id: string }; Returns: number }
      seed_bhw: {
        Args: { p_barangay_id: string; p_full_name?: string; p_user_id: string }
        Returns: undefined
      }
      today_manila: { Args: never; Returns: string }
      verify_citizen: {
        Args: { p_patient_id: string; p_user_id?: string }
        Returns: undefined
      }
      verify_pairing_key: {
        Args: { p_birthdate: string; p_patient_code: string; p_surname: string }
        Returns: string
      }
    }
    Enums: {
      audit_action:
        | "record_view"
        | "qr_scan"
        | "pairing_key_succeeded"
        | "pairing_key_failed"
        | "consent_granted"
        | "consent_revoked"
        | "record_export"
        | "card_print"
        | "rx_print"
        | "rx_view"
        | "qr_reset"
        | "rx_issue"
        | "rx_cancel"
        | "citizen_verified"
        | "doctor_approved"
        | "doctor_rejected"
        | "bhw_seeded"
        | "sign_in"
        | "sign_out"
        | "role_change"
      citizen_verification_status: "unverified" | "verified"
      consent_status: "granted" | "revoked"
      doctor_application_status: "pending" | "approved" | "rejected"
      grant_source: "referral" | "qr_pairing" | "consent"
      prescription_status: "issued" | "cancelled"
      referral_status:
        | "sent"
        | "received"
        | "seen"
        | "follow_up_set"
        | "closed"
        | "cancelled"
      reminder_status: "scheduled" | "sent" | "failed" | "cancelled"
      screening_outcome: "normal" | "monitor" | "needs_referral"
      sex: "male" | "female"
      user_role: "admin" | "barangay_staff" | "physician" | "citizen"
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
      audit_action: [
        "record_view",
        "qr_scan",
        "pairing_key_succeeded",
        "pairing_key_failed",
        "consent_granted",
        "consent_revoked",
        "record_export",
        "card_print",
        "rx_print",
        "rx_view",
        "qr_reset",
        "rx_issue",
        "rx_cancel",
        "citizen_verified",
        "doctor_approved",
        "doctor_rejected",
        "bhw_seeded",
        "sign_in",
        "sign_out",
        "role_change",
      ],
      citizen_verification_status: ["unverified", "verified"],
      consent_status: ["granted", "revoked"],
      doctor_application_status: ["pending", "approved", "rejected"],
      grant_source: ["referral", "qr_pairing", "consent"],
      prescription_status: ["issued", "cancelled"],
      referral_status: [
        "sent",
        "received",
        "seen",
        "follow_up_set",
        "closed",
        "cancelled",
      ],
      reminder_status: ["scheduled", "sent", "failed", "cancelled"],
      screening_outcome: ["normal", "monitor", "needs_referral"],
      sex: ["male", "female"],
      user_role: ["admin", "barangay_staff", "physician", "citizen"],
    },
  },
} as const
