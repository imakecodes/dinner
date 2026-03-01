type BuildEntryLike = {
  name?: string;
  quantity?: string;
  unit?: string;
};

type BuildPersistencePayload = {
  build_title?: string;
  language?: string;
  build_archetype?: string;
  build_cost_tier?: string;
  setup_time?: string;
  gear_gems?: BuildEntryLike[];
  build_items?: BuildEntryLike[];
};

export type BuildFieldLengthViolation = {
  field: string;
  maxLength: number;
  actualLength: number;
  itemIndex?: number;
};

export type BuildFieldTooLongError = Error & {
  status: 422;
  code: 'build.field_too_long';
  details: BuildFieldLengthViolation[];
};

const MAX_VARCHAR_LENGTH = 191;

const charCount = (value: unknown): number => Array.from(String(value ?? '')).length;

const maybeAddViolation = (
  details: BuildFieldLengthViolation[],
  field: string,
  value: unknown,
  maxLength: number,
  itemIndex?: number,
) => {
  const actualLength = charCount(value);
  if (actualLength <= maxLength) {
    return;
  }

  details.push({
    field,
    maxLength,
    actualLength,
    ...(typeof itemIndex === 'number' ? { itemIndex } : {}),
  });
};

export function validateBuildPersistenceLengths(
  payload: BuildPersistencePayload,
): BuildFieldLengthViolation[] {
  const details: BuildFieldLengthViolation[] = [];

  maybeAddViolation(details, 'recipe_title', payload.build_title, MAX_VARCHAR_LENGTH);
  maybeAddViolation(details, 'language', payload.language, MAX_VARCHAR_LENGTH);
  maybeAddViolation(details, 'meal_type', payload.build_archetype, MAX_VARCHAR_LENGTH);
  maybeAddViolation(details, 'difficulty', payload.build_cost_tier, MAX_VARCHAR_LENGTH);
  maybeAddViolation(details, 'prep_time', payload.setup_time, MAX_VARCHAR_LENGTH);

  if (Array.isArray(payload.gear_gems)) {
    payload.gear_gems.forEach((item, itemIndex) => {
      maybeAddViolation(details, 'gear_gems.name', item?.name, MAX_VARCHAR_LENGTH, itemIndex);
      maybeAddViolation(details, 'gear_gems.quantity', item?.quantity, MAX_VARCHAR_LENGTH, itemIndex);
      maybeAddViolation(details, 'gear_gems.unit', item?.unit, MAX_VARCHAR_LENGTH, itemIndex);
    });
  }

  if (Array.isArray(payload.build_items)) {
    payload.build_items.forEach((item, itemIndex) => {
      maybeAddViolation(details, 'build_items.name', item?.name, MAX_VARCHAR_LENGTH, itemIndex);
      maybeAddViolation(details, 'build_items.quantity', item?.quantity, MAX_VARCHAR_LENGTH, itemIndex);
      maybeAddViolation(details, 'build_items.unit', item?.unit, MAX_VARCHAR_LENGTH, itemIndex);
    });
  }

  return details;
}

export function buildFieldTooLongError(
  details: BuildFieldLengthViolation[],
  message = 'One or more fields exceed storage limits.',
): BuildFieldTooLongError {
  const structuredError = new Error(message) as BuildFieldTooLongError;
  structuredError.status = 422;
  structuredError.code = 'build.field_too_long';
  structuredError.details = details;
  return structuredError;
}

export function isBuildFieldTooLongError(error: any): error is BuildFieldTooLongError {
  return Number(error?.status) === 422 && error?.code === 'build.field_too_long';
}

export function isPrismaP2000Error(error: any): boolean {
  return error?.code === 'P2000';
}

export function mapPrismaP2000ToFieldTooLongError(error: any): BuildFieldTooLongError {
  const metaColumn = String(error?.meta?.column_name || error?.meta?.column || 'unknown');
  const details: BuildFieldLengthViolation[] = [
    {
      field: metaColumn,
      maxLength: MAX_VARCHAR_LENGTH,
      actualLength: MAX_VARCHAR_LENGTH + 1,
    },
  ];

  return buildFieldTooLongError(details);
}
