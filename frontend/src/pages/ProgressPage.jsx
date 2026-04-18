import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Calendar,
  Layers,
  AlertTriangle,
  ChevronRight,
  Loader2,
  BarChart2,
  Flame,
  Trophy,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import axiosInstance from "../api/axiosInstance";
import PageWrapper from "../components/layout/PageWrapper";

// Register Chart.js components we'll use
// We only register what we need (tree-shaking compatible)
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler
);

// ─────────────────────────────────────────────────────────────────────────────
// ProgressPage.jsx
//
// Detailed progress analytics for the user's interview performance.
//
// Data sources:
//   GET /api/progress/dashboard → { topicsProgress[], streak, totalSessions }
//   GET /api/progress/weakareas → { weakTopics[] }
//
// Both are fetched in parallel (Promise.all) for efficiency.
//
// What's displayed:
//   1. Summary stats bar (total sessions, streak, avg score)
//   2. Bar chart — avg score per topic (all attempted topics)
//   3. Weak areas alert (topics with avg < 5)
//   4. Per-subject breakdown cards (DSA, OS, DBMS, CN, OOP, HR)
//      - Each shows attempted topics with score badges
//      - Score trend arrow (up/down/flat based on scoreHistory)
//      - Last practiced date
//      - Confidence level badge
//      - "Practice" button links to TopicSelectPage
//
// Chart.js is configured with the dark theme to match the app.
// We pass options inline rather than a theme plugin for simplicity.
// ─────────────────────────────────────────────────────────────────────────────

// ── Subject grouping config ──
// Used to organise topics_progress data into subject-level cards
const SUBJECTS = ["DSA", "OS", "DBMS", "CN", "OOP", "HR"];

const SUBJECT_COLORS = {
  DSA: "indigo",
  OS: "emerald",
  DBMS: "violet",
  CN: "sky",
  OOP: "amber",
  HR: "pink",
};

// Tailwind color map (needed because Tailwind doesn't support dynamic class generation)
const COLOR_CLASSES = {
  indigo: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/30", dot: "bg-indigo-400" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/30", dot: "bg-violet-400" },
  sky: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/30", dot: "bg-sky-400" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-400" },
  pink: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/30", dot: "bg-pink-400" },
};

// ── Score badge ──
const ScoreBadge = ({ score }) => {
  if (score === null || score === undefined || score === 0)
    return <span className="text-xs text-slate-600">No sessions yet</span>;

  const color =
    score >= 8 ? "text-emerald-400" :
    score >= 6 ? "text-indigo-400" :
    score >= 4 ? "text-amber-400" :
    "text-red-400";

  return <span className={`text-sm font-semibold ${color}`}>{score.toFixed(1)}<span className="text-slate-600 text-xs">/10</span></span>;
};

// ── Score trend arrow ──
// Compares last 2 scores in scoreHistory
const TrendArrow = ({ scoreHistory = [] }) => {
  if (scoreHistory.length < 2) return <Minus size={14} className="text-slate-600" />;

  const last = scoreHistory[scoreHistory.length - 1]?.score;
  const prev = scoreHistory[scoreHistory.length - 2]?.score;
  const diff = last - prev;

  if (diff > 0.5) return <TrendingUp size={14} className="text-emerald-400" />;
  if (diff < -0.5) return <TrendingDown size={14} className="text-red-400" />;
  return <Minus size={14} className="text-slate-500" />;
};

