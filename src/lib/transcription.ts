import type { LiveCaption, MeetingSummaryResult } from '../types';

export class LiveTranscriptionService {
  private mediaRecorder: MediaRecorder | null = null;
  private isRunning: boolean = false;
  private onCaptionCallback: (caption: LiveCaption) => void;
  private speakerName: string;
  private speakerId: string;
  private stream: MediaStream | null = null;

  constructor(
    speakerName: string,
    speakerId: string,
    onCaption: (caption: LiveCaption) => void
  ) {
    this.speakerName = speakerName;
    this.speakerId = speakerId;
    this.onCaptionCallback = onCaption;
  }

  public updateSpeaker(name: string, id: string) {
    this.speakerName = name;
    this.speakerId = id;
  }

  public start(stream: MediaStream) {
    if (this.isRunning) return;
    this.stream = stream;

    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) {
      console.warn('No audio tracks available for transcription.');
      return;
    }

    try {
      const audioStream = new MediaStream(audioTracks);
      // Determine supported mime type
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
      }

      this.mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
      });

      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data && event.data.size > 2000 && this.isRunning) {
          await this.processAudioChunk(event.data);
        }
      };

      // Record in 4-second intervals for responsive live captioning
      this.mediaRecorder.start(4000);
      this.isRunning = true;
    } catch (err) {
      console.error('Failed to start LiveTranscriptionService:', err);
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (err) {
        // ignore
      }
    }
    this.mediaRecorder = null;
  }

  private async processAudioChunk(blob: Blob) {
    try {
      const base64Audio = await this.blobToBase64(blob);
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64Audio,
          mimeType: blob.type || 'audio/webm',
        }),
      });

      if (!res.ok) {
        throw new Error(`Transcription API responded with ${res.status}`);
      }

      const data = await res.json();
      const text = data.transcript?.trim();

      if (text && text.length > 0) {
        const caption: LiveCaption = {
          id: Math.random().toString(36).substring(2),
          speakerName: this.speakerName,
          speakerId: this.speakerId,
          text,
          timestamp: Date.now(),
          isFinal: true,
        };
        this.onCaptionCallback(caption);
      }
    } catch (err) {
      console.error('Audio chunk transcription error:', err);
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Strip data:audio/webm;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

/**
 * Call server to generate AI meeting summary with gemini-3.8-flash
 */
export async function fetchMeetingSummary(meetingTranscript: string): Promise<MeetingSummaryResult> {
  const res = await fetch('/api/summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript: meetingTranscript }),
  });

  if (!res.ok) {
    throw new Error('Failed to generate meeting summary');
  }

  return await res.json();
}
