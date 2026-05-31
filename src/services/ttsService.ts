export class TTSService {
  static async speakText(text: string): Promise<Buffer> {
    try {
      // Try Coqui TTS API first
      const response = await fetch('http://localhost:5002/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          speaker_id: 'tts_models/en/ljspeech/tacotron2-DDC_ph', // Default English model
        }),
      });

      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        return Buffer.from(audioBuffer);
      }

      throw new Error('Coqui TTS API not available');
    } catch (error) {
      console.warn('Coqui TTS failed, using Web Speech API fallback:', error);
      throw error; // Let the client handle Web Speech API fallback
    }
  }

  static async generateSpeechFile(text: string, outputPath: string): Promise<void> {
    try {
      const audioBuffer = await this.speakText(text);
      await require('fs').promises.writeFile(outputPath, audioBuffer);
    } catch (error) {
      console.error('Failed to generate speech file:', error);
      throw error;
    }
  }
}
