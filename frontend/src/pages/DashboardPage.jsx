import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  Flame, BookOpen, AlertTriangle,
  TrendingUp, Play, Loader2, RefreshCw
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import axiosInstance from '../api/axiosInstance';

// Register Chart.js modules — required in v3+
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// ─── Constants ────────────────────────────────────────────────────────────────

const SUBJECT_ORDER = ['DSA', 'OS', 'DBMS', 'CN', 'OOP', 'HR'];

const CONFIDENCE_STYLES = {
  'not-started':   { label: 'Not Started',  cls: 'bg-gray-700 text-gray-400'         },
  'beginner':      { label: 'Beginner',     cls: 'bg-yellow-500/20 text-yellow-400'  },
  'intermediate':  { label: 'Intermediate', cls: 'bg-blue-500/20 text-blue-400'      },
  'strong':        { label: 'Strong',       cls: 'bg-green-500/20 text-green-400'    },
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, sub, color = 'indigo' }) => {
  const colorMap = {
    indigo: 'text-indigo-400 bg-indigo-500/10',
    orange: 'text-orange-400 bg-orange-500/10',
    green:  'text-green-400  bg-green-500/10',
    red:    'text-red-400    bg-red-500/10',
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-xl ${colorMap[color]}`}>
        <Icon size={20} className={colorMap[color].split(' ')[0]} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-gray-400">{label}</p>
        {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

// ─── Topic Pill ───────────────────────────────────────────────────────────────

const TopicPill = ({ topic }) => {
  const confidence = topic.confidenceLevel || 'not-started';
  const style = CONFIDENCE_STYLES[confidence] || CONFIDENCE_STYLES['not-started'];
  const score = topic.averageScore ? topic.averageScore.toFixed(1) : '—';

  return (
    <div className="flex items-center justify-between bg-gray-800 border border-gray-700/50 rounded-xl px-4 py-3 hover:border-gray-600 transition group">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 font-medium truncate">{topic.topic}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {topic.totalSessionsCompleted} session{topic.totalSessionsCompleted !== 1 ? 's' : ''}
          {topic.lastPracticed
            ? ` · last ${new Date(topic.lastPracticed).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
            : ''}
        </p>
      </div>
      <div className="flex items-center gap-2.5 ml-3 flex-shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.cls}`}>
          {style.label}
        </span>
        <span className={`text-sm font-bold w-8 text-right ${
          topic.averageScore >= 7 ? 'text-green-400'
          : topic.averageScore >= 4 ? 'text-yellow-400'
          : topic.averageScore > 0 ? 'text-red-400'
          : 'text-gray-600'
        }`}>
          {score}
        </span>
      </div>
    </div>
  );
};

// ─── Subject Section ──────────────────────────────────────────────────────────

const SubjectSection = ({ subject, topics }) => (
  <div>
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{subject}</h3>
      <span className="text-xs text-gray-600">{topics.length} topics</span>
    </div>
    <div className="space-y-2">
      {topics.map((t) => <TopicPill key={t.topic} topic={t} />)}
    </div>
  </div>
);

// ─── Bar Chart ────────────────────────────────────────────────────────────────

const ScoreBarChart = ({ topicsProgress }) => {
  // Only chart topics that have been practiced
  const practiced = topicsProgress.filter(t => t.totalSessionsCompleted > 0);

  if (practiced.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-600">
        <TrendingUp size={32} className="mb-3 opacity-40" />
        <p className="text-sm">Complete your first interview to see scores here</p>
      </div>
    );
  }

  const data = {
    labels: practiced.map(t => t.topic.length > 14 ? t.topic.slice(0, 12) + '…' : t.topic),
    datasets: [{
      label: 'Avg Score',
      data: practiced.map(t => parseFloat(t.averageScore.toFixed(1))),
      backgroundColor: practiced.map(t =>
        t.averageScore >= 7 ? 'rgba(99, 102, 241, 0.8)'   // indigo — strong
        : t.averageScore >= 4 ? 'rgba(234, 179, 8, 0.8)'  // yellow — mid
        : 'rgba(239, 68, 68, 0.8)'                         // red — weak
      ),
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` Score: ${ctx.parsed.y} / 10`,
        },
        backgroundColor: '#1f2937',
        titleColor: '#e5e7eb',
        bodyColor: '#9ca3af',
        borderColor: '#374151',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: '#6b7280', font: { size: 11 } },
        grid:  { display: false },
      },
      y: {
        min: 0,
        max: 10,
        ticks: {
          color: '#6b7280',
          font: { size: 11 },
          stepSize: 2,
        },
        grid: { color: 'rgba(55, 65, 81, 0.5)' },
      },
    },
  };

  return <Bar data={data} options={options} />;
};

