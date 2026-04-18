import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import axiosInstance from '../api/axiosInstance';
import { TopicsData } from '../utils/TopicsData';

const SUBJECTS = Object.keys(TopicsData);

const SubjectAccordion = ({ subject, topics, selectedTopic, onSelect }) => {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Accordion Header */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/50 transition"
      >
        <span className="text-sm font-semibold text-white tracking-wide">{subject}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{topics.length} topics</span>
          {open ? <ChevronUp size={15} className="text-gray-500" /> : <ChevronDown size={15} className="text-gray-500" />}
        </div>
      </button>

      {/* Topic Grid */}
      {open && (
        <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {topics.map((topic) => {
            const isSelected = selectedTopic?.topic === topic && selectedTopic?.subject === subject;
            return (
              <button
                key={topic}
                type="button"
                onClick={() => onSelect(isSelected ? null : { topic, subject })}
                className={`text-left px-4 py-3 rounded-xl border text-sm transition
                  ${isSelected
                    ? 'bg-indigo-600/20 border-indigo-500 text-white font-medium'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'}`}
              >
                {topic}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const TopicSelectPage = () => {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    if (!selectedTopic) return;
    setLoading(true);
    setError('');
    try {
      const res = await axiosInstance.post('/session/start', {
        topic: selectedTopic.topic,
        subject: selectedTopic.subject,
        sessionType: 'topic',
      });
      // Pass sessionId + first question to InterviewPage via navigation state
      navigate('/interview', {
        state: {
          sessionId: res.data.sessionId,
          firstQuestion: res.data.firstQuestion,
          topic: selectedTopic.topic,
          subject: selectedTopic.subject,
        }
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start session. Check your API key in Settings.');
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Select a Topic</h1>
          <p className="text-gray-400 text-sm mt-1">
            Pick one topic you've revised today. The AI will interview you on it.
          </p>
        </div>

        {/* Accordions */}
        {SUBJECTS.map((subject) => (
          <SubjectAccordion
            key={subject}
            subject={subject}
            topics={TopicsData[subject]}
            selectedTopic={selectedTopic}
            onSelect={setSelectedTopic}
          />
        ))}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Sticky Start Button */}
        <div className="sticky bottom-4">
          <button
            type="button"
            onClick={handleStart}
            disabled={!selectedTopic || loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-2xl text-sm transition shadow-lg shadow-indigo-900/30"
          >
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Starting interview...</>
              : selectedTopic
              ? <><Play size={16} /> Start Interview — {selectedTopic.topic}</>
              : 'Select a topic to begin'}
          </button>
        </div>

      </div>
    </PageWrapper>
  );
};

export default TopicSelectPage;