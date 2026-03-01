import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { getLocalAiContext } from "@/lib/ai-context";
import {
  BuildSessionContext,
  GeneratedBuild,
  GeneratedRecipe,
  KitchenMember,
  SessionContext,
} from "../types";
import {
  normalizeBuildPayload,
  normalizeBuildSessionContext,
  serializeBuildPayload,
} from "@/lib/build-contract";
import { BUILD_GENERATION_SYSTEM_INSTRUCTION } from "@/lib/prompts";
import { assessBuildDomain, type DomainAssessment } from "@/lib/domain-guardrails";
import { validateBuildMechanics, type MechanicsValidationResult } from "@/lib/build-mechanics-validator";
import { autoCorrectBuildFactConflicts } from "@/lib/build-fact-autocorrect";
import {
  buildModelAttemptChain,
  getConfiguredModels,
  type GeminiErrorPayload,
  isModelNotFoundError,
  parseGeminiErrorPayload,
  validateConfiguredModelsWithList,
} from "@/lib/gemini-model-policy";
import { annotateItemUncertainty } from "@/lib/build-output-quality";
import {
  buildEvidencePackFromGrounding,
  buildGroundingFailureDetails,
  buildGroundingInstruction,
  groundUserTerms,
  hasGroundingUnverifiedFacts,
} from "@/lib/poe2-term-grounding";

const parseRetryDelaySeconds = (error: any, payload: GeminiErrorPayload | null): number | null => {
  const details = payload?.error?.details;
  if (Array.isArray(details)) {
    const retryInfo = details.find(item => item?.["@type"]?.includes("RetryInfo"));
    const retryDelay = retryInfo?.retryDelay;

    if (typeof retryDelay === 'string') {
      const match = retryDelay.match(/([0-9]+(?:\.[0-9]+)?)s/i);
      if (match) {
        return Math.max(1, Math.ceil(Number(match[1])));
      }
    }
  }

  const retryFromMessage = payload?.error?.message || (typeof error?.message === 'string' ? error.message : '');
  const retryMatch = retryFromMessage.match(/retry in ([0-9]+(?:\.[0-9]+)?)s/i);
  if (retryMatch) {
    return Math.max(1, Math.ceil(Number(retryMatch[1])));
  }

  return null;
};

const isGeminiQuotaExceededError = (error: any): boolean => {
  const payload = parseGeminiErrorPayload(error);
  const statusFromPayload = payload?.error?.status;
  const codeFromPayload = payload?.error?.code;
  const numericStatus = Number(error?.status ?? error?.code ?? codeFromPayload);

  return numericStatus === 429 || statusFromPayload === 'RESOURCE_EXHAUSTED';
};

const buildGeminiQuotaExceededError = (error: any): Error => {
  const payload = parseGeminiErrorPayload(error);
  const retryAfterSeconds = parseRetryDelaySeconds(error, payload);

  const structuredError = new Error("Gemini quota exceeded");
  (structuredError as any).status = 429;
  (structuredError as any).code = 'gemini.quota_exceeded';
  (structuredError as any).retryAfterSeconds = retryAfterSeconds;
  (structuredError as any).cause = error;

  return structuredError;
};

type ModelAttemptReason = 'quota' | 'model_not_found';

type ModelAttemptDetail = {
  model: string;
  reason: ModelAttemptReason;
  status: number | null;
};

const buildGeminiModelUnavailableError = (details: ModelAttemptDetail[]): Error => {
  const structuredError = new Error("No available Gemini model could generate content");
  (structuredError as any).status = 503;
  (structuredError as any).code = 'gemini.model_unavailable';
  (structuredError as any).details = details;
  return structuredError;
};

const buildLocalContextInstruction = (localAiContext: string): string => {
  if (!localAiContext) {
    return "";
  }

  return `\n\nLOCAL APPLICATION CONTEXT (FOLLOW STRICTLY):\n${localAiContext}`;
};