// ─── Weak Area Alert ──────────────────────────────────────────────────────────

const WeakAreaAlert = ({ weakTopics }) => {
  if (!weakTopics || weakTopics.length === 0) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={16} className="text-red-400" />
        <h3 className="text-sm font-semibold text-red-400">Focus Needed</h3>
      </div>
      <p className="text-xs text-gray-400 mb-3">
        These topics have an average score below 5. Prioritise them in your next session.
      </p>
      <div className="flex flex-wrap gap-2">
        {weakTopics.map(t => (
          <span key={t.topic} className="text-xs bg-red-500/20 text-red-300 px-3 py-1 rounded-full">
            {t.topic}
          </span>
        ))}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const DashboardPage = () => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axiosInstance.get('/progress/dashboard');
      setData(res.data);
    } catch (err) {
      setError('Could not load dashboard. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  // Group topics by subject
  const grouped = SUBJECT_ORDER.reduce((acc, subject) => {
    const topics = (data?.topicsProgress || []).filter(t => t.subject === subject);
    if (topics.length > 0) acc[subject] = topics;
    return acc;
  }, {});

  // ── Loading State ──
  if (loading) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 size={28} className="text-indigo-400 animate-spin" />
          <p className="text-gray-500 text-sm">Loading your dashboard...</p>
        </div>
      </PageWrapper>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-8">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Your placement preparation at a glance</p>
          </div>
          <Link
            to="/topics"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
          >
            <Play size={14} />
            Start Interview
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={Flame}
            label="Day Streak"
            value={data?.streak ?? 0}
            sub="days in a row"
            color="orange"
          />
          <StatCard
            icon={BookOpen}
            label="Sessions Done"
            value={data?.totalSessions ?? 0}
            sub="total interviews"
            color="indigo"
          />
          <StatCard
            icon={TrendingUp}
            label="Topics Practiced"
            value={(data?.topicsProgress || []).filter(t => t.totalSessionsCompleted > 0).length}
            sub={`of ${(data?.topicsProgress || []).length} total`}
            color="green"
          />
          <StatCard
            icon={AlertTriangle}
            label="Weak Areas"
            value={(data?.weakTopics || []).length}
            sub="score below 5"
            color="red"
          />
        </div>

        {/* Weak Area Alert */}
        <WeakAreaAlert weakTopics={data?.weakTopics} />

        {/* Bar Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-1">Topic-wise Average Score</h2>
          <p className="text-xs text-gray-500 mb-6">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-indigo-500 mr-1" />Strong (7+)
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-500 mx-1 ml-3" />Mid (4–6)
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500 mx-1 ml-3" />Weak (&lt;4)
          </p>
          <div className="h-56">
            <ScoreBarChart topicsProgress={data?.topicsProgress || []} />
          </div>
        </div>

        {/* Topic Breakdown */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-6">Topic Breakdown</h2>

          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-10 text-gray-600">
              <BookOpen size={28} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No sessions yet. Start your first interview to see data here.</p>
              <Link to="/topics" className="text-indigo-400 hover:text-indigo-300 text-sm mt-3 inline-block transition">
                Go to Topic Selector →
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(grouped).map(([subject, topics]) => (
                <SubjectSection key={subject} subject={subject} topics={topics} />
              ))}
            </div>
          )}
        </div>

      </div>
    </PageWrapper>
  );
};

export default DashboardPage;