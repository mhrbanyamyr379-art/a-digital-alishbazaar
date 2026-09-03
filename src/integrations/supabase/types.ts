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
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          reason: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          reason?: string | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          archived_by_buyer: boolean
          archived_by_seller: boolean
          buyer_id: string
          buyer_last_read_at: string | null
          buyer_unread: number
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string | null
          listing_id: string | null
          seller_id: string
          seller_last_read_at: string | null
          seller_unread: number
        }
        Insert: {
          archived_by_buyer?: boolean
          archived_by_seller?: boolean
          buyer_id: string
          buyer_last_read_at?: string | null
          buyer_unread?: number
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          listing_id?: string | null
          seller_id: string
          seller_last_read_at?: string | null
          seller_unread?: number
        }
        Update: {
          archived_by_buyer?: boolean
          archived_by_seller?: boolean
          buyer_id?: string
          buyer_last_read_at?: string | null
          buyer_unread?: number
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          listing_id?: string | null
          seller_id?: string
          seller_last_read_at?: string | null
          seller_unread?: number
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_images: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          position: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          position?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          position?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          category: string
          city: string | null
          condition: string | null
          contact_method: string
          created_at: string
          currency: string
          description: string
          expires_at: string | null
          favorites_count: number
          id: string
          is_featured: boolean
          moderated_at: string | null
          moderated_by: string | null
          negotiable: boolean
          price: number
          province: string
          published_at: string | null
          rejection_reason: string | null
          seller_id: string
          status: Database["public"]["Enums"]["listing_status"]
          tags: string[]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          category: string
          city?: string | null
          condition?: string | null
          contact_method?: string
          created_at?: string
          currency?: string
          description?: string
          expires_at?: string | null
          favorites_count?: number
          id?: string
          is_featured?: boolean
          moderated_at?: string | null
          moderated_by?: string | null
          negotiable?: boolean
          price?: number
          province: string
          published_at?: string | null
          rejection_reason?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["listing_status"]
          tags?: string[]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          category?: string
          city?: string | null
          condition?: string | null
          contact_method?: string
          created_at?: string
          currency?: string
          description?: string
          expires_at?: string | null
          favorites_count?: number
          id?: string
          is_featured?: boolean
          moderated_at?: string | null
          moderated_by?: string | null
          negotiable?: boolean
          price?: number
          province?: string
          published_at?: string | null
          rejection_reason?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["listing_status"]
          tags?: string[]
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_listing_id: string | null
          body: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          deleted_for: string[]
          delivered_at: string | null
          edited_at: string | null
          id: string
          image_paths: string[]
          read_at: string | null
          reply_to_id: string | null
          sender_id: string
          type: string
        }
        Insert: {
          attachment_listing_id?: string | null
          body?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_for?: string[]
          delivered_at?: string | null
          edited_at?: string | null
          id?: string
          image_paths?: string[]
          read_at?: string | null
          reply_to_id?: string | null
          sender_id: string
          type?: string
        }
        Update: {
          attachment_listing_id?: string | null
          body?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_for?: string[]
          delivered_at?: string | null
          edited_at?: string | null
          id?: string
          image_paths?: string[]
          read_at?: string | null
          reply_to_id?: string | null
          sender_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_attachment_listing_id_fkey"
            columns: ["attachment_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          conversation_id: string | null
          created_at: string
          id: string
          link: string | null
          listing_id: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          listing_id?: string | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          listing_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned_at: string | null
          banned_reason: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          is_banned: boolean
          last_seen: string | null
          phone: string | null
          province: string | null
          rating_avg: number
          rating_count: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id: string
          is_banned?: boolean
          last_seen?: string | null
          phone?: string | null
          province?: string | null
          rating_avg?: number
          rating_count?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_banned?: boolean
          last_seen?: string | null
          phone?: string | null
          province?: string | null
          rating_avg?: number
          rating_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      recently_viewed: {
        Row: {
          id: string
          listing_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recently_viewed_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          details: string | null
          id: string
          listing_id: string | null
          reason: string
          reported_user_id: string | null
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string | null
          reason: string
          reported_user_id?: string | null
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string | null
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewer_id: string
          seller_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewer_id: string
          seller_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewer_id?: string
          seller_id?: string
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
      admin_list_audit: {
        Args: { _limit?: number; _offset?: number }
        Returns: {
          action: string
          admin_name: string
          created_at: string
          id: string
          reason: string
          target_id: string
          target_type: string
          total_count: number
        }[]
      }
      admin_list_listings: {
        Args: {
          _category?: string
          _limit?: number
          _offset?: number
          _province?: string
          _search?: string
          _since?: string
          _sort?: string
          _status?: string
        }
        Returns: {
          category: string
          city: string
          created_at: string
          currency: string
          favorites_count: number
          id: string
          image_url: string
          price: number
          province: string
          rejection_reason: string
          report_count: number
          seller_banned: boolean
          seller_id: string
          seller_name: string
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          total_count: number
          view_count: number
        }[]
      }
      admin_list_reports: {
        Args: {
          _limit?: number
          _offset?: number
          _search?: string
          _status?: string
          _type?: string
        }
        Returns: {
          admin_notes: string
          created_at: string
          details: string
          id: string
          listing_id: string
          listing_status: Database["public"]["Enums"]["listing_status"]
          listing_title: string
          reason: string
          reported_user_id: string
          reported_user_name: string
          reporter_id: string
          reporter_name: string
          status: string
          total_count: number
        }[]
      }
      admin_list_users: {
        Args: {
          _limit?: number
          _offset?: number
          _search?: string
          _status?: string
        }
        Returns: {
          active_count: number
          avatar_url: string
          banned_reason: string
          created_at: string
          display_name: string
          id: string
          is_admin: boolean
          is_banned: boolean
          last_seen: string
          listing_count: number
          province: string
          rating_avg: number
          rating_count: number
          report_count: number
          sold_count: number
          total_count: number
        }[]
      }
      admin_set_listing_status: {
        Args: { _listing_id: string; _reason?: string; _status: string }
        Returns: undefined
      }
      admin_set_user_banned: {
        Args: { _banned: boolean; _reason?: string; _user_id: string }
        Returns: undefined
      }
      admin_stats: { Args: never; Returns: Json }
      admin_update_report: {
        Args: { _note?: string; _report_id: string; _status: string }
        Returns: undefined
      }
      delete_message_for_everyone: {
        Args: { _message_id: string }
        Returns: undefined
      }
      delete_message_for_me: {
        Args: { _message_id: string }
        Returns: undefined
      }
      edit_message: {
        Args: { _body: string; _message_id: string }
        Returns: undefined
      }
      get_my_phone: { Args: never; Returns: string }
      get_or_create_conversation: {
        Args: { _listing_id: string; _seller_id: string }
        Returns: string
      }
      get_seller_phone: { Args: { _seller_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      heartbeat: { Args: never; Returns: undefined }
      increment_listing_views: {
        Args: { _listing_id: string }
        Returns: undefined
      }
      is_moderator: { Args: { _uid: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          _action: string
          _admin: string
          _reason: string
          _target_id: string
          _target_type: string
        }
        Returns: undefined
      }
      mark_conversation_read: { Args: { _conv_id: string }; Returns: undefined }
      notify_expiring_listings: { Args: never; Returns: number }
      require_moderator: { Args: never; Returns: string }
      set_conversation_archived: {
        Args: { _archived: boolean; _conv_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      listing_status:
        | "active"
        | "pending"
        | "sold"
        | "rejected"
        | "expired"
        | "draft"
        | "suspended"
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
      app_role: ["admin", "moderator", "user"],
      listing_status: [
        "active",
        "pending",
        "sold",
        "rejected",
        "expired",
        "draft",
        "suspended",
      ],
    },
  },
} as const
