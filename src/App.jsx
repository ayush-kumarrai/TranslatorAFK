import { useState, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FaMicrophone, FaStop, FaPlay } from 'react-icons/fa';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const languages = [
  { code: 'en', name: 'English', recognitionLang: 'en-US' },
  { code: 'hi', name: 'Hindi', recognitionLang: 'hi-IN' },
  { code: 'te', name: 'Telugu', recognitionLang: 'te-IN' },
  { code: 'ta', name: 'Tamil', recognitionLang: 'ta-IN' },
  { code: 'bho', name: 'Bhojpuri', recognitionLang: 'bho-IN' }
];

const App = () => {
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('hi');
  const [conversation, setConversation] = useState([]);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentMode, setCurrentMode] = useState('user');
  const [error, setError] = useState('');

  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition,
    listening,
  } = useSpeechRecognition();

  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      setError("Browser doesn't support speech recognition!");
    }
  }, [browserSupportsSpeechRecognition]);

  useEffect(() => {
    if (isAutoMode && !listening && !isSpeaking) {
      startListening();
    }
  }, [isAutoMode, listening, isSpeaking]);

  const startListening = () => {
    const langConfig = languages.find(l => l.code === (currentMode === 'user' ? sourceLang : targetLang));
    SpeechRecognition.startListening({
      continuous: false,
      language: langConfig?.recognitionLang,
    });
  };

  const translateText = async (text, target) => {
    try {
      const prompt = `Translate this to ${target} (return only translated text without any additional text or quotes): ${text}`;
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Translation error:', error);
      setError('Translation failed. Please try again.');
      return '';
    }
  };

  const speakText = (text, lang) => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        setError('Text-to-speech not supported in this browser');
        return resolve();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };
      utterance.onerror = (err) => {
        console.error('Speech error:', err);
        setError('Speech synthesis failed');
        resolve();
      };
      
      window.speechSynthesis.speak(utterance);
    });
  };

  const handleConversation = async () => {
    if (!transcript.trim()) return;

    try {
      const originalEntry = {
        speaker: currentMode === 'user' ? 'You' : 'Them',
        text: transcript,
        lang: currentMode === 'user' ? sourceLang : targetLang
      };

      const translatedText = await translateText(
        transcript,
        currentMode === 'user' ? targetLang : sourceLang
      );

      if (!translatedText) return;

      const translatedEntry = {
        speaker: currentMode === 'user' ? 'Voice' : 'Speaker',
        text: translatedText,
        lang: currentMode === 'user' ? targetLang : sourceLang
      };

      setConversation(prev => [...prev, originalEntry, translatedEntry]);
      
      await speakText(translatedText, translatedEntry.lang);

      setCurrentMode(prev => prev === 'user' ? 'them' : 'user');
      resetTranscript();
      
    } catch (error) {
      console.error('Conversation error:', error);
      setError('Conversation flow error. Please try again.');
    }
  };

  useEffect(() => {
    if (transcript && !listening && isAutoMode) {
      handleConversation();
    }
  }, [transcript, listening]);

  const toggleAutoMode = () => {
    if (isAutoMode) {
      setIsAutoMode(false);
      SpeechRecognition.stopListening();
    } else {
      setError('');
      setIsAutoMode(true);
      setCurrentMode('user');
      resetTranscript();
      startListening();
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-6 lg:p-8">
  <div className="w-full mx-auto bg-white rounded-xl shadow-lg p-4 md:p-6 lg:p-8">
    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center mb-6 md:mb-8 text-indigo-800">Real-Time Translator</h1>
    
    {error && (
      <div className="mb-6 p-3 md:p-4 bg-red-100 text-red-700 rounded-lg border border-red-200 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {error}
      </div>
    )}
    
    <div className="flex flex-col sm:flex-row gap-4 mb-6 w-full">
      <div className="flex-1 w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1">Source Language</label>
        <select
          className="w-full p-2 md:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gradient-to-r from-gray-50 to-white text-gray-700 shadow-sm appearance-none cursor-pointer hover:border-indigo-300 transition-colors"
          value={sourceLang}
          onChange={(e) => setSourceLang(e.target.value)}
        >
          {languages.map(lang => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
          ))}
        </select>
      </div>
      
      <div className="flex-1 w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1">Target Language</label>
        <select
          className="w-full p-2 md:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gradient-to-r from-gray-50 to-white text-gray-700 shadow-sm appearance-none cursor-pointer hover:border-indigo-300 transition-colors"
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
        >
          {languages.map(lang => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
          ))}
        </select>
      </div>
    </div>
    
    <div className="flex gap-4 justify-center mb-6 md:mb-8">
      <button
        onClick={toggleAutoMode}
        className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-white font-medium shadow-md transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-lg ${
          isAutoMode ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
        }`}
      >
        {isAutoMode ? <FaStop /> : <FaPlay />}
        {isAutoMode ? 'Stop Conversation' : 'Start Conversation'}
      </button>
    </div>
    
    <div className="border border-gray-200 rounded-lg p-3 md:p-4 mb-6 bg-gray-50 w-full">
      <div className="font-bold mb-2 text-gray-800">Live Transcription:</div>
      <div className="text-gray-700 min-h-12 p-2 md:p-3 bg-white rounded-md border border-gray-100 w-full">
        {transcript || "Waiting for speech..."}
      </div>
    </div>
    
    <div className="border border-gray-200 rounded-lg p-3 md:p-4 bg-gray-50 w-full">
      <h2 className="font-bold mb-3 md:mb-4 text-gray-800 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        Conversation History:
      </h2>
      <div className="space-y-3 md:space-y-4 max-h-72 md:max-h-96 overflow-y-auto w-full">
        {conversation.length > 0 ? (
          conversation.map((entry, index) => (
            <div 
              key={index} 
              className={`p-3 md:p-4 rounded-lg shadow-sm w-full ${
                entry.speaker === 'You' ? 'bg-blue-50 border-l-4 border-blue-400' :
                entry.speaker === 'Voice' ? 'bg-green-50 border-l-4 border-green-400' :
                entry.speaker === 'Them' ? 'bg-yellow-50 border-l-4 border-yellow-400' : 'bg-purple-50 border-l-4 border-purple-400'
              }`}
            >
              <div className="font-semibold text-sm text-gray-600 mb-1 flex items-center">
                {entry.speaker === 'You' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                )}
                {entry.speaker === 'Voice' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                )}
                {entry.speaker === 'Them' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                )}
                {entry.speaker} ({entry.lang}):
              </div>
              <div className="text-gray-800">{entry.text}</div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 py-6">No conversation history yet</div>
        )}
      </div>
    </div>
    
    {listening && (
      <div className="fixed bottom-6 right-6 bg-indigo-600 text-white p-3 md:p-4 rounded-full shadow-xl flex items-center justify-center">
        <FaMicrophone className="animate-pulse" size={24} />
      </div>
    )}
  </div>
  <div className="w-full bg-white shadow-md mt-8 rounded-xl p-4 md:p-6 lg:p-8 text-center">
  <p className="text-gray-600 text-sm md:text-base">
    © {new Date().getFullYear()} Real-Time Translator. All rights reserved.
  </p>
  <div className="flex justify-center space-x-4 mt-3">
    <a href="https://www.linkedin.com/in/ayush-kumarrai/" className="text-indigo-600 hover:underline text-sm md:text-base">
      Ayush Kumar Rai
    </a>
    <span className="text-gray-400">|</span>
    <a href="#" className="text-indigo-600 hover:underline text-sm md:text-base">
      NTorQ YT
    </a>
  </div>
</div>

</div>
  );
};

export default App;