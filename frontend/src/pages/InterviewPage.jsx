import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  ChevronLeft,
  Loader2,
  AlertCircle,
  MessageSquare,
  Clock,
  Brain,
} from "lucide-react";
import useInterview, { SESSION_STATUS } from "../hooks/useInterview";
import useSpeech from "../hooks/useSpeech";
import PageWrapper from "../components/layout/PageWrapper";

// ─────────────────────────────────────────────────────────────────────────────
// InterviewPage.jsx
//
// The "interview room" — the core experience of the entire app.
//
// Page layout:
//   ┌─────────────────────────────────────────────────────┐
//   │  Navbar (topic name + question counter + timer)     │
//   ├─────────────────────────────────────────────────────┤
//   │  Conversation panel (scrollable chat-style feed)    │
//   │    AI question bubble                               │
//   │    User answer bubble                               │
//   │    ... more exchanges ...                           │
//   │    [current AI question with typing indicator]      │
//   ├─────────────────────────────────────────────────────┤
//   │  Input area                                         │
//   │    [mic button] [text input] [send button]          │
//   │    [live transcript display]                        │
//   └─────────────────────────────────────────────────────┘
//
// How mic and text input coexist:
//   - If STT is supported: mic button is primary. User clicks mic, speaks, clicks again.
//   - Text input is always available as fallback (or for users who prefer typing).
//   - If user types manually while mic is on, we stop the mic automatically.
//   - Live transcript from mic fills the text area in real-time.
//
// Data flow for one Q&A cycle:
//   1. AI question arrives (from startSession or submitAnswer response)
//   2. speak(question) — TTS reads it aloud (if enabled)
//   3. User clicks mic (or types) → transcript fills input
//   4. User clicks Send → submitAnswer(answer)
//   5. While awaiting response: show loading skeleton on AI side
//   6. Response arrives → if question: show next Q, speak it
//                       → if evaluation: navigate to /feedback with state
// ─────────────────────────────────────────────────────────────────────────────

// ── Live timer component ──
// Extracted because it has its own setInterval — isolating it prevents
// the entire InterviewPage from re-rendering every second
const SessionTimer = ({ startTime }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");

  return (
    <span className="flex items-center gap-1 text-sm text-slate-400 font-mono">
      <Clock size={13} />
      {mins}:{secs}
    </span>
  );
};

