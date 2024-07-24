import React, { useState, useCallback, useEffect } from 'react';
import MediaSelector from './MediaSelector';
import UploadModal from './UploadModal';
import ScriptEditor from './ScriptEditor';
import { Script } from './types';
import logo from './logo.jpeg';
import './App.css';
import ResultsListView from './ResultListView';
import { initGA, logEvent, logPageView } from './ga'; // Import Google Analytics functions

interface ImageFile {
  file: File;
  preview: string;
}

const OPENAI_KEY = 'openAIKey';
const getOpenAIKey = () => localStorage.getItem(OPENAI_KEY);

enum ActiveView {
  AIUserTest = 'AIUserTest',
  Scripts = 'Scripts',
  Settings = 'Settings',
  Results = 'Results'
}

const App: React.FC = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [openAIKey, setOpenAIKey] = useState<string | null>(getOpenAIKey());
  const [activeView, setActiveView] = useState<ActiveView>(ActiveView.AIUserTest);

  const handleUploadClick = useCallback(() => {
    if (images.length > 0) {
      setIsUploading(true);
    }
  }, [images]);

  const handleUploadComplete = useCallback(() => {
    setIsUploading(false);
  }, []);

  const handleSaveKey = (key: string) => {
    localStorage.setItem(OPENAI_KEY, key);
    setOpenAIKey(key);
    setActiveView(ActiveView.AIUserTest); // Redirect to UXTest after saving the key
  };


  useEffect(() => {
    initGA();
    logPageView(); // Log the page view
  }, []);


  useEffect(() => {
    logEvent('nav', 'change_tab', activeView.toString());
  }, [activeView])
  
  if (!openAIKey) {
    return (
      <div className='main'>
        <h1> Welcome! </h1>
        <img className='logo-image' src={logo} alt='logo' />
        <h2> This is a design tool to have a simulated user, via AI, run through your designs and provide user feedback.</h2>
        <p>In order to get started, please provide an OpenAI API key.</p>
        <FormToSaveKey onSave={handleSaveKey} />
      </div>
    );
  }

  if (isUploading) {
    return (
      <UploadModal
        openAIKey={openAIKey}
        script={selectedScript}
        setMediaId={setMediaId}
        mediaId={mediaId}
        images={images}
        onClose={handleUploadComplete}
      />
    );
  }

  return (
    <div className='main'>
      <div className='tab-list'>
        <div
          className={`tab ${activeView === ActiveView.AIUserTest ? 'tab--selected' : ''}`}
          onClick={() => setActiveView(ActiveView.AIUserTest)}
        >
          AI User Test
        </div>
        <div
          className={`tab ${activeView === ActiveView.Scripts ? 'tab--selected' : ''}`}
          onClick={() => setActiveView(ActiveView.Scripts)}
        >
          Scripts
        </div>
        <div
          className={`tab ${activeView === ActiveView.Results ? 'tab--selected' : ''}`}
          onClick={() => setActiveView(ActiveView.Results)}
        >
          Results
        </div>
        <div
          className={`tab ${activeView === ActiveView.Settings ? 'tab--selected' : ''}`}
          onClick={() => setActiveView(ActiveView.Settings)}
        >
          Settings
        </div>
      </div>

      <div className='tab-panel'>
        {activeView === ActiveView.AIUserTest && (
          <>
            <h2 className='medium'>User Testing conducted by a simulated user (AI driven)</h2>
            <p>1) Select a set of questions to ask about your design:</p>
            <ScriptEditor selectedScript={selectedScript} setSelectedScript={setSelectedScript} />
            <p>2) Add the design you want user tested:</p>
            <MediaSelector
              onMediaChanged={() => {
                setMediaId(null);
              }}
              images={images}
              setImages={setImages}
              onUploadClick={handleUploadClick}
            />
          </>
        )}
        {activeView === ActiveView.Scripts && (
          <ScriptEditor selectedScript={selectedScript} setSelectedScript={setSelectedScript} advanceEditEnabled />
        )}
        {activeView === ActiveView.Results && (
          <ResultsListView />
        )}
        {activeView === ActiveView.Settings && (
          <KeyEditor openAIKey={openAIKey} onSave={handleSaveKey} />
        )}
      </div>
    </div>
  );
};

interface FormToSaveKeyProps {
  onSave: (key: string) => void;
}

const FormToSaveKey: React.FC<FormToSaveKeyProps> = ({ onSave }) => {
  const [key, setKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(key);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        className='simple-text-input'
        type="text"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="Enter OpenAI API Key"
      />
      <button className='secondary-button' type="submit">Get Started</button>
    </form>
  );
};

interface KeyEditorProps {
  openAIKey: string;
  onSave: (key: string) => void;
}

const KeyEditor: React.FC<KeyEditorProps> = ({ openAIKey, onSave }) => {
  const [key, setKey] = useState(openAIKey);

  const handleSave = () => {
    onSave(key);
  };

  return (
    <div>
      <p>OpenAI API Key:</p>

      <input
        className='simple-text-input'
        type="text"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="Enter OpenAI API Key"
      />
      <button className='secondary-button' onClick={handleSave}>Update  Key</button>
    </div>
  );
};

export default App;
