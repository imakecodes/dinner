type PatternDef = {
  term: string;
  pattern: RegExp;
  highConfidence?: boolean;
};

export type DomainMismatchReason = 'none' | 'culinary' | 'poe1_drift';

export type DomainAssessment = {
  isInvalid: boolean;
  culinaryHits: number;
  poeHits: number;
  poe1ExclusiveHits: number;
  highConfidenceCulinaryHits: number;
  matchedTerms: string[];
  culinaryMatchedTerms: string[];
  poeMatchedTerms: string[];
  poe1MatchedTerms: string[];
  reason: DomainMismatchReason;
};

export type TextDomainAssessment = {
  isCulinaryLikely: boolean;
  isPoe1DriftLikely: boolean;
  culinaryHits: number;
  poeHits: number;
  poe1ExclusiveHits: number;
  highConfidenceHits: number;
  matchedCulinaryTerms: string[];
  matchedPoeTerms: string[];
  matchedPoe1ExclusiveTerms: string[];
  reason: DomainMismatchReason;
};

type BuildLikeForGuardrail = {
  build_title?: string;
  build_reasoning?: string;
  analysis_log?: string;
  build_archetype?: string;
  build_cost_tier?: string;
  build_complexity?: string;
  setup_time?: string;
  gear_gems?: Array<{ name?: string; quantity?: string | number; unit?: string }>;
  build_items?: Array<{ name?: string; quantity?: string | number; unit?: string }>;
  build_steps?: string[];
};

