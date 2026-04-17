import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import useSpeech from '../hooks/useSpeech';
import { Mic, Send, Volume2 } from 'lucide-react';

const InterviewPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { speak, startListening, isListening, transcript, setTranscript } = useSpeech();
  
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const startSession = async () => {
      const res = await axiosInstance.post('/session/start', { 
        topic: state.topic, 
        subject: state.subject,
        sessionType: 'topic' 
      });
      setSessionId(res.data.sessionId);
      setCurrentQuestion(res.data.firstQuestion);
      speak(res.data.firstQuestion);
    };
    startSession();
  }, []);

  useEffect(() => {
    if (transcript) setUserAnswer(transcript);
  }, [transcript]);

  const handleAnswer = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.post('/session/answer', {
        sessionId,
        questionText: currentQuestion,
        userAnswer
      });

      if (res.data.type === 'evaluation') {
        navigate('/feedback', { state: { feedback: res.data } });
      } else {
        setCurrentQuestion(res.data.nextQuestion);
        setUserAnswer('');
        setTranscript('');
        speak(res.data.nextQuestion);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl mt-12 bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700">
        <div className="flex justify-between mb-4">
          <span className="text-blue-400 font-mono text-sm uppercase tracking-widest">{state.topic}</span>
          <Volume2 className="cursor-pointer" onClick={() => speak(currentQuestion)} />
        </div>
        
        <h2 className="text-xl font-semibold mb-8 min-h-[100px] leading-relaxed">
          {currentQuestion || "Initializing Interviewer..."}
        </h2>

        <div className="relative mb-4">
          <textarea 
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-4 h-32 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Type your answer or use the microphone..."
          />
          <button 
            onClick={startListening}
            className={`absolute bottom-4 right-4 p-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-600'}`}
          >
            <Mic size={20} />
          </button>
        </div>

        <button 
          onClick={handleAnswer}
          disabled={loading || !userAnswer}
          className="w-full py-3 bg-white text-black font-bold rounded-lg flex justify-center items-center gap-2 hover:bg-gray-200 transition disabled:opacity-50"
        >
          {loading ? "Processing..." : "Submit Answer"} <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default InterviewPage;