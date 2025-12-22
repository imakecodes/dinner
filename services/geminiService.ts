
import { GoogleGenAI, Type } from "@google/genai";
import { HouseholdMember, SessionContext, GeneratedRecipe, ImageSize, AspectRatio } from "../types";

/**
 * Generates a safe and creative recipe based on household profiles, pantry, and meal type.
 */
export const generateRecipe = async (
  household_db: HouseholdMember[],
  session_context: SessionContext,
  language: 'en' | 'pt' = 'en'
): Promise<GeneratedRecipe> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemInstruction = language === 'pt'
    ? `Você é o Chef Executivo do "Dinner?".
OBJETIVOS:
1. Respeite o tipo de refeição: ${session_context.requested_type}.
2. Dificuldade solicitada: ${session_context.difficulty_preference}.
3. Preferência de tempo: ${session_context.prep_time_preference === 'quick' ? 'Rápido (menos de 30min)' : 'Pode levar tempo'}.
4. Se for impossível criar uma receita de qualidade do tipo solicitado com os ingredientes disponíveis, use o analysis_log para explicar o porquê detalhadamente.
5. Garanta SEGURANÇA TOTAL contra restrições alimentares.
SAÍDA:
Gere a resposta em PORTUGUÊS no formato JSON.`
    : `You are the Executive Chef for "Dinner?".
OBJECTIVES:
1. Follow the requested meal type: ${session_context.requested_type}.
2. Requested difficulty: ${session_context.difficulty_preference}.
3. Prep time preference: ${session_context.prep_time_preference === 'quick' ? 'Quick (under 30min)' : 'Can take time'}.
4. If it is impossible to create a quality recipe of the requested type with the available ingredients, use analysis_log to explain exactly why.
5. Ensure 100% SAFETY against food restrictions.
OUTPUT:
Localize the output to ENGLISH and respond ONLY with JSON.`;

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
          prep_time: { type: Type.STRING }
        },
        required: ["analysis_log", "recipe_title", "match_reasoning", "ingredients_from_pantry", "shopping_list", "step_by_step", "safety_badge", "meal_type", "difficulty", "prep_time"]
      }
    }
  });

  if (!response.text) throw new Error("AI generation failed");
  return JSON.parse(response.text) as GeneratedRecipe;
};

export const generateDishImage = async (
  recipeName: string,
  size: ImageSize,
  ratio: AspectRatio
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `Gourmet food photography of ${recipeName}, masterfully plated, elegant lighting, bokeh background. High contrast, professional culinary magazine style.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        aspectRatio: ratio as any,
        imageSize: size as any
      }
    }
  });

  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part?.inlineData?.data) throw new Error("Image generation failed");

  return `data:image/png;base64,${part.inlineData.data}`;
};
