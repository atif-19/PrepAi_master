import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subjects } from '../utils/TopicsData';

const TopicSelectPage = () => {
  const [selectedSubject, setSelectedSubject] = useState('DSA');
  const [selectedTopic, setSelectedTopic] = useState('');
  const navigate = useNavigate();

  const handleStart = () => {
    if (selectedTopic) {
      navigate('/interview', { state: { topic: selectedTopic, subject: selectedSubject } });
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">What did you revise today?</h2>
      <div className="flex gap-4 mb-8">
        {Object.keys(subjects).map(sub => (
          <button 
            key={sub}
            onClick={() => { setSelectedSubject(sub); setSelectedTopic(''); }}
            className={`px-4 py-2 rounded ${selectedSubject === sub ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            {sub}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {subjects[selectedSubject].map(topic => (
          <button
            key={topic}
            onClick={() => setSelectedTopic(topic)}
            className={`p-4 border rounded-lg text-left transition ${selectedTopic === topic ? 'border-blue-600 bg-blue-50' : 'hover:border-gray-400'}`}
          >
            {topic}
          </button>
        ))}
      </div>
      <button 
        disabled={!selectedTopic}
        onClick={handleStart}
        className="mt-8 w-full bg-black text-white py-4 rounded-xl font-bold disabled:opacity-50"
      >
        Start Mock Interview
      </button>
    </div>
  );
};

export default TopicSelectPage;