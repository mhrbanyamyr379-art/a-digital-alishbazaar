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
          negotiable: boolean
          price: number
          province: string
          published_at: string | null
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
          negotiable?: boolean
          price?: number
          province: string
          published_at?: string | null
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
          negotiable?: boolean
          price?: number
          province?: string
          published_at?: string | null
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
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
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
          created_at: string
          details: string | null
          id: string
          listing_id: string | null
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string | null
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string | null
          reason?: string
          reporter_id?: string
          status?: string
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
      mark_conversation_read: { Args: { _conv_id: string }; Returns: undefined }
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
      listing_status: [
        "active",
        "pending",
        "sold",
        "rejected",
        "expired",
        "draft",
      ],
    },
  },
} as const
