import type {
  KnowledgeEntityType,
  KnowledgeFact,
  KnowledgeSource,
  LookupResult,
  LookupStatus,
} from '@/lib/poe2-knowledge-types';

export type TermOriginType =
  | 'internal_contract_term'
  | 'poe_game_term';

export type GroundedTermSource =
  | 'context.requested_archetype'
  | 'context.requested_type'
  | 'context.build_notes'
  | 'context.observation'
  | 'context.stash_gear_gems'
  | 'context.pantry_ingredients'
  | 'member.likes'
  | 'member.dislikes'
  | 'member.restrictions';

export type GroundingCriticality = 'low' | 'medium' | 'high';

export type GroundedUserTerm = {
  term: string;
  normalizedTerm: string;
  origin: TermOriginType;
  source: GroundedTermSource;
  criticality: GroundingCriticality;
  entityType: KnowledgeEntityType | 'unknown' | 'internal_contract';
  status: 'verified' | 'fallback_verified' | 'not_confirmed' | 'internal';
  lookupStatus: LookupStatus | 'internal';
  sources: KnowledgeSource[];
  facts: KnowledgeFact[];
  lookup: LookupResult | null;
  reason: string;
};

export type EvidenceFact = {
  term: string;
  entityType: KnowledgeEntityType;
  key: string;
  value: string;
  confidence: KnowledgeFact['confidence'];
  sourceUrl: string;
  provider: KnowledgeSource['provider'];
  fetchedAt: string;
};

export type EvidencePack = {
  generatedAt: string;
  deadlineAtMs: number;
  terms: GroundedUserTerm[];
  lookups: LookupResult[];
  facts: EvidenceFact[];
  sourceUnavailable: boolean;
  metadata: {
    termsTotal: number;
    termsVerified: number;
    termsUnverified: number;
  };
};

export type ClaimField =
  | 'analysis_log'
  | 'build_reasoning'
  | 'build_steps'
  | 'gear_gems'
  | 'build_items';

export type ClaimRecord = {
  id: string;
  field: ClaimField;
  text: string;
  claimType: 'item_line' | 'mechanic' | 'term_role' | 'compatibility' | 'generic_fact';
  linkedTerms: string[];
  requiresEvidence: boolean;
};

export type ClaimVerificationResult = {
  claimId: string;
  status: 'verified' | 'unverified' | 'blocked';
  reason: string;
  evidenceUrls: string[];
  missingTerms: string[];
};

export type GroundingFailureDetail = {
  term: string;
  lookupStatus: LookupStatus | 'internal';
  reason: string;
  sources: string[];
  code: 'not_found' | 'source_unavailable' | 'unverified_external' | 'error' | 'internal';
};
