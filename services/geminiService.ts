
import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { KitchenMember, SessionContext, GeneratedRecipe } from "../types";
import { RECIPE_GENERATION_SYSTEM_INSTRUCTION } from "@/lib/prompts";

/**
 * Generates a safe and creative recipe based on household profiles, pantry, and meal type.
 */
export const generateRecipe = async (
  household_db: KitchenMember[],
  session_context: SessionContext
): Promise<GeneratedRecipe> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const isChefMode = session_context.difficulty_preference === 'chef';
  const obs = session_context.observation ? `\n\nUSER OBSERVATIONS (CRITICAL): ${session_context.observation}` : '';
  const chefInstructionEn = isChefMode ? "CHEF MODE ACTIVATED: User wants to cook from scratch (doughs, sauces, stocks). Complex and technical recipe." : `Requested difficulty: ${session_context.difficulty_preference}.`;
  
  // Language Instruction
  const langInstruction = session_context.language ? `\nIMPORTANT: OUTPUT MUST BE IN "${session_context.language}" LANGUAGE.` : '';

  const systemInstruction = RECIPE_GENERATION_SYSTEM_INSTRUCTION(session_context, chefInstructionEn, obs) + langInstruction;

  const prompt = JSON.stringify({ household_db, session_context });


  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysis_log: { type: Type.STRING },
          recipe_title: { type: Type.STRING },
          match_reasoning: { type: Type.STRING },
          ingredients_from_pantry: { type: Type.ARRAY, items: { type: Type.STRING } },
          shopping_list: { type: Type.ARRAY, items: { type: Type.STRING } },
          step_by_step: { type: Type.ARRAY, items: { type: Type.STRING } },
          safety_badge: { type: Type.BOOLEAN },
          meal_type: { type: Type.STRING },
          difficulty: { type: Type.STRING },
          prep_time: { type: Type.STRING },
          language: { type: Type.STRING }
        },
        required: ["analysis_log", "recipe_title", "match_reasoning", "ingredients_from_pantry", "shopping_list", "step_by_step", "safety_badge", "meal_type", "difficulty", "prep_time"]
      }
    }
  });

  if (!response.text) throw new Error("AI generation failed");

  // Log Usage
  try {
    const inputTokens = response.usageMetadata?.promptTokenCount || 0;
    const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;

    // Attempt to attribute to a user/kitchen
    let userId: string | undefined;
    let kitchenId: string | undefined;

    if (household_db.length > 0) {
      // Use the first member's kitchen. 
      // Note: household_db is likely KitchenMember[] now.
      kitchenId = household_db[0].kitchenId;
      userId = household_db[0].userId || undefined;
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

  return JSON.parse(response.text) as GeneratedRecipe;
};

/**
 * Translates an existing recipe record to a target language.
 */
export const translateRecipe = async (
  recipe: GeneratedRecipe,
  targetLanguage: string
): Promise<GeneratedRecipe> => {
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

  const systemInstruction = `
    You are a professional culinary translator. 
    Translate the given JSON recipe into "${fullLanguage}".
    Preserve the JSON structure exactly. 
    Translate all user-facing strings (title, reasoning, instructions).
    IMPORTANT: You MUST translate the 'name' and 'unit' fields inside 'ingredients_from_pantry' AND 'shopping_list' arrays.
    Do NOT remove any items from 'shopping_list' or 'ingredients_from_pantry'. Keep the counts exactly the same.
    Do not translate Keys.
    For 'analysis_log', provide a brief translation note.
  `;

  const prompt = JSON.stringify(recipe);

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp', // Flash is faster/cheaper for translation
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
            analysis_log: { type: Type.STRING },
            recipe_title: { type: Type.STRING },
            match_reasoning: { type: Type.STRING },
            ingredients_from_pantry: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, quantity: { type: Type.STRING }, unit: { type: Type.STRING } } } },
            shopping_list: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, quantity: { type: Type.STRING }, unit: { type: Type.STRING } } } },
            step_by_step: { type: Type.ARRAY, items: { type: Type.STRING } },
            safety_badge: { type: Type.BOOLEAN },
            meal_type: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            prep_time: { type: Type.STRING }
        },
        required: ["analysis_log", "recipe_title", "match_reasoning", "ingredients_from_pantry", "shopping_list", "step_by_step", "safety_badge", "meal_type", "difficulty", "prep_time"]
      }
    }
  });

  if (!response.text) throw new Error("Translation failed");

  return JSON.parse(response.text) as GeneratedRecipe;
};


