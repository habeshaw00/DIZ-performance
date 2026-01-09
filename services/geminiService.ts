
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { DailyEntry, KPIConfig, Feedback } from "../types";

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const getKPICoachingTips = async (kpiName: string, actual: number, target: number, unit: string, staffName: string) => {
  const firstName = staffName.split(' ')[0];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `You are an elite high-performance coach. Provide exactly 3 short tactical tips in Amharic letters for: "${kpiName}". 
    Actual: ${actual} ${unit}, Yearly Goal: ${target} ${unit}. 
    
    REQUIREMENTS:
    - Start with "ጤና ይስጥልኝ ${firstName}," followed by a new line.
    - Write the tips in clear, professional Amharic letters.
    - Provide exactly 3 bullet points starting with •.
    - Include exactly these two educational links: 
      [የስራ ስነ-ምግባር: Deep Work Guide](https://www.samuelthomasdavies.com/book-summaries/self-help/deep-work/)
      [የንባብ ምክር: 7 Habits Summary](https://www.hubspot.com/sales/7-habits-of-highly-effective-people-summary)
    - End with a positive statement in Amharic.`,
  });
  return response.text;
};

export const getGeneralStaffAdvice = async (staffName: string, performanceSummary: any) => {
  const firstName = staffName.split(' ')[0];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze staff performance and provide supportive strategic directions IN AMHARIC LETTERS.
    Staff: ${staffName}
    Data: ${JSON.stringify(performanceSummary)}
    
    REQUIREMENTS:
    - Response MUST be in Amharic letters.
    - Start with "የስትራቴጂክ አቅጣጫ ለ ${firstName}:".
    - Focus on motivation and tactical habits.
    - Include: [የስራ ስነ-ምግባር: Deep Work Guide](https://www.samuelthomasdavies.com/book-summaries/self-help/deep-work/) and [የንባብ ምክር: 7 Habits Summary](https://www.hubspot.com/sales/7-habits-of-highly-effective-people-summary) to help the staff grow.
    - Use energetic industrial command language.`,
  });
  return response.text;
};

export const getStaffSpecificAdvice = async (staffName: string, entries: DailyEntry[], kpis: KPIConfig[]) => {
  const firstName = staffName.split(' ')[0];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const dataString = JSON.stringify({ staffName, entries, kpis });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Analyze performance for ${staffName} and provide a specialized COACHING DIRECTIVE IN AMHARIC LETTERS.
    
    REQUIREMENTS:
    1. Start with "ለአሰልጣኞች ስትራቴጂክ መመሪያ ለ ${firstName}:"
    2. Provide achievement analysis in Amharic.
    3. Include reading motivation: [የንባብ ምክር: 7 Habits Summary](https://www.hubspot.com/sales/7-habits-of-highly-effective-people-summary).
    4. Maintain an industrial command tone.`,
  });
  return response.text;
};

export const getAIPerformanceAnalysis = async (entries: DailyEntry[], kpis: KPIConfig[], isCSM: boolean = false) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const dataString = JSON.stringify({ entries, kpis });
  
  const instruction = isCSM 
    ? `Analyze domain performance for CSM team. Provide a high-level STRATEGIC SYNC IN AMHARIC LETTERS. Focus on team mobilization.`
    : `Analyze aggregate branch performance. Provide a high-level strategic overview for the Manager on team efficiency. Use industrial command language and emojis.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `${instruction} Data: ${dataString}`,
  });
  return response.text;
};

export const generateAdviceAudio = async (text: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Professional coach: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Puck' },
        },
      },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

export const getAIFocusAlertTips = async (staffName: string, stagedMetrics: { [kpiName: string]: number }, kpis: KPIConfig[]) => {
  const firstName = staffName.split(' ')[0];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Immediate sync confirmation IN AMHARIC LETTERS for ${staffName}.
    Transmission: ${JSON.stringify(stagedMetrics)}
    
    REQUIREMENTS:
    - Start with "የመረጃ ልውውጥ ተሳክቷል፣ ${firstName}!".
    - Exactly 2 high-impact bullet points in Amharic letters regarding consistency.`,
  });
  return response.text;
};
