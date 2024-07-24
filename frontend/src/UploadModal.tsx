import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import { ImageFile, Script, UXTestResult } from './types';
import PropagateLoader  from "react-spinners/ClipLoader";
import UXTestResultView from './UXTestResultView';
import './App.css';
import { SERVER_URL } from './constants.util';

interface UploadModalProps {
  images: ImageFile[];
  mediaId: string | null;
  setMediaId: (id: string | null) => void;
  onClose: () => void;
  openAIKey: string;
  script: Script | null;
}

const MAX_RETRIES = 2;

const UploadModal: React.FC<UploadModalProps> = ({
  script,
  mediaId,
  setMediaId,
  images,
  openAIKey,
  onClose
}) => {
  const [imagesAlreadyUploaded, setImagesAlreadyUploaded] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [testResults, setTestResults] = useState<UXTestResult|null>();
  const [uploadProgress, setUploadProgress] = useState<number[]>(Array(images.length).fill(0));
  const mediaIdRef = useRef<string | null>(null);
  const uploadLockRef = useRef(false);

  const uploadImage = async (index: number): Promise<string | null> => {
    const image = images[index];
    let retries = 0;

    const attemptUpload = async (): Promise<string | null> => {
      const formData = new FormData();
      formData.append('file', image.file);
      if (mediaIdRef.current) {
        formData.append('mediaId', mediaIdRef.current);
      }

      try {
        const response = await axios.post(`${SERVER_URL}/upload`, formData, {
          onUploadProgress: progressEvent => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total ?? 100));
            setUploadProgress(prevProgress => {
              const newProgress = [...prevProgress];
              newProgress[index] = percentCompleted;
              return newProgress;
            });
          }
        });
        const responseData = response.data;

        if (responseData.mediaId) {
          return responseData.mediaId;
        }
        return null;
      } catch (error) {
        console.error('Upload failed:', error);
        return null;
      }
    };

    while (retries < MAX_RETRIES) {
      const mediaId = await attemptUpload();
      if (mediaId) {
        return mediaId;
      }
      retries += 1;
    }

    return null;
  };

  useEffect(() => {
    if (uploadLockRef.current) return;
    uploadLockRef.current = true;

    console.log('Entering upload use effect...', images.length, mediaId);
    mediaIdRef.current = null; // TODO: maybe we don't need to set this to null..?

    const uploadAllImages = async (): Promise<string | null> => {
      setImagesAlreadyUploaded(false);
      if (mediaId != null) {
        console.log('Media already uploaded & is unmodified.', mediaId);
        setImagesAlreadyUploaded(true);
        return mediaId;
      }
      setTestResults(null);
      for (let i = 0; i < images.length; i++) {
        const newMediaId = await uploadImage(i);
        if (newMediaId) {
          mediaIdRef.current = newMediaId;
        } else if (i === 0) {
          // If the first upload fails to return a mediaId, we should probably handle this error
          console.error("Failed to get mediaId from first upload");
          throw Error('Upload of media failed.');
          // return;
        }
      }
      
      setMediaId(mediaIdRef.current); // on finish all media upload.
      return mediaIdRef.current;
    };

    const runUserTest = async (mediaId: string, script: Script) => {
      setStatusMsg('Conducting user test... please wait. This may take a while.');
      try {
        const response = await axios.post<UXTestResult>(`${SERVER_URL}/uxtest`, {
          script,
          mediaId,
          openAIKey
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log('response', response);

        // Save response in local storage
        const savedResults = JSON.parse(localStorage.getItem('uxTestResults') || '[]');
        savedResults.push(response.data);
        localStorage.setItem('uxTestResults', JSON.stringify(savedResults));

        setStatusMsg('Finished conducting user test');
        return response.data;
      } catch (error) {
        setStatusMsg('Error conducting user test');
        if (axios.isAxiosError(error)) {
          if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Error data:', error.response.data);
            console.error('Error status:', error.response.status);
          } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received:', error.request);
          } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error message:', error.message);
          }
        } else {
          // Handle non-Axios errors
          console.error('Unexpected error:', error);
        }
        throw error;
      }
    }

    (async () => {

      if (script == null) {
        alert('Please select a script before starting.');
        uploadLockRef.current = false;
        return;
      }

      if ((images?.length ?? 0) <= 0) {
        alert('Please add media before starting.');
        uploadLockRef.current = false;
        return;
      }

      try {
        const _mediaId = await uploadAllImages();
        if (_mediaId == null) {
          setStatusMsg('Error uploading media...');
          uploadLockRef.current = false;
          return;
        }
        
        const uxTestResult = await runUserTest(_mediaId, script);
        setTestResults(uxTestResult);
      } finally {
        uploadLockRef.current = false;
      }

    })();
    
  }, []);


  if (testResults != null) {
    return <div className="main"> 
       <button onClick={onClose} className="close-button text-red-500 hover:text-red-700">
            <X size={24} />
      </button>
      <UXTestResultView uxTestResult={testResults}/>
    </div>;
  }

  return (
    <div className="main">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2>
            <PropagateLoader className='spinner' size={20} color="#8e0091" /> 
            Running UX Test: {script?.name}
          </h2>
        </div>

        <div className="space-y-4">
          {images.map((image, index) => (
            <div key={index} className="flex items-center space-x-4">
              <img src={image.preview} alt={`Preview ${index}`} className="preview-image" />
              
              {!imagesAlreadyUploaded && <div className="flex-grow">
                <p className="text-sm truncate">{image.file.name}</p>
                <div className="relative h-2 bg-gray-200 rounded">
                  <div
                    className="absolute top-0 left-0 h-2 bg-blue-500 rounded"
                    style={{ width: `${uploadProgress[index]}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500">
                  {uploadProgress[index] === 100 ? 'Uploaded image successfully.' : `Uploading... (${uploadProgress[index]}%)`}
                </p>
              </div>}

            </div>
          ))}
        </div>
      </div>
      <h3>{statusMsg}</h3>
      <p> Total Questions: {script?.questions.length}</p>
      <PropagateLoader color="#8e0091" />

    </div>
  );
};

export default UploadModal;
