import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class TranscriptionService {
  private static tempDir = path.join(process.cwd(), 'temp');

  static async initialize() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to create temp directory:', error);
    }
  }

  static async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    let tempFilePath: string | null = null;

    try {
      // Create temporary file
      const tempFileName = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webm`;
      tempFilePath = path.join(this.tempDir, tempFileName);

      // Write audio buffer to temp file
      await fs.writeFile(tempFilePath, audioBuffer);

      // Transcribe using local Whisper
      const transcription = await this.callWhisperAPI(tempFilePath);

      return transcription;
    } catch (error) {
      console.error('Transcription error:', error);
      // Fallback to placeholder
      return "Audio transcription failed. Please try again or use text input.";
    } finally {
      // Clean up temp file
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch (cleanupError) {
          console.warn('Failed to clean up temp file:', cleanupError);
        }
      }
    }
  }

  private static async callWhisperAPI(audioFilePath: string): Promise<string> {
    // Option 1: Use local Whisper CLI (if installed)
    try {
      const { stdout } = await execAsync(
        `whisper "${audioFilePath}" --model base --output_format txt --output_dir "${this.tempDir}" --language en`,
        { timeout: 30000 } // 30 second timeout
      );

      // Extract transcription from output
      const outputLines = stdout.split('\n');
      const transcriptionLine = outputLines.find(line =>
        line.includes('[00:00:00.000 -->') || !line.includes('[')
      );

      if (transcriptionLine) {
        return transcriptionLine.trim();
      }
    } catch (cliError) {
      console.warn('Whisper CLI failed, trying API fallback:', cliError);
    }

    // Option 2: Call local Whisper API server (if running)
    try {
      const response = await fetch('http://localhost:8000/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_file: audioFilePath,
          language: 'en'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.transcription || result.text || 'Transcription completed but no text returned.';
      }
    } catch (apiError) {
      console.warn('Whisper API failed:', apiError);
    }

    // Option 3: Use Coqui TTS compatible transcription endpoint
    try {
      const formData = new FormData();
      const audioBlob = await fs.readFile(audioFilePath);
      formData.append('audio', new Blob([audioBlob]), 'audio.webm');

      const response = await fetch('http://localhost:5002/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        return result.transcription || result.text || 'Transcription completed via Coqui.';
      }
    } catch (coquiError) {
      console.warn('Coqui transcription failed:', coquiError);
    }

    // If all methods fail, return placeholder
    throw new Error('All transcription methods failed');
  }
}

// Initialize temp directory on module load
TranscriptionService.initialize().catch(console.error);
