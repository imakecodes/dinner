export type KnowledgeProvider = 'poe2db' | 'poe2wiki' | 'local_snapshot' | 'local_snapshot_db';

export type KnowledgeLookupMode = 'snapshot_first' | 'snapshot_only' | 'online_first';

export type KnowledgeEntityType =
  | 'skill'
  | 'ascendancy_node'
  | 'unique_item'
  | 'mechanic_claim';

export type LookupStatus =
  | 'verified'
  | 'fallback_verified'
  | 'unverified_external'
  | 'not_found'
  | 'source_unavailable'
  | 'error';

export type ProviderLookupStatus =
  | 'verified'
  | 'unverified_external'
  | 'not_found'
  | 'source_unavailable'
  | 'error';

export type FactConfidence = 'high' | 'medium' | 'low';

export type KnowledgeSource = {
  provider: KnowledgeProvider;
  url: string;
  fetchedAt: string;
};

export type KnowledgeFact = {
  key: string;
  value: string;
  confidence: FactConfidence;
  source: KnowledgeSource;
  context?: string;
};

export type ProviderLookupAttempt = {
  provider: KnowledgeProvider;
  status: ProviderLookupStatus;
  source: KnowledgeSource;
  error?: string;
};

export type LookupOptions = {
  deadlineAtMs?: number;
  timeoutMs?: number;
  lookupMode?: KnowledgeLookupMode;
};

export type LookupResult = {
  entityType: KnowledgeEntityType;
  query: string;
  normalizedQuery: string;
  status: LookupStatus;
  facts: KnowledgeFact[];
  sources: KnowledgeSource[];
  rawText?: string;
  error?: string;
  providerAttempts?: ProviderLookupAttempt[];
  sourceUnavailable?: boolean;
  snapshotVersion?: string;
  snapshotAgeDays?: number;
};
