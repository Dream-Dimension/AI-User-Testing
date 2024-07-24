import React, { useState } from 'react';
import { UXTestResult } from './types';
import ReactMarkdown from 'react-markdown';

import { SERVER_URL } from './constants.util';

import './App.css';

interface Props {
    uxTestResult: UXTestResult;
}

const UXTestResultView: React.FC<Props> = ({ uxTestResult }) => {
    // State to manage which questions are open
    const [openQuestions, setOpenQuestions] = useState<Set<number>>(new Set(uxTestResult.responses.map((_, index) => index)));

    // Function to toggle the visibility of a question's response
    const toggleQuestion = (index: number) => {
        setOpenQuestions(prevOpenQuestions => {
            const newOpenQuestions = new Set(prevOpenQuestions);
            if (newOpenQuestions.has(index)) {
                newOpenQuestions.delete(index);
            } else {
                newOpenQuestions.add(index);
            }
            return newOpenQuestions;
        });
    };

    return (
        <div className='main'>
            <h1>Designs Analyzed:</h1>
            {uxTestResult.media.map(mediaPath => {
                const normalizedPath = mediaPath.replace(/\\/g, '/');
                const fullUrl = `${SERVER_URL}/${normalizedPath}`;
                return (
                    <div key={mediaPath}>
                        <img className='preview-image' src={fullUrl} alt='Design preview' />
                        <br />
                        <br />
                    </div>
                );
            })}

            <h1>UX Test Result:</h1>
            {uxTestResult.responses.map(({ question, response }, index) => (


                <div key={`response-${index}`} >
                    <div onClick={() => toggleQuestion(index)} className='secondary-button'>
                        <h2> {index + 1}) {question.text} </h2>
                    </div>
                    {openQuestions.has(index) && (
                        <div className='response'>
                            <p>
                                <b>AI Response:</b>
                                <ReactMarkdown>{response}</ReactMarkdown>
                            </p>
                        </div>
                    )}
                </div>
            ))}

        </div>
    );
};

export default UXTestResultView;
