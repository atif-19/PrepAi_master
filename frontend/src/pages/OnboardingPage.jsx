import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Upload, FileText, X } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';

// ─── Data ────────────────────────────────────────────────────────────────────

const COMPANIES = ['TCS', 'Infosys', 'Wipro', 'Cognizant', 'Capgemini', 'HCL'];

const PREP_LEVELS = [
  { value: 'beginner',     label: 'Beginner',     desc: 'Just started, basics are shaky' },
  { value: 'intermediate', label: 'Intermediate',  desc: 'Revised most topics once' },
  { value: 'advanced',     label: 'Advanced',      desc: 'Confident, need mock practice' },
];

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

// ─── Step Indicator ──────────────────────────────────────────────────────────

const StepIndicator = ({ current, total }) => (
  <div className="flex items-center gap-2 mb-8">
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all
          ${i < current
            ? 'bg-indigo-600 text-white'
            : i === current
            ? 'bg-indigo-500 text-white ring-2 ring-indigo-300/30'
            : 'bg-gray-800 text-gray-500'}`}>
          {i < current ? <CheckCircle2 size={14} /> : i + 1}
        </div>
        {i < total - 1 && (
          <div className={`h-0.5 w-10 rounded transition-all ${i < current ? 'bg-indigo-600' : 'bg-gray-800'}`} />
        )}
      </div>
    ))}
  </div>
);

// ─── Step 1: Company Select ───────────────────────────────────────────────────

const StepCompanies = ({ selected, onChange }) => (
  <div>
    <h2 className="text-xl font-semibold text-white mb-1">Target Companies</h2>
    <p className="text-gray-400 text-sm mb-6">Select all companies you're targeting. Pick at least one.</p>
    <div className="grid grid-cols-2 gap-3">
      {COMPANIES.map((company) => {
        const isSelected = selected.includes(company);
        return (
          <button
            key={company}
            type="button"
            onClick={() => onChange(
              isSelected
                ? selected.filter(c => c !== company)
                : [...selected, company]
            )}
            className={`flex items-center justify-between rounded-xl px-4 py-3 border text-sm font-medium transition-all
              ${isSelected
                ? 'bg-indigo-600/20 border-indigo-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}
          >
            {company}
            {isSelected && <CheckCircle2 size={16} className="text-indigo-400" />}
          </button>
        );
      })}
    </div>
  </div>
);

// ─── Step 2: Prep Level + Semester ───────────────────────────────────────────

const StepPrepLevel = ({ prepLevel, semester, onPrepChange, onSemesterChange }) => (
  <div>
    <h2 className="text-xl font-semibold text-white mb-1">Your Preparation Level</h2>
    <p className="text-gray-400 text-sm mb-6">This sets the starting difficulty of your interviews.</p>

    <div className="space-y-3 mb-7">
      {PREP_LEVELS.map((level) => {
        const isSelected = prepLevel === level.value;
        return (
          <button
            key={level.value}
            type="button"
            onClick={() => onPrepChange(level.value)}
            className={`w-full flex items-start gap-3 rounded-xl px-4 py-3.5 border text-left transition-all
              ${isSelected
                ? 'bg-indigo-600/20 border-indigo-500'
                : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}
          >
            <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 transition
              ${isSelected ? 'border-indigo-400 bg-indigo-400' : 'border-gray-600'}`} />
            <div>
              <p className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                {level.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{level.desc}</p>
            </div>
          </button>
        );
      })}
    </div>

    <div>
      <label className="block text-sm text-gray-400 mb-1.5">Current Semester</label>
      <select
        value={semester}
        onChange={(e) => onSemesterChange(Number(e.target.value))}
        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
      >
        {SEMESTERS.map(s => (
          <option key={s} value={s}>Semester {s}</option>
        ))}
      </select>
    </div>
  </div>
);

// ─── Step 3: Resume Upload ────────────────────────────────────────────────────

const StepResume = ({ resumeText, fileName, onFileUpload, onClear }) => {
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Read PDF as text using FileReader
    // Note: FileReader reads raw bytes — for real PDF text extraction
    // you'd use pdf.js. For now, we send the raw text content.
    // If resume is a plain .txt file it works perfectly.
    // PDF binary will be handled in the backend or upgraded later.
    const reader = new FileReader();
    reader.onload = (event) => {
      // For .txt resumes: event.target.result is clean text
      // For PDFs: we send the raw data URI and backend can handle it,
      // or we cap it at 3000 chars as schema specifies
      onFileUpload(event.target.result.slice(0, 3000), file.name);
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-1">Upload Your Resume</h2>
      <p className="text-gray-400 text-sm mb-6">
        The AI uses your resume to ask project-specific questions.{' '}
        <span className="text-indigo-400">Optional — you can skip this.</span>
      </p>

      {!resumeText ? (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-xl py-10 cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition group">
          <Upload size={28} className="text-gray-600 group-hover:text-indigo-400 transition mb-3" />
          <p className="text-sm text-gray-400 group-hover:text-gray-300 transition">
            Click to upload resume
          </p>
          <p className="text-xs text-gray-600 mt-1">.txt or .pdf — max 3000 characters used</p>
          <input
            type="file"
            accept=".txt,.pdf"
            onChange={handleFile}
            className="hidden"
          />
        </label>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-start gap-3">
          <FileText size={20} className="text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">{fileName}</p>
            <p className="text-xs text-gray-500 mt-1">
              {resumeText.length} characters extracted
            </p>
            <p className="text-xs text-gray-600 mt-2 line-clamp-2">{resumeText.slice(0, 120)}...</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="text-gray-600 hover:text-red-400 transition flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const OnboardingPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0, 1, 2

  // Form state
  const [companies, setCompanies] = useState([]);
  const [prepLevel, setPrepLevel] = useState('beginner');
  const [semester, setSemester] = useState(6);
  const [resumeText, setResumeText] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Validation per step ──
  const canProceed = () => {
    if (step === 0) return companies.length > 0;
    if (step === 1) return !!prepLevel;
    return true; // resume is optional
  };

  // ── Navigation ──
  const handleNext = () => {
    setError('');
    if (step < 2) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  // ── Final Submit ──
  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await axiosInstance.post('/user/onboarding', {
        targetCompanies: companies,
        preparationLevel: prepLevel,
        currentSemester: semester,
        resumeText: resumeText,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            Prep<span className="text-indigo-400">AI</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm">Let's set up your profile — takes 60 seconds</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">
          <StepIndicator current={step} total={3} />

          {/* Step Content */}
          {step === 0 && (
            <StepCompanies selected={companies} onChange={setCompanies} />
          )}
          {step === 1 && (
            <StepPrepLevel
              prepLevel={prepLevel}
              semester={semester}
              onPrepChange={setPrepLevel}
              onSemesterChange={setSemester}
            />
          )}
          {step === 2 && (
            <StepResume
              resumeText={resumeText}
              fileName={resumeFileName}
              onFileUpload={(text, name) => {
                setResumeText(text);
                setResumeFileName(name);
              }}
              onClear={() => {
                setResumeText('');
                setResumeFileName('');
              }}
            />
          )}

          {/* Error */}
          {error && (
            <div className="mt-5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg py-2.5 text-sm transition"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed() || loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 text-sm transition flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading
                ? 'Saving...'
                : step === 2
                ? 'Finish Setup'
                : 'Continue'}
            </button>
          </div>

          {/* Skip for step 2 */}
          {step === 2 && !loading && (
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full text-center text-xs text-gray-600 hover:text-gray-400 mt-3 transition"
            >
              Skip resume upload for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;