# Voice Controller Setup

The Hospital OS includes voice input and output capabilities for hands-free operation.

## Features

- **Voice Input**: Record audio and transcribe it using local Whisper models
- **Voice Output**: Text-to-speech using Web Speech API or local Coqui TTS
- **Visual Feedback**: Pulsing animations for listening/speaking states

## Setup Instructions

### 1. Whisper for Speech-to-Text

Choose one of the following options:

#### Option A: Whisper CLI (Recommended)
```bash
# Install Whisper
pip install openai-whisper

# Test transcription
whisper audio.webm --model base --output_format txt
```

#### Option B: Local Whisper API Server
```bash
# Install dependencies
pip install fastapi uvicorn openai-whisper

# Run the server (create a separate Python script)
# The transcription service will automatically try localhost:8000
```

#### Option C: Coqui TTS Compatible Server
If you have a Coqui TTS server running on port 5002, it will be used automatically.

### 2. Coqui TTS for Text-to-Speech (Optional)

If Web Speech API is insufficient, you can use local Coqui TTS:

```bash
# Install Coqui TTS
pip install coqui-tts

# Start TTS server on port 5002
tts-server --model_name tts_models/en/ljspeech/tacotron2-DDC_ph --port 5002
```

### 3. Browser Permissions

The voice controller requires microphone access. Users will be prompted to allow microphone access when first using voice input.

## Usage

1. Click the microphone button in the AI chat window
2. Speak your question clearly
3. The system will transcribe your speech and send it to the AI
4. The AI response will be spoken back using text-to-speech

## Fallback Behavior

- If Whisper is not available, transcription will fail gracefully
- If Coqui TTS is not available, Web Speech API will be used
- Voice features are optional - text input/output always works

## Troubleshooting

- **Microphone not working**: Check browser permissions
- **Transcription fails**: Ensure Whisper is installed and accessible
- **TTS not working**: Check if Coqui TTS server is running on port 5002
- **Audio quality issues**: Speak clearly and ensure good microphone quality