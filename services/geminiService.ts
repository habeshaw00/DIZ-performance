
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { DailyEntry, KPIConfig, Feedback, AppLanguage } from "../types";

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

// Helper to detect gender for specific staff members
const isFemaleStaff = (name: string): boolean => {
  const lowerName = name.toLowerCase();
  return ['meron', 'genet', 'selima'].some(n => lowerName.includes(n));
};

const getLanguageInstruction = (lang: AppLanguage) => {
  switch (lang) {
    case 'om': return "Output strictly in Afaan Oromoo (Oromiffaa) using the Qubee script.";
    case 'en': return "Output strictly in English.";
    case 'am': 
    default: return "Output strictly in Amharic letters.";
  }
};

const getGreetingPrefix = (lang: AppLanguage, name: string) => {
  switch (lang) {
    case 'om': return `Akkam ${name}`;
    case 'en': return `Hello ${name}`;
    case 'am': 
    default: return `ሰላም ${name}`;
  }
};

export const getKPICoachingTips = async (kpiName: string, actual: number, target: number, unit: string, staffName: string, lang: AppLanguage) => {
  const firstName = staffName.split(' ')[0];
  const isFemale = isFemaleStaff(staffName);
  
  let genderContext = "";
  if (isFemale) {
    if (lang === 'am') genderContext = "Address the staff member using female gender grammatical forms in Amharic.";
    if (lang === 'om') genderContext = "Address the staff member using female gender grammatical forms in Afaan Oromoo.";
  }

  const langInstruction = getLanguageInstruction(lang);
  const greeting = getGreetingPrefix(lang, firstName);

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `You are an elite high-performance banking coach. Provide exactly 3 short tactical tips to help the staff member achieve their OFFICIAL BANK TARGET for: "${kpiName}". 
    
    Current Performance: ${actual} ${unit}
    Assigned Bank Target: ${target} ${unit}
    ${genderContext}
    
    REQUIREMENTS:
    - ${langInstruction}
    - Start the response with "${greeting}," followed by a new line. Do NOT mention the name again in the bullet points.
    - Provide exactly 3 bullet points starting with •.
    - Focus strictly on professional strategies to hit the BANK'S KPI. Do NOT mention personal savings, personal life goals, or general motivation.
    - Write the tips in clear, professional language using the "Bank's voice".
    - End with a motivating statement about contributing to the bank's success in the target language.`,
  });
  return response.text;
};

export const getGeneralStaffAdvice = async (staffName: string, performanceSummary: any, lang: AppLanguage) => {
  const firstName = staffName.split(' ')[0];
  const isFemale = isFemaleStaff(staffName);
  
  let genderContext = "";
  if (isFemale) {
    if (lang === 'am') genderContext = "The staff member is female, use appropriate Amharic grammar.";
    if (lang === 'om') genderContext = "The staff member is female, use appropriate Afaan Oromoo grammar.";
  }

  const langInstruction = getLanguageInstruction(lang);
  const titlePrefix = lang === 'om' ? `Kallattii Tarsiimoo ${firstName}:` : lang === 'en' ? `Strategic Direction for ${firstName}:` : `የስትራቴጂክ አቅጣጫ ለ ${firstName}:`;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze staff performance against BANK TARGETS and provide supportive strategic directions.
    Staff: ${staffName}
    ${genderContext}
    Data: ${JSON.stringify(performanceSummary)}
    
    REQUIREMENTS:
    - ${langInstruction}
    - Start with "${titlePrefix}".
    - Focus on professional habits to meet organizational goals.
    - Use energetic industrial command language suitable for a high-performance banking environment.`,
  });
  return response.text;
};

export const getStaffSpecificAdvice = async (staffName: string, entries: DailyEntry[], kpis: KPIConfig[], lang: AppLanguage) => {
  const firstName = staffName.split(' ')[0];
  const isFemale = isFemaleStaff(staffName);
  const genderContext = isFemale ? "The staff member is female." : "";
  const langInstruction = getLanguageInstruction(lang);
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const underperforming = kpis.filter(k => {
    const net = entries.reduce((sum, e) => sum + (e.metrics[k.name] || 0) - (e.metrics[`${k.name} Out`] || 0), 0);
    return k.target > 0 && (net / k.target) < 0.7; // Below 70%
  }).map(k => k.name).join(", ");

  const titlePrefix = lang === 'om' ? `Qajeelfama Leenjisuu Tarsiimoo ${firstName}:` : lang === 'en' ? `Strategic Coaching Directive for ${firstName}:` : `ለአሰልጣኞች ስትራቴጂክ መመሪያ ለ ${firstName}:`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `You are advising a Branch Manager or CSM. Analyze the performance data for ${staffName}. ${genderContext}
    
    KPI Data: ${JSON.stringify(kpis)}
    Performance Logs: ${JSON.stringify(entries.slice(0, 20))}
    Underperforming Areas: ${underperforming || "None (All on track)"}

    REQUIREMENTS:
    - ${langInstruction}
    - Start with "${titlePrefix}".
    - Identify the specific KPIs where they are falling behind the Bank's target.
    - Provide 3 SPECIFIC, ACTIONABLE coaching steps the MANAGER should take with this staff member. 
       - Example: "Schedule a roleplay session for product X", "Review customer call logs for Y", "Assign a mentor for Z".
    - Do not just tell the staff to work harder; tell the Manager *how* to coach them.
    - Write in professional language.`,
  });
  return response.text;
};

export const getAIPerformanceAnalysis = async (entries: DailyEntry[], kpis: KPIConfig[], isCSM: boolean = false, lang: AppLanguage) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const dataString = JSON.stringify({ entries, kpis });
  const langInstruction = getLanguageInstruction(lang);
  
  const instruction = isCSM 
    ? `Analyze domain performance for CSM team. Provide a high-level STRATEGIC SYNC. Focus on team mobilization.`
    : `Analyze aggregate branch performance. Provide a high-level strategic overview for the Manager on team efficiency. Use industrial command language and emojis.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `${instruction} 
    Data: ${dataString}
    REQUIREMENTS:
    - ${langInstruction}`,
  });
  return response.text;
};

export const generateAdviceAudio = async (text: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const cleanText = text.replace(/\[.*?\]\(.*?\)/g, ''); // Remove markdown links for TTS
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Professional coach: ${cleanText}` }] }],
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

export const getAIFocusAlertTips = async (staffName: string, stagedMetrics: { [kpiName: string]: number }, kpis: KPIConfig[], lang: AppLanguage) => {
  const firstName = staffName.split(' ')[0];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const langInstruction = getLanguageInstruction(lang);

  const titlePrefix = lang === 'om' ? `Jijjiirraa odeeffannoo milkaa'eera, ${firstName}!` : lang === 'en' ? `Data transmission successful, ${firstName}!` : `የመረጃ ልውውጥ ተሳክቷል፣ ${firstName}!`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Immediate sync confirmation for ${staffName}.
    Transmission: ${JSON.stringify(stagedMetrics)}
    
    REQUIREMENTS:
    - ${langInstruction}
    - Start with "${titlePrefix}".
    - Exactly 2 high-impact bullet points regarding consistency.`,
  });
  return response.text;
};
