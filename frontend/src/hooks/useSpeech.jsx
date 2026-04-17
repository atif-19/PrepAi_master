import { useState, useEffect } from 'react';

const useSpeech = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  // Text to Speech (AI voice output)
  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    // Setting a slightly formal, clear voice
    utterance.rate = 0.9; 
    window.speechSynthesis.speak(utterance);
  };

  // Speech to Text (User voice input)
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Browser does not support Speech Recognition");

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const currentTranscript = event.results[0][0].transcript;
      setTranscript(currentTranscript);
    };

    recognition.start();
  };

  return { speak, startListening, isListening, transcript, setTranscript };
};

export default useSpeech;