const CULINARY_PATTERNS: PatternDef[] = [
  { term: 'recipe', pattern: /\brecipe(s)?\b/iu, highConfidence: true },
  { term: 'receita', pattern: /\breceita(s)?\b/iu, highConfidence: true },
  { term: 'dish', pattern: /\bdish(es)?\b/iu, highConfidence: true },
  { term: 'prato', pattern: /\bprato(s)?\b/iu, highConfidence: true },
  { term: 'meal', pattern: /\bmeal(s)?\b/iu, highConfidence: true },
  { term: 'refeicao', pattern: /\brefei[cç][aã]o(es)?\b/iu, highConfidence: true },
  { term: 'food', pattern: /\bfood\b/iu, highConfidence: true },
  { term: 'comida', pattern: /\bcomida\b/iu, highConfidence: true },
  { term: 'culinary', pattern: /\bculinar(y|ia|io)\b/iu, highConfidence: true },
  { term: 'kitchen', pattern: /\bkitchen\b/iu, highConfidence: true },
  { term: 'cozinha', pattern: /\bcozinha\b/iu, highConfidence: true },
  { term: 'pantry', pattern: /\bpantry\b/iu, highConfidence: true },
  { term: 'despensa', pattern: /\bdespensa\b/iu, highConfidence: true },
  { term: 'fridge', pattern: /\bfridge\b/iu, highConfidence: true },
  { term: 'geladeira', pattern: /\bgeladeira\b/iu, highConfidence: true },
  { term: 'ingredient', pattern: /\bingredient(s)?\b/iu, highConfidence: true },
  { term: 'ingrediente', pattern: /\bingrediente(s)?\b/iu, highConfidence: true },
  { term: 'cook', pattern: /\bcook(ing|ed)?\b/iu, highConfidence: true },
  { term: 'cozinhar', pattern: /\bcozinh(ar|ando|ado)\b/iu, highConfidence: true },
  { term: 'prato principal', pattern: /\bprato principal\b/iu, highConfidence: true },
  { term: 'main course', pattern: /\bmain course\b/iu, highConfidence: true },
  { term: 'appetizer', pattern: /\bappetizer\b/iu, highConfidence: true },
  { term: 'dessert', pattern: /\bdessert\b/iu, highConfidence: true },
  { term: 'snack', pattern: /\bsnack\b/iu, highConfidence: true },
  { term: 'chicken', pattern: /\bchicken\b/iu, highConfidence: true },
  { term: 'frango', pattern: /\bfrango\b/iu, highConfidence: true },
  { term: 'beef', pattern: /\bbeef\b/iu, highConfidence: true },
  { term: 'carne', pattern: /\bcarne\b/iu, highConfidence: true },
  { term: 'pork', pattern: /\bpork\b/iu, highConfidence: true },
  { term: 'porco', pattern: /\bporco\b/iu, highConfidence: true },
  { term: 'fish', pattern: /\bfish\b/iu, highConfidence: true },
  { term: 'peixe', pattern: /\bpeixe\b/iu, highConfidence: true },
  { term: 'rice', pattern: /\brice\b/iu, highConfidence: true },
  { term: 'arroz', pattern: /\barroz\b/iu, highConfidence: true },
  { term: 'pasta', pattern: /\bpasta\b/iu, highConfidence: true },
  { term: 'macarrao', pattern: /\bmacarr[aã]o\b/iu, highConfidence: true },
  { term: 'onion', pattern: /\bonion\b/iu, highConfidence: true },
  { term: 'cebola', pattern: /\bcebola\b/iu, highConfidence: true },
  { term: 'garlic', pattern: /\bgarlic\b/iu, highConfidence: true },
  { term: 'alho', pattern: /\balho\b/iu, highConfidence: true },
  { term: 'tomato', pattern: /\btomato(es)?\b/iu, highConfidence: true },
  { term: 'tomate', pattern: /\btomate(s)?\b/iu, highConfidence: true },
  { term: 'salt', pattern: /\bsalt\b/iu, highConfidence: true },
  { term: 'sal', pattern: /\bsal\b/iu, highConfidence: true },
  { term: 'pepper', pattern: /\bpepper\b/iu, highConfidence: true },
  { term: 'pimenta', pattern: /\bpimenta\b/iu, highConfidence: true },
  { term: 'sugar', pattern: /\bsugar\b/iu, highConfidence: true },
  { term: 'acucar', pattern: /\ba[cç][uú]car\b/iu, highConfidence: true },
  { term: 'egg', pattern: /\begg(s)?\b/iu, highConfidence: true },
  { term: 'ovo', pattern: /\bovo(s)?\b/iu, highConfidence: true },
  { term: 'milk', pattern: /\bmilk\b/iu, highConfidence: true },
  { term: 'leite', pattern: /\bleite\b/iu, highConfidence: true },
  { term: 'cheese', pattern: /\bcheese\b/iu, highConfidence: true },
  { term: 'queijo', pattern: /\bqueijo\b/iu, highConfidence: true },
  { term: 'bread', pattern: /\bbread\b/iu, highConfidence: true },
  { term: 'pao', pattern: /\bp[aã]o\b/iu, highConfidence: true },
  { term: 'flour', pattern: /\bflour\b/iu, highConfidence: true },
  { term: 'farinha', pattern: /\bfarinha\b/iu, highConfidence: true },
  { term: 'butter', pattern: /\bbutter\b/iu, highConfidence: true },
  { term: 'manteiga', pattern: /\bmanteiga\b/iu, highConfidence: true },
  { term: 'olive oil', pattern: /\bolive oil\b/iu, highConfidence: true },
  { term: 'azeite', pattern: /\bazeite\b/iu, highConfidence: true },
  { term: 'cake', pattern: /\bcake\b/iu, highConfidence: true },
  { term: 'bolo', pattern: /\bbolo\b/iu, highConfidence: true },
  { term: 'soup', pattern: /\bsoup\b/iu, highConfidence: true },
  { term: 'sopa', pattern: /\bsopa\b/iu, highConfidence: true },
  { term: 'salad', pattern: /\bsalad\b/iu, highConfidence: true },
  { term: 'salada', pattern: /\bsalada\b/iu, highConfidence: true },
  { term: 'pizza', pattern: /\bpizza\b/iu, highConfidence: true },
  { term: 'burger', pattern: /\bburger\b/iu, highConfidence: true },
  { term: 'sandwich', pattern: /\bsandwich\b/iu, highConfidence: true },
  { term: 'sanduiche', pattern: /\bsandu[ií]che\b/iu, highConfidence: true },
  { term: 'beans', pattern: /\bbean(s)?\b/iu, highConfidence: true },
  { term: 'feijao', pattern: /\bfeij[aã]o\b/iu, highConfidence: true },
  { term: 'potato', pattern: /\bpotato(es)?\b/iu, highConfidence: true },
  { term: 'batata', pattern: /\bbatata\b/iu, highConfidence: true },
  { term: 'carrot', pattern: /\bcarrot(s)?\b/iu, highConfidence: true },
  { term: 'cenoura', pattern: /\bcenoura\b/iu, highConfidence: true },
  { term: 'banana', pattern: /\bbanana(s)?\b/iu, highConfidence: true },
  { term: 'apple', pattern: /\bapple(s)?\b/iu, highConfidence: true },
  { term: 'maca', pattern: /\bma[cç][aã](s)?\b/iu, highConfidence: true },
  { term: 'tablespoon', pattern: /\btablespoon(s)?\b/iu, highConfidence: true },
  { term: 'teaspoon', pattern: /\bteaspoon(s)?\b/iu, highConfidence: true },
  { term: 'tbsp', pattern: /\btbsp\b/iu, highConfidence: true },
  { term: 'tsp', pattern: /\btsp\b/iu, highConfidence: true },
  { term: 'cup', pattern: /\bcup(s)?\b/iu, highConfidence: true },
  { term: 'ounce', pattern: /\bounce(s)?\b/iu, highConfidence: true },
  { term: 'pound', pattern: /\bpound(s)?\b/iu, highConfidence: true },
  { term: 'gram', pattern: /\bgram(s)?\b/iu, highConfidence: true },
  { term: 'kilogram', pattern: /\bkilogram(s)?\b/iu, highConfidence: true },
  { term: 'milliliter', pattern: /\bmillilit(er|re)(s)?\b/iu, highConfidence: true },
  { term: 'liter', pattern: /\blit(er|re)(s)?\b/iu, highConfidence: true },
  { term: 'metric cooking unit', pattern: /\b\d+\s?(kg|g|ml|l|oz|lb)\b/iu, highConfidence: true },
];

