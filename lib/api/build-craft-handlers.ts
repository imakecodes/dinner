import { NextRequest, NextResponse } from 'next/server';
import { craftBuildWithAI } from '@/services/geminiService';
import {
  normalizeBuildSessionContext,
  serializeBuildPayload,
  type BuildResponseShape,
} from '@/lib/build-contract';
import { getServerTranslator } from '@/lib/i18n-server';

export async function craftBuild(
  req: NextRequest,
  shape: BuildResponseShape = 'canonical',
) {
  const { t } = getServerTranslator(req);

  try {
    const body = await req.json();
    const members = Array.isArray(body?.members)
      ? body.members
      : Array.isArray(body?.party_members)
        ? body.party_members
        : [];

    const rawContext = body?.context && typeof body.context === 'object' ? body.context : body;
    const normalizedContext = normalizeBuildSessionContext({
      ...rawContext,
      language: body?.language || rawContext?.language,
    });

    const normalizedPartyMemberIds = (normalizedContext as { party_member_ids?: unknown[] }).party_member_ids;
    const selectedPartyMemberIds = Array.isArray(normalizedPartyMemberIds)
      ? normalizedPartyMemberIds
          .map((value: unknown) => String(value || '').trim())
          .filter(Boolean)
      : [];

    const filteredMembers = selectedPartyMemberIds.length > 0
      ? members.filter((member: { id?: unknown }) => selectedPartyMemberIds.includes(String(member?.id || '').trim()))
      : members;

    const result = await craftBuildWithAI(filteredMembers, normalizedContext as any);
    return NextResponse.json(serializeBuildPayload(result, shape));
  } catch (error: any) {
    console.error('Error crafting build:', error);

    const errorStatus = Number(error?.status);
    const errorCode = typeof error?.code === 'string' ? error.code : '';

    const isDomainMismatch = errorCode === 'gemini.domain_mismatch' || (errorStatus === 422 && !errorCode);
    if (isDomainMismatch) {
      const localizedDomainMismatch = t('api.geminiDomainMismatch');
      const fallbackDomainMessage = t('generate.generateError');

      return NextResponse.json(
        {
          error: localizedDomainMismatch === 'api.geminiDomainMismatch'
            ? fallbackDomainMessage
            : localizedDomainMismatch,
          code: 'gemini.domain_mismatch',
          details: Array.isArray(error?.details) ? error.details : [],
          ...(typeof error?.reason === 'string' ? { reason: error.reason } : {}),
        },
        { status: 422 },
      );
    }

    const isFactConflict = errorCode === 'gemini.fact_conflict';
    if (isFactConflict) {
      const localizedFactConflict = t('api.geminiFactConflict');
      const fallbackFactConflict = t('generate.generateError');

      return NextResponse.json(
        {
          error: localizedFactConflict === 'api.geminiFactConflict'
            ? fallbackFactConflict
            : localizedFactConflict,
          code: 'gemini.fact_conflict',
          details: Array.isArray(error?.details) ? error.details : [],
        },
        { status: 422 },
      );
    }

    const isModelUnavailable = Number(error?.status) === 503 || error?.code === 'gemini.model_unavailable';
    if (isModelUnavailable) {
      const localizedModelUnavailable = t('api.geminiModelUnavailable');
      const fallbackModelUnavailableMessage = t('generate.generateError');

      return NextResponse.json(
        {
          error: localizedModelUnavailable === 'api.geminiModelUnavailable'
            ? fallbackModelUnavailableMessage
            : localizedModelUnavailable,
          code: 'gemini.model_unavailable',
          details: Array.isArray(error?.details) ? error.details : [],
        },
        { status: 503 },
      );
    }

    const isQuotaError = Number(error?.status) === 429 || error?.code === 'gemini.quota_exceeded';
    if (isQuotaError) {
      const parsedRetryAfter = Number(error?.retryAfterSeconds);
      const retryAfterSeconds = Number.isFinite(parsedRetryAfter)
        ? Math.max(1, Math.ceil(parsedRetryAfter))
        : null;

      console.warn('[Build API] Gemini quota exceeded', {
        code: error?.code,
        status: error?.status,
        retryAfterSeconds,
      });

      const headers = retryAfterSeconds
        ? { 'Retry-After': String(retryAfterSeconds) }
        : undefined;

      return NextResponse.json(
        {
          error: t('generate.generateError'),
          code: 'gemini.quota_exceeded',
          retryAfterSeconds,
        },
        {
          status: 429,
          headers,
        },
      );
    }

    return NextResponse.json(
      { error: t('api.internalError') },
      { status: 500 },
    );
  }
}
