import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface VoiceControllerProps {
  onTranscription: (text: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export const VoiceController: React.FC<VoiceControllerProps> = ({
  onTranscription,
  onError,
  disabled = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendAudioForTranscription(audioBlob);

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (error) {
      console.error('Error starting microphone:', error);
      onError('Failed to access microphone. Please check permissions.');
    }
  }, [onError]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const sendAudioForTranscription = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const backendUrl = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${backendUrl}/api/ai/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.transcription) {
        onTranscription(data.transcription);
      } else {
        onError('No transcription received');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      onError('Failed to transcribe audio');
    }
  };

  const speakResponse = useCallback((text: string) => {
    if (!speechSynthesisRef.current) {
      speechSynthesisRef.current = window.speechSynthesis;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      onError('Speech synthesis failed');
    };

    speechSynthesisRef.current.speak(utterance);
  }, [onError]);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const stopSpeaking = () => {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 border-t border-gray-200">
      {/* Microphone Button */}
      <button
        type="button"
        onClick={handleMicClick}
        disabled={disabled || isSpeaking}
        className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 ${
          isListening
            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
            : 'bg-blue-500 hover:bg-blue-600'
        } ${disabled || isSpeaking ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isListening ? (
          <MicOff className="w-6 h-6 text-white" />
        ) : (
          <Mic className="w-6 h-6 text-white" />
        )}
        {isListening && (
          <div className="absolute inset-0 rounded-full border-2 border-red-300 animate-ping" />
        )}
      </button>

      {/* Speaking Button */}
      <button
        type="button"
        onClick={stopSpeaking}
        disabled={!isSpeaking}
        className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 ${
          isSpeaking
            ? 'bg-green-500 hover:bg-green-600 animate-pulse'
            : 'bg-gray-300'
        } ${!isSpeaking ? 'cursor-not-allowed' : ''}`}
      >
        <Volume2 className="w-6 h-6 text-white" />
      </button>

      {/* Status Text */}
      <div className="flex-1 text-sm text-gray-600">
        {isListening && <span className="text-red-600 font-medium">Listening...</span>}
        {isSpeaking && <span className="text-green-600 font-medium">Speaking...</span>}
        {!isListening && !isSpeaking && <span>Click microphone to start voice input</span>}
      </div>
    </div>
  );
};

// Export speak function for external use
export const speakText = (text: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    utterance.onend = () => resolve();
    utterance.onerror = (event) => reject(new Error(`Speech synthesis error: ${event.error}`));

    window.speechSynthesis.speak(utterance);
  });
};
