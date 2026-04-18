import { useState, useCallback, useRef } from "react";
import axiosInstance from "../api/axiosInstance";

// ─────────────────────────────────────────────────────────────────────────────
// useInterview.js
//
// Interview session state machine.
//
// What's a "state machine" here?
// Think of the interview as having exactly 5 states. You can only move forward:
//
//   IDLE  →  STARTING  →  IN_PROGRESS  →  EVALUATING  →  COMPLETED
//              (or)
//                        IN_PROGRESS  →  ERROR
//
// Why a state machine instead of a bunch of booleans?
//   With booleans you end up with: isStarting, isLoading, isEvaluating, isDone
//   These can contradict each other (isLoading AND isDone = true, which is wrong).
//   A single `status` string is mutually exclusive by design — you can't be in
//   two states at once. This is the same finite automaton concept from TOC.
//
// Data flow:
//   1. startSession(topic, subject) → POST /api/session/start → get sessionId + firstQuestion
//   2. submitAnswer(answer)         → POST /api/session/answer → get nextQuestion OR evaluation
//   3. If response has type:"evaluation" → move to COMPLETED, store feedback
//   4. endSession()                 → POST /api/session/end (marks session completed in DB)
//
// Conversation history is kept locally as an array — exactly like a queue.
// This mirrors how it's sent to the backend (backend also maintains history per session).
// ─────────────────────────────────────────────────────────────────────────────

// ── State machine constants ──
// Using a frozen object as an enum — prevents accidental mutation
export const SESSION_STATUS = Object.freeze({
  IDLE: "idle",
  STARTING: "starting",
  IN_PROGRESS: "in_progress",
  EVALUATING: "evaluating",
  COMPLETED: "completed",
  ERROR: "error",
});