const POE_PATTERNS: PatternDef[] = [
  { term: 'path of exile 2', pattern: /\bpath of exile\s*2\b/iu },
  { term: 'poe2', pattern: /\bpoe\s*2\b|\bpoe2\b/iu },
  { term: 'path of exile', pattern: /\bpath of exile\b/iu },
  { term: 'poe', pattern: /\bpoe\b/iu },
  { term: 'exile', pattern: /\bexile(s)?\b/iu },
  { term: 'atlas', pattern: /\batlas\b/iu },
  { term: 'hideout', pattern: /\bhideout\b/iu },
  { term: 'stash', pattern: /\bstash\b/iu },
  { term: 'party', pattern: /\bparty\b/iu },
  { term: 'league starter', pattern: /\bleague starter\b/iu },
  { term: 'mapper', pattern: /\bmapper\b/iu },
  { term: 'bossing', pattern: /\bbossing\b/iu },
  { term: 'ascendant', pattern: /\bascendant\b/iu },
  { term: 'ascendancy', pattern: /\bascendanc(y|ies)\b/iu },
  { term: 'skill gem', pattern: /\bskill gem(s)?\b/iu },
  { term: 'support gem', pattern: /\bsupport gem(s)?\b/iu },
  { term: 'gem', pattern: /\bgem(s)?\b/iu },
  { term: 'gear', pattern: /\bgear\b/iu },
  { term: 'socket', pattern: /\bsocket(s)?\b/iu },
  { term: 'link', pattern: /\blink(s)?\b/iu },
  { term: 'map', pattern: /\bmap(s|ping)?\b/iu },
  { term: 'boss', pattern: /\bboss(es|ing)?\b/iu },
  { term: 'orb', pattern: /\borb(s)?\b/iu },
  { term: 'fusing', pattern: /\bfusing\b/iu },
  { term: 'chromatic', pattern: /\bchromatic\b/iu },
  { term: 'annulment', pattern: /\bannulment\b/iu },
  { term: 'vaal orb', pattern: /\bvaal orb\b/iu },
  { term: 'chaos orb', pattern: /\bchaos orb\b/iu },
  { term: 'divine orb', pattern: /\bdivine orb\b/iu },
  { term: 'exalted orb', pattern: /\bexalted orb\b/iu },
  { term: 'jewel', pattern: /\bjewel(s)?\b/iu },
  { term: 'waystone', pattern: /\bwaystone(s)?\b/iu },
  { term: 'dps', pattern: /\bdps\b/iu },
  { term: 'passive tree', pattern: /\bpassive tree\b/iu },
  { term: 'ascendancy point', pattern: /\bascendancy point(s)?\b/iu },
  { term: 'resistance', pattern: /\bresistance(s)?\b/iu },
  { term: 'energy shield', pattern: /\benergy shield\b/iu },
  { term: 'evasion', pattern: /\bevasion\b/iu },
  { term: 'armour', pattern: /\barmou?r\b/iu },
];

