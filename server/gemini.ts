import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';

export const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Transcribes audio using model 'gemini-3.5-transcribe'
 */
export async function transcribeAudio(audioBase64: string, mimeType: string = 'audio/webm'): Promise<string> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment.');
  }

  const audioPart = {
    inlineData: {
      mimeType: mimeType,
      data: audioBase64,
    },
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-transcribe',
    contents: {
      parts: [
        audioPart,
        {
          text: 'You are an accurate live meeting speech-to-text transcriber. Transcribe the spoken audio verbatim in real time with punctuation. Do not add conversational fluff or commentary.',
        },
      ],
    },
  });

  return response.text?.trim() || '';
}

/**
 * Summarizes meeting transcript and extracts actionable items using gemini-3.8-flash
 */
export async function generateMeetingSummary(meetingTranscript: string): Promise<{
  summary: string;
  actionItems: string[];
  keyPoints: string[];
}> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment.');
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: `Please review the following meeting transcript / notes and produce an executive summary, key takeaways, and action items:\n\n${meetingTranscript}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: {
            type: Type.STRING,
            description: 'A 2-3 paragraph professional executive summary of the meeting.',
          },
          keyPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Major discussions, decisions, and topics covered.',
          },
          actionItems: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Assigned tasks, next steps, and deliverables.',
          },
        },
        required: ['summary', 'keyPoints', 'actionItems'],
      },
    },
  });

  try {
    const parsed = JSON.parse(response.text || '{}');
    return {
      summary: parsed.summary || 'Summary unavailable.',
      keyPoints: parsed.keyPoints || [],
      actionItems: parsed.actionItems || [],
    };
  } catch (err) {
    return {
      summary: response.text || 'Summary generation completed.',
      keyPoints: [],
      actionItems: [],
    };
  }
}
