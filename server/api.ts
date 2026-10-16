import type { IncomingMessage, ServerResponse } from 'http';
import { transcribeAudio, generateMeetingSummary } from './gemini';

function getRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', err => reject(err));
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

export async function handleTranscribeApi(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  try {
    const bodyText = await getRequestBody(req);
    const body = JSON.parse(bodyText || '{}');
    const { audioBase64, mimeType } = body;

    if (!audioBase64) {
      return sendJson(res, 400, { error: 'audioBase64 is required in payload' });
    }

    const transcript = await transcribeAudio(audioBase64, mimeType || 'audio/webm');
    return sendJson(res, 200, { transcript });
  } catch (error: any) {
    console.error('Transcription API error:', error);
    return sendJson(res, 500, { error: error.message || 'Audio transcription failed' });
  }
}

export async function handleSummaryApi(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  try {
    const bodyText = await getRequestBody(req);
    const body = JSON.parse(bodyText || '{}');
    const { transcript } = body;

    if (!transcript) {
      return sendJson(res, 400, { error: 'transcript string is required' });
    }

    const summaryData = await generateMeetingSummary(transcript);
    return sendJson(res, 200, summaryData);
  } catch (error: any) {
    console.error('Summary API error:', error);
    return sendJson(res, 500, { error: error.message || 'Meeting summary failed' });
  }
}