const DOMAIN_CORRECTION_INSTRUCTION = `
CRITICAL DOMAIN CORRECTION:
- Output strictly Path of Exile 2 build domain content.
- Do not output culinary semantics (food, recipes, dishes, kitchen tasks, ingredients for cooking).
- If context appears culinary, reinterpret as PoE2 build planning only.
- Remove PoE1-exclusive assumptions/mechanics and keep only PoE2-valid mechanics.
`;

const FACT_CORRECTION_INSTRUCTION_BASE = `
CRITICAL FACTUAL CORRECTION:
- Keep claims strictly aligned with Path of Exile 2 verified mechanics.
- Every critical mechanic claim must be source-verifiable with poe2db.tw or poe2wiki.net.
- Use only entities verified in the official Evidence Pack for factual claims.
- Do not reinterpret non-confirmed terms as confirmed mechanics.
- Keep canonical term roles: skill as skill, ascendancy node as ascendancy, unique item as unique item.
- If evidence is missing, remove or rewrite the claim instead of guessing.
`;

const DEFAULT_FACT_PIPELINE_BUDGET_MS = 12_000;
type OfficialSourceConflictStrategy = 'degrade_warn' | 'fail_503';

const getFactPipelineBudgetMs = (): number => {
  const raw = Number(process.env.POE_FACT_PIPELINE_BUDGET_MS);
  if (Number.isFinite(raw) && raw >= 2_000) {
    return Math.floor(raw);
  }
  return DEFAULT_FACT_PIPELINE_BUDGET_MS;
};

const getOfficialSourceConflictStrategy = (): OfficialSourceConflictStrategy => {
  const raw = String(process.env.POE_OFFICIAL_SOURCE_CONFLICT_STRATEGY || '').trim().toLowerCase();
  return raw === 'fail_503' ? 'fail_503' : 'degrade_warn';
};

const buildDomainMismatchError = (assessment: DomainAssessment): Error => {
  const structuredError = new Error("Generated content is outside Path of Exile 2 build domain");
  (structuredError as any).status = 422;
  (structuredError as any).code = 'gemini.domain_mismatch';
  (structuredError as any).details = assessment.matchedTerms;
  (structuredError as any).reason = assessment.reason;
  return structuredError;
};

const buildFactConflictCorrectionInstruction = (
  validation: MechanicsValidationResult,
  groundingInstruction: string,
): string => {
  const conflictLines = validation.criticalConflicts
    .slice(0, 5)
    .map((conflict, index) => {
      const sources = conflict.sources.map((source) => source.url).join(', ');
      return `${index + 1}. Claim: ${conflict.claim}\n   Expected: ${conflict.expected}\n   Found: ${conflict.found}\n   Sources: ${sources || 'none'}`;
    })
    .join('\n');

  const enablerLines = (validation.enablerDiagnostics || [])
    .slice(0, 5)
    .map((diagnostic, index) => {
      const sources = diagnostic.sources.map((source) => source.url).join(', ');
      return `${index + 1}. Enabler: ${diagnostic.name}\n   Skill: ${diagnostic.skill}\n   Status: ${diagnostic.status}\n   Reason: ${diagnostic.reason}\n   Sources: ${sources || 'none'}`;
    })
    .join('\n');

  const claimLines = (validation.claimResults || [])
    .filter((result) => result.status !== 'verified')
    .slice(0, 8)
    .map((result, index) =>
      `${index + 1}. ClaimId: ${result.claimId}\n   Status: ${result.status}\n   Reason: ${result.reason}\n   Missing Terms: ${result.missingTerms.join(', ') || 'none'}\n   Evidence: ${result.evidenceUrls.join(', ') || 'none'}`)
    .join('\n');

  return `${FACT_CORRECTION_INSTRUCTION_BASE}${groundingInstruction}\n\nFACT CONFLICTS TO FIX:\n${conflictLines || 'none'}\n\nCLAIM VERIFICATION FAILURES:\n${claimLines || 'none'}\n\nENABLER DIAGNOSTICS:\n${enablerLines || 'none'}\n`;
};

