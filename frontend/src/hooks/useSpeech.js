import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// useSpeech.js
//
// Wraps the browser's Web Speech API into a clean, React-friendly hook.
// Two responsibilities:
//   1. STT (Speech-to-Text)  → SpeechRecognition  → user speaks → you get text
//   2. TTS (Text-to-Speech)  → SpeechSynthesis     → you give text → browser speaks
//
// Why wrap it in a hook instead of calling the API directly?
//   Because SpeechRecognition fires DOM events (onresult, onerror, onend).
//   If we call it raw inside a component, we'd scatter event listeners everywhere.
//   A hook centralises all that complexity and exposes a clean interface.
//
// Browser compatibility reality check:
//   - Chrome / Edge: Full support (webkit prefix needed for SpeechRecognition)
//   - Firefox: NOT supported (no SpeechRecognition as of 2024)
//   - Safari: Partial support (works on iOS 14.5+, macOS Safari 14.1+)
//   - Solution: We detect support at hook initialisation and expose `isSupported`
//     so the UI can show a text fallback gracefully.
// ─────────────────────────────────────────────────────────────────────────────

const useSpeech = () => {
  // ─── STATE ───────────────────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);       // mic is active?
  const [transcript, setTranscript] = useState("");            // live interim + final text
  const [isSpeaking, setIsSpeaking] = useState(false);         // TTS is speaking?
  const [error, setError] = useState(null);                    // last speech error
  const [isSTTSupported, setIsSTTSupported] = useState(false); // STT available?
  const [isTTSSupported, setIsTTSSupported] = useState(false); // TTS available?

  // ─── REFS ─────────────────────────────────────────────────────────────────
  // Refs hold the actual Web Speech API objects across renders.
  // We don't put them in state because changing them shouldn't trigger re-renders.
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const finalTranscriptRef = useRef(""); // accumulates confirmed words (not interim)

  // ─── INITIALISATION ───────────────────────────────────────────────────────
  // Runs once on mount. Detects support and sets up SpeechRecognition instance.
  useEffect(() => {
    // ── TTS check ──
    // window.speechSynthesis is available on all modern browsers except very old ones
    if ("speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
      setIsTTSSupported(true);
    }

    // ── STT check ──
    // Chrome uses webkit prefix. We try the standard name first, then fallback.
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Firefox / unsupported browser — the UI will show the text input fallback
      setIsSTTSupported(false);
      return;
    }

    setIsSTTSupported(true);

    // Create the recognition instance
    const recognition = new SpeechRecognition();

    // ── Configuration ──
    // continuous: true = keep listening until we call stop() manually
    //             false = stop after one utterance (we want continuous for interview)
    recognition.continuous = true;

    // interimResults: true = fire onresult with partial words as user speaks
    //                 false = only fire when user pauses (less real-time feedback)
    // We want interim so the user sees their words appear live (like Google's STT)
    recognition.interimResults = true;

    // lang: 'en-IN' covers Indian English accent better than 'en-US'
    // But falls back gracefully — if accent mismatch causes errors, user can type
    recognition.lang = "en-IN";

    // ── Event Handlers ──

    // onresult fires repeatedly as user speaks
    // event.results is a SpeechRecognitionResultList (array-like)
    // Each result has one or more alternatives, and an isFinal flag
    recognition.onresult = (event) => {
      let interimText = "";

      // Loop from the last processed result to the end
      // event.resultIndex tells us where new results start
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript; // [0] = highest confidence alternative

        if (result.isFinal) {
          // Final = user paused, this word/phrase is confirmed
          // Append to our accumulated final transcript
          finalTranscriptRef.current += text + " ";
        } else {
          // Interim = still being spoken, might change
          interimText += text;
        }
      }

      // Show final + current interim to user in real-time
      setTranscript(finalTranscriptRef.current + interimText);
    };

    // onerror fires when recognition fails
    recognition.onerror = (event) => {
      // Common errors and their causes:
      // 'no-speech'      → user didn't say anything for a while (normal, ignore)
      // 'audio-capture'  → microphone not accessible (permissions issue)
      // 'not-allowed'    → user denied mic permission
      // 'network'        → Chrome's recognition API needs internet (uses Google servers)
      if (event.error === "no-speech") {
        // This happens often when user pauses — not really an error
        return;
      }

      setError(event.error);
      setIsListening(false);

      // Friendly error messages for the UI
      const errorMessages = {
        "audio-capture": "Microphone not found. Please check your mic.",
        "not-allowed": "Microphone permission denied. Please allow mic access.",
        network: "Speech recognition requires internet. Please check connection.",
        aborted: "Speech recognition was stopped.",
      };

      console.error(
        "Speech recognition error:",
        errorMessages[event.error] || event.error
      );
    };

    // onend fires when recognition stops (either by us calling stop() or timeout)
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    // Cleanup on unmount — make sure we don't leave orphaned listeners
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      // Cancel any ongoing speech synthesis
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // ─── STT: START LISTENING ─────────────────────────────────────────────────
  // Call this when user clicks the mic button
  const startListening = useCallback(() => {
    if (!isSTTSupported || !recognitionRef.current) return;
    if (isListening) return; // already listening

    // Reset transcript for this new answer
    finalTranscriptRef.current = "";
    setTranscript("");
    setError(null);

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      // InvalidStateError can occur if recognition is already running
      console.error("Failed to start recognition:", err);
      setError("Failed to start microphone");
    }
  }, [isListening, isSTTSupported]);

  // ─── STT: STOP LISTENING ──────────────────────────────────────────────────
  // Call this when user clicks mic again (toggle) or clicks "Submit Answer"
  // Returns the final accumulated transcript so the caller can use it
  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return "";

    recognitionRef.current.stop(); // graceful stop (fires onend after processing last words)
    setIsListening(false);

    return finalTranscriptRef.current.trim();
  }, [isListening]);

  // ─── STT: RESET TRANSCRIPT ────────────────────────────────────────────────
  // Clear the transcript (e.g., after submitting an answer)
  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = "";
    setTranscript("");
  }, []);

  // ─── TTS: SPEAK ───────────────────────────────────────────────────────────
  // Call this to have the browser read the AI's question aloud
  // text: string to speak
  // onEnd: optional callback fired when speaking finishes (useful to auto-start STT)
  const speak = useCallback(
    (text, onEnd = null) => {
      if (!isTTSSupported || !synthRef.current) return;

      // Cancel any currently ongoing speech before starting new
      synthRef.current.cancel();

      if (!text || text.trim() === "") return;

      const utterance = new SpeechSynthesisUtterance(text);

      // ── Voice settings ──
      // rate: 0.1 to 10, default 1. Slightly slower for clarity.
      utterance.rate = 0.95;

      // pitch: 0 to 2, default 1. Slightly lower for professional tone.
      utterance.pitch = 0.9;

      // volume: 0 to 1
      utterance.volume = 1;

      // lang: matches our STT language
      utterance.lang = "en-IN";

      // ── Voice selection ──
      // Browsers provide a list of available voices
      // We prefer a natural-sounding English voice if available
      const selectVoice = () => {
        const voices = synthRef.current.getVoices();
        // Preference order: Google voices > other en-IN > en-US > any English
        const preferred = voices.find(
          (v) => v.name.includes("Google") && v.lang.startsWith("en")
        );
        const indian = voices.find((v) => v.lang === "en-IN");
        const american = voices.find((v) => v.lang === "en-US");

        utterance.voice = preferred || indian || american || null;
      };

      // Voices might not be loaded yet (async in some browsers)
      if (synthRef.current.getVoices().length > 0) {
        selectVoice();
      } else {
        // onvoiceschanged fires when the voice list is ready
        synthRef.current.onvoiceschanged = selectVoice;
      }

      // ── Event handlers ──
      utterance.onstart = () => setIsSpeaking(true);

      utterance.onend = () => {
        setIsSpeaking(false);
        if (onEnd) onEnd(); // e.g., caller can auto-start mic after AI finishes speaking
      };

      utterance.onerror = (e) => {
        // 'interrupted' is common when we cancel — not a real error
        if (e.error !== "interrupted") {
          console.error("TTS error:", e.error);
        }
        setIsSpeaking(false);
      };

      synthRef.current.speak(utterance);
    },
    [isTTSSupported]
  );

  // ─── TTS: STOP SPEAKING ───────────────────────────────────────────────────
  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // ─── EXPOSED INTERFACE ────────────────────────────────────────────────────
  return {
    // STT
    isListening,       // boolean — is mic active?
    transcript,        // string  — live text as user speaks
    startListening,    // fn()    — start mic
    stopListening,     // fn()    — stop mic, returns final transcript
    resetTranscript,   // fn()    — clear transcript after submit

    // TTS
    isSpeaking,        // boolean — is AI speaking?
    speak,             // fn(text, onEnd?) — speak text aloud
    stopSpeaking,      // fn()    — interrupt speech

    // Support flags
    isSTTSupported,    // boolean — show mic button OR text input
    isTTSSupported,    // boolean — show speaker toggle in UI

    // Error state
    error,             // string | null — last error message
  };
};

export default useSpeech;