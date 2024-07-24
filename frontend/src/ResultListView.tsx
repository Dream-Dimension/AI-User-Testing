import React, { useState, useEffect } from 'react';
import { UXTestResult } from './types';
import UXTestResultView from './UXTestResultView';
import { SERVER_URL } from './constants.util';
import moment from 'moment';
import './App.css';

const ResultsListView: React.FC = () => {
  const [results, setResults] = useState<UXTestResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<UXTestResult | null>(null);

  // Fetch results from local storage when the component mounts
  useEffect(() => {
    const fetchResults = () => {
      const storedResults = localStorage.getItem('uxTestResults');
      if (storedResults) {
        const parsedResults = JSON.parse(storedResults);
        // Sort results in descending order based on timestampEnd
        const sortedResults = parsedResults.sort((a: UXTestResult, b: UXTestResult) => 
               b.timestampEnd.localeCompare(a.timestampEnd)
        );
        setResults(sortedResults);
      }
    };
    fetchResults();
  }, []);

  const handleResultClick = (result: UXTestResult) => {
    window.scrollTo({top: 0, behavior: 'smooth'});
    setSelectedResult(result);
  };

  const handleBack = () => {
    setSelectedResult(null);
  };

  if (selectedResult) {
    return (
      <div className="main">
        <button onClick={handleBack} className="secondary-button">
          Back to Results List
        </button>
        <UXTestResultView uxTestResult={selectedResult} />
      </div>
    );
  }

  return (
    <div className="main">
      <h1 className="text-xl font-bold">Results List</h1>
      <div className="results-list">
        {(results == null || results?.length === 0) && <p> No results yet. Please run a user test. </p>}
        {results.map((result) => (
          <div key={result.id} className="secondary-button" onClick={() => handleResultClick(result)}>
            <div className="result-summary">
              <h2>{result.scriptName}</h2>
              <p>Questions: {result.responses.length}</p>
              <p>Timestamp: {moment(result.timestampEnd).format('MMMM D, YYYY, h:mm:ss A')}</p>
              {result.media.map((mediaPath, index) => {
                const normalizedPath = mediaPath.replace(/\\/g, '/');
                const fullUrl = `${SERVER_URL}/${normalizedPath}`;
                return <img key={index} className='preview-image side-by-side' src={fullUrl} alt={`Preview ${index + 1}`} />;
              })} 
              <br />
              <button className='secondary-button' onClick={() => handleResultClick(result)}>View Details</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultsListView;