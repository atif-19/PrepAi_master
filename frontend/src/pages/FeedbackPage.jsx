import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  RotateCcw,
  BarChart2,
  ChevronRight,
  Star,
  Target,
  MessageSquare,
} from "lucide-react";
import PageWrapper from "../components/layout/PageWrapper";

// ─────────────────────────────────────────────────────────────────────────────
// FeedbackPage.jsx
//
// Renders the post-session evaluation after the AI finishes the interview.
//
// Input: evaluation JSON (from location.state, set by InterviewPage navigate call)
// Shape of evaluation from AI:
//   {
//     type: "evaluation",
//     scores: [
//       { question: "...", score: 7, feedback: "..." },
//       ...
//     ],
//     overall: 6.5,
//     improve: ["...", "...", "..."]
//   }
//
// Why receive via location.state instead of fetching from API?
//   We already have the data in memory from the interview session.
//   No need for an extra round-trip. This is the "read from write path" pattern.
//   We also store sessionId in state so user can go to session history later.
//
// Layout:
//   ┌─────────────────────────────────────────┐
//   │  Hero: Overall score + session meta     │
//   ├─────────────────────────────────────────┤
//   │  Per-answer score cards (scrollable)    │
//   │    Q1: score ring + feedback text       │
//   │    Q2: ...                              │
//   ├─────────────────────────────────────────┤
//   │  Improvement areas section              │
//   ├─────────────────────────────────────────┤
//   │  Actions: Try Again | View Progress     │
//   └─────────────────────────────────────────┘
// ─────────────────────────────────────────────────────────────────────────────

// ── Score color classification ──
// Maps a 1-10 score to visual treatment
const getScoreColor = (score) => {
  if (score >= 8) return { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Excellent" };
  if (score >= 6) return { text: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/30", label: "Good" };
  if (score >= 4) return { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", label: "Average" };
  return { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", label: "Needs Work" };
};

// ── Circular score ring using SVG ──
// A clean visual representation of a 1-10 score
const ScoreRing = ({ score, size = 64 }) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  // Map 1-10 to 0-100%, but clamp to valid range
  const percent = Math.min(Math.max((score / 10) * 100, 0), 100);
  const strokeDashoffset = circumference - (percent / 100) * circumference;
  const colors = getScoreColor(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={4}
          className="stroke-slate-700"
        />
        {/* Score arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={`transition-all duration-700 ${
            score >= 8 ? "stroke-emerald-400" :
            score >= 6 ? "stroke-indigo-400" :
            score >= 4 ? "stroke-amber-400" :
            "stroke-red-400"
          }`}
        />
      </svg>
      <span className={`absolute text-sm font-bold ${colors.text}`}>
        {score}
      </span>
    </div>
  );
};

// ── Overall score hero display ──
const OverallScoreHero = ({ overall, topic, subject }) => {
  const colors = getScoreColor(overall);

  return (
    <div className="text-center py-8 px-6">
      {/* Score ring — larger version for the hero */}
      <div className="flex justify-center mb-4">
        <ScoreRing score={overall} size={96} />
      </div>

      <h2 className={`text-3xl font-bold ${colors.text}`}>
        {overall} <span className="text-slate-500 text-xl font-normal">/ 10</span>
      </h2>
      <p className={`text-sm mt-1 ${colors.text} opacity-75`}>{colors.label}</p>

      <div className="mt-3">
        <span className="text-slate-300 font-medium">{topic}</span>
        <span className="text-slate-500 text-sm"> · {subject}</span>
      </div>

      {/* Motivational message based on score */}
      <p className="text-slate-400 text-sm mt-3 max-w-xs mx-auto">
        {overall >= 8
          ? "Outstanding performance! You're interview-ready for this topic. 🎯"
          : overall >= 6
          ? "Solid performance. A bit more practice and you'll nail it. 💪"
          : overall >= 4
          ? "Good attempt. Review the feedback below and practice again. 📖"
          : "Keep going — every interview makes you better. Study and retry! 🚀"}
      </p>
    </div>
  );
};

// ── Individual question score card ──
const QuestionCard = ({ item, index }) => {
  const colors = getScoreColor(item.score);

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4`}>
      <div className="flex items-start gap-3">
        {/* Score ring */}
        <ScoreRing score={item.score} size={48} />

        <div className="flex-1 min-w-0">
          {/* Question header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Q{index + 1}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
              {colors.label}
            </span>
          </div>

          {/* Question text */}
          <p className="text-slate-200 text-sm font-medium leading-relaxed mb-2">
            {item.question}
          </p>

          {/* AI feedback */}
          {item.feedback && (
            <div className="flex items-start gap-2 mt-2 pt-2 border-t border-slate-700/50">
              <MessageSquare size={13} className="text-slate-500 mt-0.5 shrink-0" />
              <p className="text-slate-400 text-xs leading-relaxed">{item.feedback}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const FeedbackPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Receive evaluation data passed from InterviewPage via navigate state
  const {
    evaluation,
    sessionId,
    topic = "Interview",
    subject = "DSA",
    // conversationHistory  // available if needed for future full transcript view
  } = location.state || {};

  // Guard: if no evaluation data, redirect to dashboard
  // This handles direct URL navigation or missing state
  useEffect(() => {
    if (!evaluation) {
      navigate("/dashboard", { replace: true });
    }
  }, [evaluation, navigate]);

  if (!evaluation) return null; // render nothing while redirecting

  const { scores = [], overall = 0, improve = [] } = evaluation;

  // ── Score distribution for quick stats ──
  const avgScore = scores.length
    ? (scores.reduce((sum, s) => sum + s.score, 0) / scores.length).toFixed(1)
    : 0;
  const highScores = scores.filter((s) => s.score >= 7).length;
  const lowScores = scores.filter((s) => s.score < 5).length;

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Session Feedback</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {scores.length} questions answered
            </p>
          </div>
          <CheckCircle2 size={28} className="text-emerald-400" />
        </div>

        {/* ── Overall Score Hero ── */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl mb-6">
          <OverallScoreHero overall={overall} topic={topic} subject={subject} />

          {/* Quick stats row */}
          <div className="grid grid-cols-3 divide-x divide-slate-700 border-t border-slate-700">
            <div className="py-3 text-center">
              <p className="text-sm font-semibold text-slate-200">{avgScore}</p>
              <p className="text-xs text-slate-500 mt-0.5">Avg Score</p>
            </div>
            <div className="py-3 text-center">
              <p className="text-sm font-semibold text-emerald-400">{highScores}</p>
              <p className="text-xs text-slate-500 mt-0.5">Strong (7+)</p>
            </div>
            <div className="py-3 text-center">
              <p className="text-sm font-semibold text-amber-400">{lowScores}</p>
              <p className="text-xs text-slate-500 mt-0.5">Needs Work (&lt;5)</p>
            </div>
          </div>
        </div>

        {/* ── Per-Question Breakdown ── */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Star size={16} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
              Answer Breakdown
            </h2>
          </div>
          <div className="space-y-3">
            {scores.map((item, idx) => (
              <QuestionCard key={idx} item={item} index={idx} />
            ))}
          </div>
        </section>

        {/* ── Improvement Areas ── */}
        {improve.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                Focus Areas
              </h2>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-2">
              {improve.map((area, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-slate-300 text-sm">{area}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Action Buttons ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() =>
              navigate("/topics", { state: { preselect: { topic, subject } } })
            }
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
          >
            <RotateCcw size={16} />
            Practice Again
          </button>

          <button
            onClick={() => navigate("/progress")}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-colors"
          >
            <BarChart2 size={16} />
            View Progress
          </button>
        </div>

        {/* ── Dashboard link ── */}
        <button
          onClick={() => navigate("/dashboard")}
          className="w-full mt-3 flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-slate-300 transition-colors py-2"
        >
          Back to Dashboard
          <ChevronRight size={14} />
        </button>

      </div>
    </PageWrapper>
  );
};

export default FeedbackPage;