import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchListings from "./tools/search-listings";
import getListing from "./tools/get-listing";
import myListings from "./tools/my-listings";
import createListing from "./tools/create-listing";
import listConversations from "./tools/list-conversations";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "afghan-marketplace-hub",
  title: "Afghan Marketplace Hub",
  version: "0.1.0",
  instructions:
    "Tools for Afghan Bazaar, an Afghanistan marketplace. Search and read listings, manage the signed-in user's own listings, and review their chat conversations.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchListings, getListing, myListings, createListing, listConversations],
});