const useInterview = () => {
  // ─── CORE STATE ───────────────────────────────────────────────────────────
  const [status, setStatus] = useState(SESSION_STATUS.IDLE);
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [questionNumber, setQuestionNumber] = useState(0);
  const [evaluation, setEvaluation] = useState(null);   // the final feedback JSON
  const [error, setError] = useState(null);
  const [isAnswerLoading, setIsAnswerLoading] = useState(false);

  // ─── CONVERSATION HISTORY ─────────────────────────────────────────────────
  // Stores every Q&A exchange in this session for the UI to display
  // Structure: [{ role: "ai" | "user", text: string, timestamp: Date }]
  const [conversationHistory, setConversationHistory] = useState([]);

  // ─── SESSION METADATA ─────────────────────────────────────────────────────
  const [sessionTopic, setSessionTopic] = useState("");
  const [sessionSubject, setSessionSubject] = useState("");
  const [startTime, setStartTime] = useState(null);

  // ─── REF ──────────────────────────────────────────────────────────────────
  // We use a ref for sessionId inside async callbacks to avoid stale closure issues.
  // If we only used state, the submitted answer callback might read an old sessionId.
  const sessionIdRef = useRef(null);

  // ─── HELPER: ADD TO CONVERSATION ─────────────────────────────────────────
  const addToHistory = useCallback((role, text) => {
    setConversationHistory((prev) => [
      ...prev,
      { role, text, timestamp: new Date() },
    ]);
  }, []);

  // ─── ACTION: START SESSION ────────────────────────────────────────────────
  // Called when user clicks "Start Interview" on TopicSelectPage
  // topic: "Linked Lists" | "OS - Processes" | etc.
  // subject: "DSA" | "OS" | "DBMS" | "CN" | "OOP" | "HR"
  const startSession = useCallback(
    async (topic, subject) => {
      // Guard: don't start if already in a session
      if (status !== SESSION_STATUS.IDLE && status !== SESSION_STATUS.ERROR) {
        return;
      }

      setStatus(SESSION_STATUS.STARTING);
      setError(null);
      setConversationHistory([]);
      setQuestionNumber(0);
      setEvaluation(null);

      try {
        const res = await axiosInstance.post("/session/start", {
          topic,
          subject,
          sessionType: "topic", // could be "full-mock" or "hr" in Phase 2
        });

        const { sessionId: id, question: firstQuestion } = res.data;

        // Persist IDs
        setSessionId(id);
        sessionIdRef.current = id;

        // Store session metadata
        setSessionTopic(topic);
        setSessionSubject(subject);
        setStartTime(new Date());

        // Set the first question and move to active state
        setCurrentQuestion(firstQuestion);
        setQuestionNumber(1);

        // Add to conversation history so UI can display it
        addToHistory("ai", firstQuestion);

        setStatus(SESSION_STATUS.IN_PROGRESS);

        return firstQuestion; // caller (InterviewPage) needs this to trigger TTS
      } catch (err) {
        const message =
          err.response?.data?.message ||
          "Failed to start session. Check your API key in Settings.";
        setError(message);
        setStatus(SESSION_STATUS.ERROR);
        throw err;
      }
    },
    [status, addToHistory]
  );

  // ─── ACTION: SUBMIT ANSWER ────────────────────────────────────────────────
  // Called when user submits their spoken or typed answer
  // answer: string — the user's response to the current question
  //
  // The backend will respond with ONE of two shapes:
  //   { type: "question", question: "..." }   → next interview question
  //   { type: "evaluation", scores: [...], overall: n, improve: [...] }  → done
  //
  // This is the "type field detection" pattern described in the Master Build Doc.
  const submitAnswer = useCallback(
    async (answer) => {
      if (status !== SESSION_STATUS.IN_PROGRESS) return;
      if (!answer.trim()) return;
      if (isAnswerLoading) return;

      setIsAnswerLoading(true);

      // Immediately add user's answer to local history
      addToHistory("user", answer);

      try {
        const res = await axiosInstance.post("/session/answer", {
          sessionId: sessionIdRef.current,
          questionText: currentQuestion,
          userAnswer: answer,
        });

        const data = res.data;

        if (data.type === "evaluation") {
          // ── Interview complete ──
          // The AI has evaluated all answers and returned structured feedback
          setStatus(SESSION_STATUS.EVALUATING);

          // Store evaluation for FeedbackPage
          setEvaluation(data.data);

          // Also add a closing message to chat history
          addToHistory(
            "ai",
            "Great job! I've completed your evaluation. Let me show you your results."
          );

          // Notify the backend to mark session as completed and update progress
          // We do this in the background — no need to await it before showing feedback
          axiosInstance
            .post("/session/end", {
              sessionId: sessionIdRef.current,
              evaluation: data.data, // send the evaluation data back to backend for progress tracking
            })
            .catch((e) =>
              console.error("Session end failed (non-critical):", e)
            );

          setStatus(SESSION_STATUS.COMPLETED);
          return { type: "evaluation", evaluation: data.data };
        } else {
          // ── Next question ──
          const nextQuestion = data.content;
          setCurrentQuestion(nextQuestion);
          setQuestionNumber((n) => n + 1);
          addToHistory("ai", nextQuestion);

          return { type: "question", question: nextQuestion };
        }
      } catch (err) {
        const message =
          err.response?.data?.message ||
          "Failed to submit answer. Please try again.";
        setError(message);
        // Don't change status to ERROR here — let user retry
        // Just remove the last message we added optimistically
        setConversationHistory((prev) => prev.slice(0, -1));
        throw err;
      } finally {
        setIsAnswerLoading(false);
      }
    },
    [status, isAnswerLoading, currentQuestion, addToHistory]
  );

  // ─── ACTION: ABANDON SESSION ──────────────────────────────────────────────
  // User leaves mid-interview. Mark session as abandoned in DB.
  const abandonSession = useCallback(async () => {
    if (!sessionIdRef.current) return;
    if (
      status !== SESSION_STATUS.IN_PROGRESS &&
      status !== SESSION_STATUS.STARTING
    )
      return;

    try {
      await axiosInstance.post("/session/end", {
        sessionId: sessionIdRef.current,
        abandoned: true,
      });
    } catch (e) {
      // Non-critical — if this fails, the session will stay as "in-progress"
      // The backend can clean these up with a cron job in Phase 2
      console.error("Abandon session error:", e);
    }

    resetSession();
  }, [status]);

  // ─── ACTION: RESET ────────────────────────────────────────────────────────
  // Clear all state to allow starting a new session
  const resetSession = useCallback(() => {
    setStatus(SESSION_STATUS.IDLE);
    setSessionId(null);
    sessionIdRef.current = null;
    setCurrentQuestion("");
    setQuestionNumber(0);
    setEvaluation(null);
    setError(null);
    setConversationHistory([]);
    setSessionTopic("");
    setSessionSubject("");
    setStartTime(null);
    setIsAnswerLoading(false);
  }, []);

  // ─── DERIVED STATE ────────────────────────────────────────────────────────
  // Compute values from state rather than storing them separately
  const isSessionActive =
    status === SESSION_STATUS.IN_PROGRESS ||
    status === SESSION_STATUS.STARTING;

  const sessionDurationSeconds = startTime
    ? Math.floor((new Date() - startTime) / 1000)
    : 0;

  // ─── EXPOSED INTERFACE ────────────────────────────────────────────────────
  return {
    // State
    status,               // SESSION_STATUS enum value
    sessionId,            // string | null
    currentQuestion,      // string — current AI question
    questionNumber,       // number — which question we're on (1-indexed)
    evaluation,           // object | null — final feedback from AI
    error,                // string | null
    isAnswerLoading,      // boolean — waiting for backend response
    conversationHistory,  // [{role, text, timestamp}]
    sessionTopic,         // string
    sessionSubject,       // string
    isSessionActive,      // boolean — quick check if interview is live
    sessionDurationSeconds,

    // Actions
    startSession,    // async (topic, subject) → firstQuestion
    submitAnswer,    // async (answer) → { type, question|evaluation }
    abandonSession,  // async () → void
    resetSession,    // () → void
  };
};

export default useInterview;