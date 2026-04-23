// DevRev API types — extracted from lib/devrev/client.ts

export interface RevUser {
  id: string;
  display_id: string;
  display_name: string;
  email?: string;
  state: string;
  thumbnail?: string;
  rev_org?: { id: string; display_id: string; display_name: string };
  external_refs?: string[];
  is_verified?: boolean;
  custom_fields?: Record<string, unknown> | null;
}

export interface DevOrgPublicInfo {
  id: string;
  dev_slug: string;
  auth0_org_id: string;
  rev_auth0_org_id: string;
}

export interface DirectoryNode {
  directory: Directory;
  children: DirectoryNode[];
  has_child_articles: boolean;
  has_descendant_articles: boolean;
}

export interface Directory {
  id: string;
  display_id: string;
  title: string;
  description?: string;
  thumbnail?: ArtifactRef;
  icon?: string;
  published: boolean;
  language?: string;
  rank?: string;
  parent?: { id: string; display_id: string; title: string };
}

export interface ArtifactRef {
  id: string;
  display_id: string;
  file?: { name: string; size: number; type: string };
  original_url?: string;
  preview_url?: string;
}

export interface Article {
  id: string;
  display_id: string;
  title: string;
  description?: string;
  body?: string;
  status: string;
  scope?: string;
  published_date?: string;
  language?: string;
  parent?: { id: string; display_id: string; title?: string };
  authored_by?: UserRef[];
  owned_by?: UserRef[];
  extracted_content?: ArtifactRef[];
  tags?: TagRef[];
  rank?: string;
  resource?: { url?: string; artifacts?: ArtifactRef[] };
}

export interface Ticket {
  id: string;
  display_id: string;
  type: string;
  title: string;
  body?: string;
  stage?: { name: string; stage?: { name: string }; state?: { name: string } };
  state_display_name?: string;
  severity?: string;
  priority?: string;
  source_channel?: string;
  needs_response?: boolean;
  is_frozen?: boolean;
  created_by?: UserRef;
  created_date?: string;
  modified_date?: string;
  owned_by?: UserRef[];
  reported_by?: UserRef[];
  rev_org?: { id: string; display_id: string; display_name: string };
  applies_to_part?: PartRef;
  tags?: TagRef[];
  custom_fields?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  display_id: string;
  title?: string;
  description?: string;
  stage?: { name: string };
  source_channel?: string;
  created_by?: UserRef;
  created_date?: string;
  modified_date?: string;
  members?: UserRef[];
  tags?: TagRef[];
  metadata?: Record<string, unknown>;
}

export interface TimelineEntry {
  id: string;
  type: string;
  body?: string;
  body_type?: string;
  created_by?: UserRef;
  created_date?: string;
  visibility?: string;
  artifacts?: ArtifactRef[];
  snap_kit_body?: unknown;
  // For change events
  event?: {
    type: string;
    old?: unknown;
    new?: unknown;
  };
}

export interface SearchResult {
  type: string;
  // The actual object is nested — shape depends on namespace
  [key: string]: unknown;
}

export interface UserRef {
  type: string;
  id: string;
  display_id: string;
  display_name?: string;
  email?: string;
  full_name?: string;
  state?: string;
  thumbnail?: string;
}

export interface PartRef {
  type: string;
  id: string;
  display_id: string;
  name?: string;
}

export interface TagRef {
  tag: { id: string; name: string };
  value?: string;
}