// ── Chat bubble ──
const ChatBubble = ({ role, text, isLoading }) => {
  const isAI = role === "ai";

  if (isLoading) {
    return (
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-1">
          <Brain size={14} className="text-white" />
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
          <div className="flex gap-1 items-center h-5">
            {/* Typing indicator dots */}
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 mb-4 ${isAI ? "" : "flex-row-reverse"}`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 text-xs font-bold ${
          isAI
            ? "bg-indigo-600 text-white"
            : "bg-slate-600 text-slate-200"
        }`}
      >
        {isAI ? <Brain size={14} /> : "U"}
      </div>

      {/* Bubble */}
      <div
        className={`px-4 py-3 rounded-2xl max-w-[80%] text-sm leading-relaxed ${
          isAI
            ? "bg-slate-800 border border-slate-700 rounded-tl-sm text-slate-100"
            : "bg-indigo-600 rounded-tr-sm text-white"
        }`}
      >
        {text}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const InterviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // location.state carries { topic, subject } passed from TopicSelectPage
  // Fallback to defaults if navigated directly (for dev)
  const { topic = "General", subject = "DSA" } = location.state || {};

  // ── Hooks ──
  const interview = useInterview();
  const speech = useSpeech();

  // ── Local UI state ──
  const [textInput, setTextInput] = useState("");     // manual text input
  const [ttsEnabled, setTtsEnabled] = useState(true); // user can mute AI voice
  const [hasStarted, setHasStarted] = useState(false); // prevent double start

  // ── Refs ──
  const chatEndRef = useRef(null); // for auto-scroll
  const textareaRef = useRef(null);
  const startTimeRef = useRef(null);

  // ── Auto-scroll chat to bottom on new messages ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [interview.conversationHistory, interview.isAnswerLoading]);

  // ── Start the session on mount ──
  useEffect(() => {
    if (hasStarted) return; // strict mode double-effect guard
    setHasStarted(true);
    startTimeRef.current = new Date();

    interview.startSession(topic, subject).then((firstQuestion) => {
      if (firstQuestion && ttsEnabled) {
        speech.speak(firstQuestion);
      }
    });

    // Abandon session if user navigates away without completing
    return () => {
      if (
        interview.status === SESSION_STATUS.IN_PROGRESS ||
        interview.status === SESSION_STATUS.STARTING
      ) {
        interview.abandonSession();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — runs once on mount

  // ── Navigate to feedback when session completes ──
  useEffect(() => {
    if (interview.status === SESSION_STATUS.COMPLETED && interview.evaluation) {
      // Short delay for user to read the closing message
      const t = setTimeout(() => {
        navigate("/feedback", {
          state: {
            evaluation: interview.evaluation,
            sessionId: interview.sessionId,
            topic: interview.sessionTopic,
            subject: interview.sessionSubject,
            conversationHistory: interview.conversationHistory,
          },
        });
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [interview.status, interview.evaluation, navigate, interview]);

  // ── Sync speech transcript → text input ──
  // When mic is active, mirror what user is saying into the text input
  useEffect(() => {
    if (speech.isListening) {
      setTextInput(speech.transcript);
    }
  }, [speech.transcript, speech.isListening]);

  // ── Handle mic toggle ──
  const handleMicToggle = useCallback(() => {
    if (speech.isListening) {
      // Stop listening — the transcript stays in textInput for user to review/edit
      speech.stopListening();
    } else {
      // Start listening — stop TTS first (don't speak over user's mic)
      speech.stopSpeaking();
      setTextInput(""); // clear any previous text
      speech.resetTranscript();
      speech.startListening();
    }
  }, [speech]);

  // ── Handle answer submission ──
  const handleSubmit = useCallback(async () => {
    const answer = textInput.trim() || speech.transcript.trim();
    if (!answer) return;
    if (interview.isAnswerLoading) return;
    if (interview.status !== SESSION_STATUS.IN_PROGRESS) return;

    // Stop mic/speech if active
    if (speech.isListening) speech.stopListening();
    if (speech.isSpeaking) speech.stopSpeaking();
    speech.resetTranscript();

    setTextInput(""); // clear input immediately (optimistic UI)

    try {
      const result = await interview.submitAnswer(answer);

      // If we got a next question back, read it aloud
      if (result?.type === "question" && ttsEnabled) {
        speech.speak(result.question);
      }
    } catch {
      // Error is already set in interview hook — UI will show it
    }
  }, [textInput, speech, interview, ttsEnabled]);

  // ── Handle Enter key in textarea (Ctrl+Enter = submit) ──
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // ── Handle manual typing (stop mic if user starts typing) ──
  const handleTextChange = (e) => {
    if (speech.isListening) {
      speech.stopListening();
    }
    setTextInput(e.target.value);
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  const isLoading =
    interview.status === SESSION_STATUS.STARTING || interview.isAnswerLoading;
  const isCompleting = interview.status === SESSION_STATUS.EVALUATING ||
    interview.status === SESSION_STATUS.COMPLETED;

  return (
    <PageWrapper>
      <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto">

        {/* ── Session Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/topics")}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Leave interview"
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="font-semibold text-white text-sm">{topic}</h1>
              <p className="text-xs text-slate-400">{subject} Interview</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Question counter */}
            <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
              Q{interview.questionNumber}
              <span className="text-slate-600">/8-10</span>
            </span>

            {/* Timer */}
            {startTimeRef.current && (
              <SessionTimer startTime={startTimeRef.current} />
            )}

            {/* TTS toggle */}
            <button
              onClick={() => {
                setTtsEnabled((v) => !v);
                if (speech.isSpeaking) speech.stopSpeaking();
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                ttsEnabled
                  ? "text-indigo-400 hover:bg-indigo-500/10"
                  : "text-slate-600 hover:text-slate-400 hover:bg-slate-800"
              }`}
              title={ttsEnabled ? "Mute AI voice" : "Enable AI voice"}
            >
              {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </div>

        {/* ── Chat Area ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">

          {/* Starting state */}
          {interview.status === SESSION_STATUS.STARTING && (
            <div className="flex items-center justify-center h-32 gap-3 text-slate-400">
              <Loader2 size={20} className="animate-spin text-indigo-400" />
              <span className="text-sm">Starting your interview session…</span>
            </div>
          )}

          {/* Error state */}
          {interview.status === SESSION_STATUS.ERROR && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
              <AlertCircle size={18} className="shrink-0" />
              <div>
                <p className="text-sm font-medium">Failed to start session</p>
                <p className="text-xs mt-0.5 text-red-400/70">{interview.error}</p>
                <button
                  onClick={() => navigate("/settings")}
                  className="text-xs underline mt-1 hover:text-red-300"
                >
                  Check your API key in Settings →
                </button>
              </div>
            </div>
          )}

          {/* Conversation messages */}
          {interview.conversationHistory.map((msg, idx) => (
            <ChatBubble key={idx} role={msg.role} text={msg.text} />
          ))}

          {/* AI typing indicator while waiting for next question */}
          {interview.isAnswerLoading && <ChatBubble role="ai" isLoading />}

          {/* Completing state */}
          {isCompleting && (
            <div className="flex items-center justify-center gap-3 py-6 text-indigo-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Generating your evaluation…</span>
            </div>
          )}

          {/* Auto-scroll anchor */}
          <div ref={chatEndRef} />
        </div>

        {/* ── Input Area ── */}
        {interview.status === SESSION_STATUS.IN_PROGRESS && (
          <div className="border-t border-slate-800 px-4 py-3 space-y-2">

            {/* Live transcript indicator */}
            {speech.isListening && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                {/* Animated recording dot */}
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0" />
                <span className="text-xs text-indigo-300 truncate">
                  {speech.transcript || "Listening… speak your answer"}
                </span>
              </div>
            )}

            {/* Speech error */}
            {speech.error && (
              <div className="flex items-center gap-2 text-xs text-amber-400 px-1">
                <AlertCircle size={13} />
                <span>{speech.error} — use the text box below instead.</span>
              </div>
            )}

            {/* Main input row */}
            <div className="flex items-end gap-2">

              {/* Mic button — only show if STT is supported */}
              {speech.isSTTSupported && (
                <button
                  onClick={handleMicToggle}
                  disabled={isLoading}
                  className={`p-3 rounded-xl transition-all shrink-0 ${
                    speech.isListening
                      ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 animate-pulse"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                  title={speech.isListening ? "Stop recording" : "Start recording"}
                >
                  {speech.isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              )}

              {/* Text fallback / editable transcript */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={textInput}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    speech.isSTTSupported
                      ? "Or type your answer here… (Ctrl+Enter to send)"
                      : "Type your answer here… (Ctrl+Enter to send)"
                  }
                  rows={2}
                  disabled={isLoading}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-40"
                />
              </div>

              {/* Send button */}
              <button
                onClick={handleSubmit}
                disabled={isLoading || (!textInput.trim() && !speech.transcript.trim())}
                className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                title="Submit answer"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>

            {/* Helper text */}
            <p className="text-xs text-slate-600 text-center">
              {speech.isSTTSupported
                ? "Mic button to record • Edit transcript if needed • Send to submit"
                : "Type your answer • Ctrl+Enter to submit"}
            </p>
          </div>
        )}

        {/* ── No speech support notice (only show once at session start) ── */}
        {interview.status === SESSION_STATUS.IN_PROGRESS &&
          !speech.isSTTSupported && (
            <div className="mx-4 mb-2 flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <MessageSquare size={14} className="text-amber-400 shrink-0" />
              <p className="text-xs text-amber-300/70">
                Speech recognition isn&apos;t available in this browser. Use text input.
                Chrome or Edge recommended for full voice experience.
              </p>
            </div>
          )}
      </div>
    </PageWrapper>
  );
};

export default InterviewPage;