const buildFactUnverifiedError = (validation: MechanicsValidationResult): Error => {
  const structuredError = new Error("Generated build contains unverifiable or conflicting PoE2 mechanics");
  (structuredError as any).status = 422;
  (structuredError as any).code = 'gemini.fact_unverified';
  (structuredError as any).details = validation.criticalConflicts;
  (structuredError as any).claimResults = validation.claimResults;
  return structuredError;
};

const buildOfficialSourcesUnavailableError = (details: unknown): Error => {
  const structuredError = new Error("Official PoE2 sources were unavailable in factual verification budget");
  (structuredError as any).status = 503;
  (structuredError as any).code = 'gemini.official_sources_unavailable';
  (structuredError as any).details = details;
  return structuredError;
};

/**
 * Crafts a safe and practical build based on party profiles, stash, and build archetype.
 */
export const craftBuildWithAI = async (
  partyMembersDb: KitchenMember[],
  rawContext: BuildSessionContext | SessionContext
): Promise<GeneratedBuild> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const configuredModels = getConfiguredModels();
  const modelAttemptChain = buildModelAttemptChain(configuredModels);
  const session_context = normalizeBuildSessionContext(rawContext);

  const { unavailableConfiguredModels } = await validateConfiguredModelsWithList(ai, configuredModels);
  if (unavailableConfiguredModels.length > 0) {
    console.warn('[Gemini] Configured model is not present in models.list()', {
      unavailableConfiguredModels,
      primaryModel: configuredModels.primaryModel,
      fallbackModel: configuredModels.fallbackModel,
    });
  }

  const costTier = session_context.cost_tier_preference || session_context.build_complexity || 'medium';
  const costTierInstructionEn = costTier === 'cheap'
    ? 'Requested cost tier: cheap (up to 1 Divine Orb). Prioritize low-cost progression and budget alternatives.'
    : costTier === 'medium'
      ? 'Requested cost tier: medium (1 to 10 Divine Orbs). Balance efficiency, survivability, and upgrades.'
      : costTier === 'expensive'
        ? 'Requested cost tier: expensive (10 to 100 Divine Orbs). Include stronger upgrades and scaling paths.'
        : 'Requested cost tier: Mirror of Kalandra (1+ Mirrors of Kalandra). Provide premium endgame optimization and luxury upgrades.';
  const notesInstruction = session_context.build_notes
    ? `\n\nPLAYER NOTES (CRITICAL): ${session_context.build_notes}`
    : '';

  const factualDeadlineAtMs = Date.now() + getFactPipelineBudgetMs();

  // Language instruction
  const langInstruction = session_context.language ? `\nIMPORTANT: OUTPUT MUST BE IN "${session_context.language}" LANGUAGE.` : '';
  const groundedTerms = await groundUserTerms(session_context, partyMembersDb, {
    deadlineAtMs: factualDeadlineAtMs,
  });
  const evidencePack = buildEvidencePackFromGrounding(groundedTerms, factualDeadlineAtMs);
  const groundingInstruction = buildGroundingInstruction(groundedTerms);
  const groundingFailures = buildGroundingFailureDetails(groundedTerms);
  const sourceUnavailableGrounding = groundingFailures.filter((failure) => failure.code === 'source_unavailable' || failure.code === 'error');
  const sourceConflictStrategy = getOfficialSourceConflictStrategy();

  const hasZeroVerifiedGrounding =
    evidencePack.metadata.termsTotal > 0 &&
    evidencePack.metadata.termsVerified === 0;

  if (sourceUnavailableGrounding.length > 0 && hasZeroVerifiedGrounding) {
    if (sourceConflictStrategy === 'fail_503') {
      throw buildOfficialSourcesUnavailableError(sourceUnavailableGrounding);
    }
    console.warn('[Gemini][FactPipeline] Preflight source outage with zero verified terms; degrading due strategy.', {
      strategy: sourceConflictStrategy,
      unavailableCount: sourceUnavailableGrounding.length,
    });
  }

  if (sourceUnavailableGrounding.length > 0) {
    console.warn('[Gemini][FactPipeline] Partial grounding source unavailability detected; continuing to claim-level verification.', {
      unavailableCount: sourceUnavailableGrounding.length,
      verifiedTerms: evidencePack.metadata.termsVerified,
      totalTerms: evidencePack.metadata.termsTotal,
    });
  }

  const unresolvedGameTerms = hasGroundingUnverifiedFacts(groundedTerms)
    ? groundingFailures.filter((failure) => failure.code !== 'source_unavailable' && failure.code !== 'error')
    : [];

  console.info('[Gemini][FactPipeline] Grounding summary', {
    grounding_terms_total: evidencePack.metadata.termsTotal,
    grounding_terms_verified: evidencePack.metadata.termsVerified,
    grounding_terms_unverified: evidencePack.metadata.termsUnverified,
    source_timeout_rate: sourceUnavailableGrounding.length > 0 ? 1 : 0,
    deadlineAtMs: factualDeadlineAtMs,
  });

  const evidenceSummaryInstruction = `

OFFICIAL EVIDENCE PACK:
- generated_at: ${evidencePack.generatedAt}
- terms_total: ${evidencePack.metadata.termsTotal}
- terms_verified: ${evidencePack.metadata.termsVerified}
- terms_unverified: ${evidencePack.metadata.termsUnverified}
- unresolved_terms: ${unresolvedGameTerms.map((term) => `${term.term}:${term.code}`).join(', ') || 'none'}
- You must not output factual claims without explicit support from this Evidence Pack or direct official evidence.
`;

  const localAiContext = await getLocalAiContext();

  const systemInstruction = BUILD_GENERATION_SYSTEM_INSTRUCTION(session_context, costTierInstructionEn, notesInstruction)
    + langInstruction
    + groundingInstruction
    + evidenceSummaryInstruction
    + buildLocalContextInstruction(localAiContext);

  const prompt = JSON.stringify({ party_members: partyMembersDb, build_context: session_context });

  const generateWithModel = async (model: string, correctionInstruction = '') => ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: `${systemInstruction}${correctionInstruction}`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysis_log: { type: Type.STRING },
          build_title: { type: Type.STRING },
          build_reasoning: { type: Type.STRING },
          gear_gems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { name: { type: Type.STRING }, quantity: { type: Type.STRING }, unit: { type: Type.STRING } },
            },
          },
          build_items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { name: { type: Type.STRING }, quantity: { type: Type.STRING }, unit: { type: Type.STRING } },
            },
          },
          build_steps: { type: Type.ARRAY, items: { type: Type.STRING } },
          compliance_badge: { type: Type.BOOLEAN },
          build_archetype: { type: Type.STRING },
          build_cost_tier: { type: Type.STRING },
          setup_time: { type: Type.STRING },
          setup_time_minutes: { type: Type.NUMBER },
          language: { type: Type.STRING }
        },
        required: [
          "analysis_log",
          "build_title",
          "build_reasoning",
          "gear_gems",
          "build_items",
          "build_steps",
          "compliance_badge",
          "build_archetype",
          "build_cost_tier",
          "setup_time",
          "setup_time_minutes",
        ]
      }
    }
  });

  const generateWithFallback = async (correctionInstruction = '') => {
    let lastQuotaError: any = null;
    let sawQuotaError = false;
    let sawModelNotFoundError = false;
    const modelAttemptDetails: ModelAttemptDetail[] = [];

    for (let index = 0; index < modelAttemptChain.length; index += 1) {
      const model = modelAttemptChain[index];

      try {
        return await generateWithModel(model, correctionInstruction);
      } catch (modelError: any) {
        const payload = parseGeminiErrorPayload(modelError);
        const numericStatus = Number(modelError?.status ?? modelError?.code ?? payload?.error?.code);
        const status = Number.isFinite(numericStatus) ? numericStatus : null;

        if (isGeminiQuotaExceededError(modelError)) {
          sawQuotaError = true;
          lastQuotaError = modelError;
          modelAttemptDetails.push({ model, reason: 'quota', status });

          if (index < modelAttemptChain.length - 1) {
            console.warn(`[Gemini] Quota exceeded on ${model}. Retrying with fallback model ${modelAttemptChain[index + 1]}.`);
          }
          continue;
        }

        if (isModelNotFoundError(modelError)) {
          sawModelNotFoundError = true;
          modelAttemptDetails.push({ model, reason: 'model_not_found', status: status ?? 404 });

          if (index < modelAttemptChain.length - 1) {
            console.warn(`[Gemini] Model ${model} unavailable for generateContent. Retrying with ${modelAttemptChain[index + 1]}.`);
          }
          continue;
        }

        throw modelError;
      }
    }

    if (sawModelNotFoundError) {
      throw buildGeminiModelUnavailableError(modelAttemptDetails);
    }

    if (sawQuotaError) {
      throw buildGeminiQuotaExceededError(lastQuotaError);
    }

    throw buildGeminiModelUnavailableError(modelAttemptDetails);
  };

  let response = await generateWithFallback();
  if (!response.text) throw new Error("AI generation failed");

  let parsedBuild = normalizeBuildPayload(JSON.parse(response.text)) as unknown as GeneratedBuild;
  let domainAssessment = assessBuildDomain(parsedBuild);
  let acceptedWithSourceDegradation = false;

  if (domainAssessment.isInvalid) {
    console.warn('[Gemini] Domain mismatch detected. Retrying generation with strict PoE2 correction.', {
      reason: domainAssessment.reason,
      culinaryHits: domainAssessment.culinaryHits,
      poeHits: domainAssessment.poeHits,
      poe1ExclusiveHits: domainAssessment.poe1ExclusiveHits,
      matchedTerms: domainAssessment.matchedTerms,
      culinaryMatchedTerms: domainAssessment.culinaryMatchedTerms,
      poe1MatchedTerms: domainAssessment.poe1MatchedTerms,
    });

    response = await generateWithFallback(DOMAIN_CORRECTION_INSTRUCTION);
    if (!response.text) throw new Error("AI generation failed");

    parsedBuild = normalizeBuildPayload(JSON.parse(response.text)) as unknown as GeneratedBuild;
    domainAssessment = assessBuildDomain(parsedBuild);

    if (domainAssessment.isInvalid) {
      console.warn('[Gemini] Domain mismatch persisted after correction.', {
        reason: domainAssessment.reason,
        culinaryHits: domainAssessment.culinaryHits,
        poeHits: domainAssessment.poeHits,
        poe1ExclusiveHits: domainAssessment.poe1ExclusiveHits,
        matchedTerms: domainAssessment.matchedTerms,
        culinaryMatchedTerms: domainAssessment.culinaryMatchedTerms,
        poe1MatchedTerms: domainAssessment.poe1MatchedTerms,
      });
      throw buildDomainMismatchError(domainAssessment);
    }
  }

  let mechanicsValidation = await validateBuildMechanics(parsedBuild, {
    mode: 'strict',
    evidencePack,
    deadlineAtMs: factualDeadlineAtMs,
  });
  console.info('[Gemini][FactPipeline] Verification summary', {
    claims_total: mechanicsValidation.claimsTotal,
    claims_verified: mechanicsValidation.claimsVerified,
    claims_blocked: mechanicsValidation.claimsBlocked,
    source_timeout_rate: mechanicsValidation.hasSourceUnavailableBlocking ? 1 : 0,
  });
  if (!mechanicsValidation.isValid || mechanicsValidation.hasSourceUnavailableBlocking) {
    console.warn('[Gemini] Fact conflict detected. Retrying generation with factual correction.', {
      conflicts: mechanicsValidation.criticalConflicts,
      warnings: mechanicsValidation.warnings,
      evidence: mechanicsValidation.evidence,
      enablerDiagnostics: mechanicsValidation.enablerDiagnostics,
      claimResults: mechanicsValidation.claimResults,
    });

    response = await generateWithFallback(buildFactConflictCorrectionInstruction(mechanicsValidation, groundingInstruction));
    if (!response.text) throw new Error("AI generation failed");

    parsedBuild = normalizeBuildPayload(JSON.parse(response.text)) as unknown as GeneratedBuild;
    domainAssessment = assessBuildDomain(parsedBuild);
    if (domainAssessment.isInvalid) {
      throw buildDomainMismatchError(domainAssessment);
    }

    mechanicsValidation = await validateBuildMechanics(parsedBuild, {
      mode: 'strict',
      evidencePack,
      deadlineAtMs: factualDeadlineAtMs,
    });
    console.info('[Gemini][FactPipeline] Verification summary (retry)', {
      claims_total: mechanicsValidation.claimsTotal,
      claims_verified: mechanicsValidation.claimsVerified,
      claims_blocked: mechanicsValidation.claimsBlocked,
      retry_success_rate: mechanicsValidation.isValid && !mechanicsValidation.hasSourceUnavailableBlocking ? 1 : 0,
      source_timeout_rate: mechanicsValidation.hasSourceUnavailableBlocking ? 1 : 0,
    });
    if (!mechanicsValidation.isValid || mechanicsValidation.hasSourceUnavailableBlocking) {
      console.warn('[Gemini] Fact conflict persisted after correction.', {
        conflicts: mechanicsValidation.criticalConflicts,
        warnings: mechanicsValidation.warnings,
        evidence: mechanicsValidation.evidence,
        enablerDiagnostics: mechanicsValidation.enablerDiagnostics,
        claimResults: mechanicsValidation.claimResults,
      });

      if (mechanicsValidation.hasSourceUnavailableBlocking) {
        if (sourceConflictStrategy === 'fail_503') {
          throw buildOfficialSourcesUnavailableError({
            groundingFailures: sourceUnavailableGrounding,
            verificationConflicts: mechanicsValidation.criticalConflicts,
            claimResults: mechanicsValidation.claimResults,
          });
        }

        console.warn('[Gemini][FactPipeline] Degrading source-unavailable conflicts to warn mode.', {
          strategy: sourceConflictStrategy,
          blockedClaims: mechanicsValidation.claimsBlocked,
        });

        const degraded = autoCorrectBuildFactConflicts(parsedBuild, mechanicsValidation, {
          language: session_context.language,
          forceUncertaintyNote: true,
        });

        parsedBuild = degraded.correctedBuild as GeneratedBuild;
        mechanicsValidation = await validateBuildMechanics(parsedBuild, {
          mode: 'warn',
          evidencePack,
          deadlineAtMs: factualDeadlineAtMs,
        });
        if (!mechanicsValidation.isValid) {
          throw buildFactUnverifiedError(mechanicsValidation);
        }

        parsedBuild = annotateItemUncertainty(parsedBuild, session_context.language) as GeneratedBuild;
        acceptedWithSourceDegradation = true;
      } else {
        throw buildFactUnverifiedError(mechanicsValidation);
      }
    }
  }

  if (acceptedWithSourceDegradation) {
    console.warn('[Gemini][FactPipeline] Returning build with explicit source-unavailability uncertainty note.');
  }

  parsedBuild = annotateItemUncertainty(parsedBuild, session_context.language) as GeneratedBuild;

  // Log usage
  try {
    const inputTokens = response.usageMetadata?.promptTokenCount || 0;
    const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;

    // Attempt to attribute usage to a user/hideout (legacy DB field: kitchenId).
    let userId: string | undefined;
    let kitchenId: string | undefined;

    if (partyMembersDb.length > 0) {
      // Use the first member's active hideout context.
      kitchenId = partyMembersDb[0].kitchenId;
      userId = partyMembersDb[0].userId || undefined;
    }

    await prisma.geminiUsage.create({
      data: {
        prompt,
        response: response.text,
        inputTokens,
        outputTokens,
        userId,
        kitchenId
      }
    });
  } catch (err) {
    console.error("Failed to log Gemini usage:", err);
  }

  return parsedBuild;
};