// ── Confidence level badge ──
const ConfidenceBadge = ({ level }) => {
  const map = {
    "not-started": { label: "Not Started", classes: "text-slate-500 bg-slate-800" },
    beginner: { label: "Beginner", classes: "text-amber-400 bg-amber-500/10" },
    intermediate: { label: "Intermediate", classes: "text-indigo-400 bg-indigo-500/10" },
    strong: { label: "Strong", classes: "text-emerald-400 bg-emerald-500/10" },
  };
  const config = map[level] || map["not-started"];

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.classes}`}>
      {config.label}
    </span>
  );
};

// ── Topic row inside a subject card ──
const TopicRow = ({ topic, onPractice }) => {
  const lastDate = topic.lastPracticed
    ? new Date(topic.lastPracticed).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : null;

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-800 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-slate-200 text-sm truncate">{topic.topic}</span>
          <TrendArrow scoreHistory={topic.scoreHistory} />
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <ConfidenceBadge level={topic.confidenceLevel} />
          {lastDate && (
            <span className="text-xs text-slate-600 flex items-center gap-1">
              <Calendar size={10} />
              {lastDate}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 ml-3">
        <ScoreBadge score={topic.averageScore} />
        <button
          onClick={() => onPractice(topic)}
          className="text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
        >
          Practice <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
};

// ── Subject card ──
const SubjectCard = ({ subject, topics, onPractice }) => {
  const [expanded, setExpanded] = useState(true);
  const colorKey = SUBJECT_COLORS[subject] || "indigo";
  const colors = COLOR_CLASSES[colorKey];

  // Topics that have been practiced at least once
  const practiced = topics.filter((t) => t.totalSessionsCompleted > 0);
  const avgScore = practiced.length
    ? practiced.reduce((s, t) => s + t.averageScore, 0) / practiced.length
    : 0;

  return (
    <div className={`rounded-xl border ${colors.border} overflow-hidden`}>
      {/* Subject header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 ${colors.bg} hover:brightness-110 transition-all`}
      >
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
          <span className={`font-semibold text-sm ${colors.text}`}>{subject}</span>
          <span className="text-xs text-slate-500">
            {practiced.length}/{topics.length} topics
          </span>
        </div>
        <div className="flex items-center gap-3">
          {avgScore > 0 && <ScoreBadge score={avgScore} />}
          <ChevronRight
            size={14}
            className={`text-slate-500 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        </div>
      </button>

      {/* Topic list */}
      {expanded && (
        <div className="px-4 bg-slate-900/50">
          {topics.length === 0 ? (
            <p className="text-xs text-slate-600 py-4 text-center">
              No topics tracked yet. Start an interview!
            </p>
          ) : (
            topics.map((t) => (
              <TopicRow key={t.topic} topic={t} onPractice={onPractice} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ProgressPage = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [weakAreas, setWeakAreas] = useState([]);

  // ── Fetch progress data ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch both endpoints in parallel for efficiency
        const [dashRes, weakRes] = await Promise.all([
          axiosInstance.get("/progress/dashboard"),
          axiosInstance.get("/progress/weakareas"),
        ]);

        setDashboardData(dashRes.data);
        setWeakAreas(weakRes.data.weakTopics || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load progress data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ── Practice button handler ──
  const handlePractice = (topic) => {
    navigate("/topics", {
      state: { preselect: { topic: topic.topic, subject: topic.subject } },
    });
  };

  // ── Group topics by subject ──
  const topicsBySubject = SUBJECTS.reduce((acc, subj) => {
    acc[subj] = (dashboardData?.topicsProgress || []).filter(
      (t) => t.subject === subj
    );
    return acc;
  }, {});

  // ── Build Bar chart data ──
  // Only include topics that have at least 1 session
  const practicedTopics = (dashboardData?.topicsProgress || []).filter(
    (t) => t.totalSessionsCompleted > 0
  );

  const barChartData = {
    labels: practicedTopics.map((t) =>
      t.topic.length > 14 ? t.topic.slice(0, 14) + "…" : t.topic
    ),
    datasets: [
      {
        label: "Avg Score",
        data: practicedTopics.map((t) => parseFloat(t.averageScore.toFixed(1))),
        backgroundColor: practicedTopics.map((t) => {
          const s = t.averageScore;
          if (s >= 8) return "rgba(52, 211, 153, 0.7)";  // emerald
          if (s >= 6) return "rgba(99, 102, 241, 0.7)";   // indigo
          if (s >= 4) return "rgba(251, 191, 36, 0.7)";   // amber
          return "rgba(248, 113, 113, 0.7)";               // red
        }),
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1e293b",
        titleColor: "#94a3b8",
        bodyColor: "#e2e8f0",
        borderColor: "#334155",
        borderWidth: 1,
        callbacks: {
          label: (ctx) => ` Score: ${ctx.parsed.y}/10`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(51, 65, 85, 0.4)" },
        ticks: { color: "#64748b", font: { size: 11 } },
      },
      y: {
        min: 0,
        max: 10,
        grid: { color: "rgba(51, 65, 85, 0.4)" },
        ticks: {
          color: "#64748b",
          font: { size: 11 },
          stepSize: 2,
        },
      },
    },
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center min-h-[60vh] gap-3 text-slate-400">
          <Loader2 size={20} className="animate-spin text-indigo-400" />
          <span>Loading your progress…</span>
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <div className="max-w-xl mx-auto px-4 py-8 text-center">
          <AlertTriangle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-slate-300 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-indigo-400 hover:text-indigo-300"
          >
            Try again
          </button>
        </div>
      </PageWrapper>
    );
  }

  const { streak = 0, totalSessions = 0 } = dashboardData || {};
  const overallAvg = practicedTopics.length
    ? (practicedTopics.reduce((s, t) => s + t.averageScore, 0) / practicedTopics.length).toFixed(1)
    : 0;

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">

        {/* ── Page Header ── */}
        <div>
          <h1 className="text-2xl font-bold text-white">Your Progress</h1>
          <p className="text-slate-400 text-sm mt-1">
            Track your performance across all interview topics
          </p>
        </div>

        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <BarChart2 size={14} className="text-indigo-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider">Sessions</span>
            </div>
            <p className="text-2xl font-bold text-white">{totalSessions}</p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Flame size={14} className="text-amber-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider">Streak</span>
            </div>
            <p className="text-2xl font-bold text-amber-400">{streak}
              <span className="text-slate-500 text-sm font-normal"> days</span>
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Trophy size={14} className="text-emerald-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider">Avg Score</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{overallAvg}
              <span className="text-slate-500 text-sm font-normal">/10</span>
            </p>
          </div>
        </div>

        {/* ── Weak Areas Alert ── */}
        {weakAreas.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-amber-300">Focus Needed</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {weakAreas.map((t) => (
                <button
                  key={t.topic}
                  onClick={() => handlePractice(t)}
                  className="text-xs px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-full hover:bg-amber-500/20 transition-colors flex items-center gap-1.5"
                >
                  {t.topic}
                  <span className="text-amber-500">·</span>
                  {t.averageScore.toFixed(1)}
                  <ChevronRight size={11} />
                </button>
              ))}
            </div>
            <p className="text-xs text-amber-400/60 mt-2">
              These topics have an avg score below 5. Click to practice them.
            </p>
          </div>
        )}

        {/* ── Bar Chart: Score by Topic ── */}
        {practicedTopics.length > 0 ? (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Layers size={16} className="text-indigo-400" />
              <h2 className="text-sm font-semibold text-slate-200">
                Average Score by Topic
              </h2>
            </div>
            <div style={{ height: Math.max(180, practicedTopics.length * 28) }}>
              <Bar data={barChartData} options={barChartOptions} />
            </div>
            {/* Score legend */}
            <div className="flex items-center justify-end gap-4 mt-3 flex-wrap">
              {[
                { color: "bg-emerald-400", label: "Excellent (8-10)" },
                { color: "bg-indigo-400", label: "Good (6-7)" },
                { color: "bg-amber-400", label: "Average (4-5)" },
                { color: "bg-red-400", label: "Needs Work (<4)" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-sm ${color} opacity-70`} />
                  <span className="text-xs text-slate-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-8 text-center">
            <Target size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">No sessions yet</p>
            <p className="text-slate-600 text-xs mt-1">
              Complete an interview to see your progress chart here
            </p>
            <button
              onClick={() => navigate("/topics")}
              className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mx-auto"
            >
              Start your first interview <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* ── Per-Subject Cards ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
              By Subject
            </h2>
          </div>
          <div className="space-y-3">
            {SUBJECTS.map((subject) => (
              <SubjectCard
                key={subject}
                subject={subject}
                topics={topicsBySubject[subject]}
                onPractice={handlePractice}
              />
            ))}
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <div className="pb-4 text-center">
          <button
            onClick={() => navigate("/topics")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors"
          >
            Practice a Topic
            <ChevronRight size={16} />
          </button>
        </div>

      </div>
    </PageWrapper>
  );
};

export default ProgressPage;