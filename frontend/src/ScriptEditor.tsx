import React, { useState, useEffect } from 'react';
import { Script } from './types';
import { v4 as uuidv4 } from 'uuid';

interface ScriptEditorProps {
  selectedScript: Script | null;
  setSelectedScript: (script: Script | null) => void;
  advanceEditEnabled?: boolean;
}

const ScriptEditor: React.FC<ScriptEditorProps> = ({ selectedScript, setSelectedScript, advanceEditEnabled = false }) => {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [isAddingScript, setIsAddingScript] = useState(false);
  const [newScriptName, setNewScriptName] = useState('');

  // Load scripts from local storage or use base templates if none are found
  useEffect(() => {
    const savedScripts = localStorage.getItem('scripts');
    if (savedScripts) {
      const parsedScripts = JSON.parse(savedScripts);
      if (parsedScripts.length > 0) {
        setScripts(parsedScripts);
        if (!selectedScript && parsedScripts.length > 0) {
          setSelectedScript(parsedScripts[0]);
        }
      } else {
        // If no scripts are found, use base templates and set them in local storage
        setScripts(baseTemplates);
        localStorage.setItem('scripts', JSON.stringify(baseTemplates));
        if (!selectedScript && baseTemplates.length > 0) {
          setSelectedScript(baseTemplates[0]);
        }
      }
    } else {
      // If no scripts are in local storage, use base templates and set them
      setScripts(baseTemplates);
      localStorage.setItem('scripts', JSON.stringify(baseTemplates));
      if (!selectedScript && baseTemplates.length > 0) {
        setSelectedScript(baseTemplates[0]);
      }
    }
  }, [selectedScript, setSelectedScript]);

  // Update local storage whenever scripts are changed
  useEffect(() => {
    if (scripts.length > 0) {
      localStorage.setItem('scripts', JSON.stringify(scripts));
    }
  }, [scripts]);

  const handleScriptChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value === 'add_script') {
      setIsAddingScript(true);
    } else {
      const selected = scripts.find(script => script.id === value);
      setSelectedScript(selected || null);
    }
  };

  const handleAddScript = () => {
    if (!newScriptName.trim()) {
      return; // Prevent adding if the name is empty
    }
    const newScript: Script = {
      id: uuidv4(),
      name: newScriptName,
      questions: [{ id: uuidv4(), text: 'Please analyze this design...' }]
    };
    const updatedScripts = [...scripts, newScript];
    setScripts(updatedScripts);
    setSelectedScript(newScript);
    localStorage.setItem('scripts', JSON.stringify(updatedScripts));
    setNewScriptName('');
    setIsAddingScript(false);
  };

  const addQuestion = () => {
    if (selectedScript) {
      const updatedScript = {
        ...selectedScript,
        questions: [...selectedScript.questions, { id: uuidv4(), text: '' }]
      };
      updateScript(updatedScript);
    }
  };

  const deleteQuestion = (questionId: string) => {
    if (selectedScript) {
      const updatedScript = {
        ...selectedScript,
        questions: selectedScript.questions.filter(q => q.id !== questionId)
      };
      updateScript(updatedScript);
    }
  };

  const prependQuestion = (questionId: string) => {
    if (selectedScript) {
      const index = selectedScript.questions.findIndex(q => q.id === questionId);
      const updatedQuestions = [
        ...selectedScript.questions.slice(0, index),
        { id: uuidv4(), text: '' },
        ...selectedScript.questions.slice(index)
      ];
      updateScript({ ...selectedScript, questions: updatedQuestions });
    }
  };

  const updateQuestionText = (questionId: string, newText: string) => {
    if (selectedScript) {
      const updatedQuestions = selectedScript.questions.map(q =>
        q.id === questionId ? { ...q, text: newText } : q
      );
      updateScript({ ...selectedScript, questions: updatedQuestions });
    }
  };

  const updateScript = (updatedScript: Script) => {
    const updatedScripts = scripts.map(script =>
      script.id === updatedScript.id ? updatedScript : script
    );
    setScripts(updatedScripts);
    setSelectedScript(updatedScript);
    localStorage.setItem('scripts', JSON.stringify(updatedScripts)); // Ensure updated scripts are saved
  };

  const handleEditScriptTitle = (scriptId: string, newName: string) => {
    const updatedScripts = scripts.map(script =>
      script.id === scriptId ? { ...script, name: newName } : script
    );
    setScripts(updatedScripts);
    localStorage.setItem('scripts', JSON.stringify(updatedScripts));
  };

  const handleDeleteScript = (scriptId: string) => {
    const updatedScripts = scripts.filter(script => script.id !== scriptId);
    setScripts(updatedScripts);
    setSelectedScript(updatedScripts.length > 0 ? updatedScripts[0] : null);
    localStorage.setItem('scripts', JSON.stringify(updatedScripts));
  };

  const handleCloneScript = (script: Script) => {
    const clonedScript: Script = {
      ...script,
      id: uuidv4(),
      name: `${script.name} (Clone)`
    };
    const updatedScripts = [...scripts, clonedScript];
    setScripts(updatedScripts);
    setSelectedScript(clonedScript);
    localStorage.setItem('scripts', JSON.stringify(updatedScripts));
  };

  const handleRecreateBaseTemplate = (template: Script) => {
    const recreatedTemplate: Script = {
      ...template,
      id: uuidv4()
    };
    const updatedScripts = [...scripts, recreatedTemplate];
    setScripts(updatedScripts);
    localStorage.setItem('scripts', JSON.stringify(updatedScripts));
  };

  if (isAddingScript) {
    return (
      <div>
        <div>
          <h3>Add a new script (question presets):</h3>
          <input
            className='simple-text-input'
            type="text"
            value={newScriptName}
            onChange={(e) => setNewScriptName(e.target.value)}
            placeholder="Enter script name"
          />
          <button className='secondary-button' onClick={handleAddScript}>Create New Script</button>
          <button className='secondary-button' onClick={() => setIsAddingScript(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      User Test Script:
      <select
        onChange={handleScriptChange}
        className='dropdown'
        value={isAddingScript ? 'add_script' : selectedScript ? selectedScript.id : ''}
      >
        {scripts.map(script => (
          <option key={script.id} value={script.id}>{script.name}</option>
        ))}
        <option value="add_script">* Add Script</option>
      </select>
      {selectedScript && (
        <div>
          {selectedScript.questions.map(question => (
            <div key={question.id}>
              <div className="button-container">
                <button className="mini-button" onClick={() => prependQuestion(question.id)}>+</button>
                <textarea
                  className="question-input"
                  value={question.text}
                  onChange={(e) => updateQuestionText(question.id, e.target.value)}
                />
                <button className="mini-button" onClick={() => deleteQuestion(question.id)}>-</button>
              </div>
            </div>
          ))}
          <button className='secondary-button' onClick={addQuestion}>Add Question</button>
        </div>
      )}
      {advanceEditEnabled && (
        <div>
          <h3>User Test Scripts:</h3>
          {scripts.map(script => (
            <div key={script.id}>
              <input
                className='script-name-input'
                type="text"
                value={script.name}
                onChange={(e) => handleEditScriptTitle(script.id, e.target.value)}
              />
              <button className='secondary-button' onClick={() => handleDeleteScript(script.id)}>Delete</button>
              <button className='secondary-button' onClick={() => handleCloneScript(script)}>Clone</button>
            </div>
          ))}
          <h3>Template Library</h3>
          {baseTemplates.map(template => (
            <div key={template.id}>
              <button className='secondary-button' onClick={() => handleRecreateBaseTemplate(template)}>Clone</button>
              {template.name}

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const baseTemplates = [
  {
    id: 'first_impressions',
    name: 'Fist Impressions',
    questions: [
      { id: '01', text: 'Can you please explain what you are seeing and what this is about?' },
      { id: '02', text: 'What kind of interactions would you expect to be able to do? What would you try to do and what is the expected behavior?' },
      { id: '03', text: 'Can you please generate describe the other screens you would expect to see?' },
      { id: '04', text: 'Can you please describe what the main areas of focus are and what grabs your attention the most. If at all possible try to rank them numerically. If nothing grabs your attention please mention that.' },
      { id: '05', text: 'Can you please mention what was not too clear to you?' },
      { id: '06', text: 'Any ideas for improvements you might make?' },
    ],
  },
  {
    id: 'graphic_design_feedback',
    name: 'Graphic Design Feedback',
    questions: [
      { id: '01', text: 'Where does your eye first go when looking at this design?' },
      { id: '02', text: 'Can you please spot if I am using too many fonts? Ideally no more than 3 variations.' },
      { id: '03', text: 'Can you please comment on the visual hierarchy of the designs and if it makes any sense or what might confuse a user?' },
    ],
  },
  {
    id: 'compare_multiple_designs',
    name: 'Compare Multiple Designs',
    questions: [
      { id: '01', text: 'Can you please tell me what you think you are seeing?' },
      { id: '02', text: 'Which of these do you prefer and why?' },
      { id: '03', text: 'Which of these distinct (two, three) designs do you prefer and why? What are their strengths and weaknesses?' },
    ],
  },
  {
    id: 'reword_ui_text',
    name: 'Reword UI Text',
    questions: [
      { id: '01', text: 'Can you please reword the UI elements in these design (buttons, headings, etc) to make them clearer? Please provide your reasoning (pros and cons, etc).' },
    ],
  },
  {
    id: 'quick_impressions',
    name: 'Quick Feedback & Impressions',
    questions: [
      { id: '01', text: 'Can you please explain what you are seeing and what this is about?' },
      { id: '02', text: 'Can you please mention what was not too clear to you?' },
    ],
  },
];


export default ScriptEditor;
