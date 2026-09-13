import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { ListingCardData } from "@/components/ListingCard";

function mapRow(l: {
  id: string;
  title: string;
  price: number;
  currency: string;
  province: string;
  city: string | null;
  created_at: string;
  is_featured: boolean;
  status?: string | null;
  listing_images: { url: string; position: number }[];
}): ListingCardData {
  const first = (l.listing_images ?? []).sort((a, b) => a.position - b.position)[0];
  return {
    id: l.id,
    title: l.title,
    price: Number(l.price),
    currency: l.currency,
    province: l.province,
    city: l.city,
    created_at: l.created_at,
    is_featured: l.is_featured,
    status: l.status ?? null,
    image: first?.url ?? null,
  };
}

const COLS = "id,title,price,currency,province,city,created_at,is_featured,status,listing_images(url,position)";

export function useFeaturedListings() {
  return useQuery({
    queryKey: ["featured-listings"],
    queryFn: async (): Promise<ListingCardData[]> => {
      const { data, error } = await supabase
        .from("listings")
        .select(COLS)
        .eq("status", "active")
        .eq("is_featured", true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
    staleTime: 60_000,
  });
}

export function useNewestListings() {
  return useQuery({
    queryKey: ["newest-listings"],
    queryFn: async (): Promise<ListingCardData[]> => {
      const { data, error } = await supabase
        .from("listings")
        .select(COLS)
        .eq("status", "active")
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
    staleTime: 30_000,
  });
}

/** Popular titles + categories, derived from top-viewed active listings. */
export function usePopularSearches() {
  return useQuery({
    queryKey: ["popular-searches"],
    queryFn: async (): Promise<{ terms: string[]; categories: string[] }> => {
      const { data, error } = await supabase
        .from("listings")
        .select("title,category,view_count")
        .eq("status", "active")
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("view_count", { ascending: false })
        .limit(40);
      if (error) throw error;
      const terms = Array.from(
        new Set((data ?? []).map((r) => r.title.trim()).filter((t) => t.length >= 2 && t.length <= 40)),
      ).slice(0, 8);
      const catCount = new Map<string, number>();
      for (const r of data ?? []) catCount.set(r.category, (catCount.get(r.category) ?? 0) + (r.view_count || 1));
      const categories = [...catCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map((e) => e[0]);
      return { terms, categories };
    },
    staleTime: 5 * 60_000,
  });
}

export function useRecentlyViewed() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["recently-viewed", user?.id ?? null],
    enabled: !!user,
    queryFn: async (): Promise<ListingCardData[]> => {
      const { data, error } = await supabase
        .from("recently_viewed")
        .select(`viewed_at, listing:listings!inner(${COLS})`)
        .order("viewed_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((r: any) => mapRow(r.listing)).filter(Boolean);
    },
    staleTime: 30_000,
  });
}

/** Listings from the same province (excluding current). */
export function useNearbyListings(province: string | null | undefined, excludeId?: string) {
  return useQuery({
    queryKey: ["nearby-listings", province, excludeId],
    enabled: !!province,
    queryFn: async (): Promise<ListingCardData[]> => {
      let q = supabase
        .from("listings")
        .select(COLS)
        .eq("status", "active")
        .eq("province", province!)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false })
        .limit(10);
      if (excludeId) q = q.neq("id", excludeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
    staleTime: 60_000,
  });
}