/**
 * Translates an existing build record to a target language.
 */
export const translateBuild = async (
  build: GeneratedBuild | GeneratedRecipe,
  targetLanguage: string,
  context?: { userId?: string; kitchenId?: string }
): Promise<GeneratedBuild> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const getLanguageName = (code: string) => {
    const map: Record<string, string> = {
      'pt-BR': 'Brazilian Portuguese',
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian'
    };
    return map[code] || code;
  };

  const fullLanguage = getLanguageName(targetLanguage);
  const localAiContext = await getLocalAiContext();
  const normalizedBuild = normalizeBuildPayload(build);

  const systemInstruction = `
    You are a professional Path of Exile 2 build translator.
    Translate the given JSON build into "${fullLanguage}".
    Preserve the JSON structure exactly.
    Translate all user-facing strings (title, reasoning, instructions).
    IMPORTANT: You MUST translate the 'name' and 'unit' fields inside 'gear_gems' AND 'build_items' arrays.
    Do NOT remove any items from 'gear_gems' or 'build_items'. Keep the counts exactly the same.
    Do not translate Keys.
    For 'analysis_log', provide a brief translation note.${buildLocalContextInstruction(localAiContext)}
  `;

  const prompt = JSON.stringify(normalizedBuild);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysis_log: { type: Type.STRING },
          build_title: { type: Type.STRING },
          build_reasoning: { type: Type.STRING },
          gear_gems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { name: { type: Type.STRING }, quantity: { type: Type.STRING }, unit: { type: Type.STRING } },
            },
          },
          build_items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { name: { type: Type.STRING }, quantity: { type: Type.STRING }, unit: { type: Type.STRING } },
            },
          },
          build_steps: { type: Type.ARRAY, items: { type: Type.STRING } },
          compliance_badge: { type: Type.BOOLEAN },
          build_archetype: { type: Type.STRING },
          build_cost_tier: { type: Type.STRING },
          setup_time: { type: Type.STRING },
          setup_time_minutes: { type: Type.NUMBER }
        },
        required: [
          "analysis_log",
          "build_title",
          "build_reasoning",
          "gear_gems",
          "build_items",
          "build_steps",
          "compliance_badge",
          "build_archetype",
          "build_cost_tier",
          "setup_time",
          "setup_time_minutes",
        ]
      }
    }
  });

  if (!response.text) throw new Error("Build translation failed");

  // Log usage
  try {
    const inputTokens = response.usageMetadata?.promptTokenCount || 0;
    const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;

    await prisma.geminiUsage.create({
      data: {
        prompt,
        response: response.text,
        inputTokens,
        outputTokens,
        userId: context?.userId,
        kitchenId: context?.kitchenId
      }
    });
  } catch (err) {
    console.error("Failed to log Gemini usage:", err);
  }

  return normalizeBuildPayload(JSON.parse(response.text)) as unknown as GeneratedBuild;
};

/**
 * @deprecated Use craftBuildWithAI.
 */
export const generateRecipe = async (
  partyMembersDb: KitchenMember[],
  session_context: SessionContext
): Promise<GeneratedRecipe> => {
  const canonicalBuild = await craftBuildWithAI(partyMembersDb, session_context);
  return serializeBuildPayload(canonicalBuild, 'legacy') as unknown as GeneratedRecipe;
};

/**
 * @deprecated Use translateBuild.
 */
export const translateRecipe = async (
  buildLikeLegacyPayload: GeneratedRecipe,
  targetLanguage: string,
  context?: { userId?: string; kitchenId?: string }
): Promise<GeneratedRecipe> => {
  const translatedBuild = await translateBuild(buildLikeLegacyPayload, targetLanguage, context);
  return serializeBuildPayload(translatedBuild, 'legacy') as unknown as GeneratedRecipe;
};