const POE2_STRONG_PATTERNS: PatternDef[] = [
  { term: 'path of exile 2', pattern: /\bpath of exile\s*2\b/iu },
  { term: 'poe2', pattern: /\bpoe\s*2\b|\bpoe2\b/iu },
];

const POE1_EXCLUSIVE_PATTERNS: PatternDef[] = [
  { term: 'watchstone', pattern: /\bwatchstone(s)?\b/iu, highConfidence: true },
  { term: 'sextant', pattern: /\bsextant(s)?\b/iu, highConfidence: true },
  { term: 'pantheon', pattern: /\bpantheon\b/iu, highConfidence: true },
  { term: 'labyrinth enchant', pattern: /\blabyrinth enchant(s|ment)?\b/iu, highConfidence: true },
  { term: 'cluster jewel', pattern: /\bcluster jewel(s)?\b/iu, highConfidence: true },
  { term: 'delirium orb', pattern: /\bdelirium orb(s)?\b/iu, highConfidence: true },
  { term: 'awakener level', pattern: /\bawakener level\b/iu, highConfidence: true },
  { term: 'conqueror influence', pattern: /\bconqueror(s)? influence\b/iu, highConfidence: true },
  { term: 'shaper influence', pattern: /\bshaper influence\b/iu, highConfidence: true },
  { term: 'elder influence', pattern: /\belder influence\b/iu, highConfidence: true },
];

function collectMatches(text: string, patterns: PatternDef[]): { all: string[]; highConfidence: string[] } {
  const source = String(text || '');
  const allMatches = new Set<string>();
  const highConfidenceMatches = new Set<string>();

  for (const pattern of patterns) {
    if (pattern.pattern.test(source)) {
      allMatches.add(pattern.term);
      if (pattern.highConfidence) {
        highConfidenceMatches.add(pattern.term);
      }
    }
  }

  return {
    all: Array.from(allMatches),
    highConfidence: Array.from(highConfidenceMatches),
  };
}

