import { readFile } from 'fs/promises';
import path from 'path';

const DEFAULT_AI_CONTEXT_FILE_PATH = '.ai/ai-context.local.md';
const DEFAULT_AI_CONTEXT_TEMPLATE_PATH = '.ai/ai-context.template.md';

type ContextReadOptions = {
  warnOnError?: boolean;
  legacyWarnMessage?: boolean;
};

type ContextReadResult = {
  content: string | null;
  missing: boolean;
};

async function readContextFile(
  filePath: string,
  options: ContextReadOptions = {},
): Promise<ContextReadResult> {
  const { warnOnError = false, legacyWarnMessage = false } = options;
  try {
    const rawContent = await readFile(filePath, 'utf8');
    const trimmed = rawContent.trim();
    return { content: trimmed || null, missing: false };
  } catch (error: any) {
    const missing = error?.code === 'ENOENT';
    if (warnOnError && error?.code !== 'ENOENT') {
      if (legacyWarnMessage) {
        console.warn(`[AI Context] Failed to read local context file at ${filePath}:`, error);
      } else {
        console.warn(`[AI Context] Failed to read context file at ${filePath}:`, error);
      }
    }
    return { content: null, missing };
  }
}

export async function getLocalAiContext(): Promise<string> {
  const configuredPath = process.env.AI_CONTEXT_FILE_PATH?.trim() || DEFAULT_AI_CONTEXT_FILE_PATH;
  const resolvedPath = path.resolve(process.cwd(), configuredPath);
  const resolvedTemplatePath = path.resolve(process.cwd(), DEFAULT_AI_CONTEXT_TEMPLATE_PATH);

  const configuredContext = await readContextFile(resolvedPath, {
    warnOnError: true,
    legacyWarnMessage: true,
  });
  if (configuredContext.content) {
    return configuredContext.content;
  }

  // Always fallback to committed template when local context is absent
  // and either no explicit path is provided or the explicit file is missing.
  const shouldFallbackToTemplate =
    resolvedPath !== resolvedTemplatePath &&
    (!process.env.AI_CONTEXT_FILE_PATH?.trim() || configuredContext.missing);

  if (shouldFallbackToTemplate) {
    const templateContext = await readContextFile(resolvedTemplatePath);
    if (templateContext.content) {
      return templateContext.content;
    }
  }

  return '';
}