export function assessTextDomain(text: string): TextDomainAssessment {
  const culinary = collectMatches(text, CULINARY_PATTERNS);
  const poe = collectMatches(text, POE_PATTERNS);
  const poe2Strong = collectMatches(text, POE2_STRONG_PATTERNS);
  const poe1Exclusive = collectMatches(text, POE1_EXCLUSIVE_PATTERNS);

  const isCulinaryLikely =
    culinary.highConfidence.length > 0 ||
    (culinary.all.length >= 2 && poe.all.length === 0) ||
    (culinary.all.length >= 3 && poe.all.length <= 1);

  const isPoe1DriftLikely =
    !isCulinaryLikely &&
    (
      (poe1Exclusive.all.length > 0 && poe2Strong.all.length === 0) ||
      poe1Exclusive.all.length >= 2
    );

  const reason: DomainMismatchReason = isCulinaryLikely
    ? 'culinary'
    : isPoe1DriftLikely
      ? 'poe1_drift'
      : 'none';

  return {
    isCulinaryLikely,
    isPoe1DriftLikely,
    culinaryHits: culinary.all.length,
    poeHits: poe.all.length,
    poe1ExclusiveHits: poe1Exclusive.all.length,
    highConfidenceHits: culinary.highConfidence.length,
    matchedCulinaryTerms: culinary.all,
    matchedPoeTerms: poe.all,
    matchedPoe1ExclusiveTerms: poe1Exclusive.all,
    reason,
  };
}

export function assessBuildDomain(build: BuildLikeForGuardrail): DomainAssessment {
  const criticalText = [
    build?.build_title || '',
    build?.build_reasoning || '',
    build?.analysis_log || '',
    build?.build_archetype || '',
    build?.build_cost_tier || '',
    build?.build_complexity || '',
    build?.setup_time || '',
  ]
    .join('\n')
    .trim();

  const stringifyItem = (item: { name?: string; quantity?: string | number; unit?: string }) =>
    [item?.name, item?.quantity, item?.unit]
      .filter((value) => value !== undefined && value !== null && String(value).trim() !== '')
      .map((value) => String(value).trim())
      .join(' ');

  const itemText = [
    ...(Array.isArray(build?.gear_gems) ? build.gear_gems.map((item) => stringifyItem(item)) : []),
    ...(Array.isArray(build?.build_items) ? build.build_items.map((item) => stringifyItem(item)) : []),
    ...(Array.isArray(build?.build_steps) ? build.build_steps.map((step) => String(step || '')) : []),
  ]
    .join('\n')
    .trim();

  const fullText = [criticalText, itemText].filter(Boolean).join('\n');

  const culinaryCritical = collectMatches(criticalText, CULINARY_PATTERNS);
  const culinaryAll = collectMatches(fullText, CULINARY_PATTERNS);
  const poeAll = collectMatches(fullText, POE_PATTERNS);
  const poe2StrongAll = collectMatches(fullText, POE2_STRONG_PATTERNS);
  const poe1ExclusiveAll = collectMatches(fullText, POE1_EXCLUSIVE_PATTERNS);

  const culinaryInvalid =
    culinaryAll.highConfidence.length > 0 ||
    (culinaryCritical.all.length > 0 && poeAll.all.length === 0) ||
    (culinaryAll.all.length >= 2 && poeAll.all.length === 0) ||
    (culinaryAll.all.length >= 3 && poeAll.all.length <= 1);

  const poe1DriftInvalid =
    !culinaryInvalid &&
    (
      (poe1ExclusiveAll.all.length > 0 && poe2StrongAll.all.length === 0) ||
      poe1ExclusiveAll.all.length >= 2
    );

  const isInvalid = culinaryInvalid || poe1DriftInvalid;
  const reason: DomainMismatchReason = culinaryInvalid
    ? 'culinary'
    : poe1DriftInvalid
      ? 'poe1_drift'
      : 'none';
  const matchedTerms = reason === 'poe1_drift' ? poe1ExclusiveAll.all : culinaryAll.all;

  return {
    isInvalid,
    culinaryHits: culinaryAll.all.length,
    poeHits: poeAll.all.length,
    poe1ExclusiveHits: poe1ExclusiveAll.all.length,
    highConfidenceCulinaryHits: culinaryAll.highConfidence.length,
    matchedTerms,
    culinaryMatchedTerms: culinaryAll.all,
    poeMatchedTerms: poeAll.all,
    poe1MatchedTerms: poe1ExclusiveAll.all,
    reason,
  };
}
