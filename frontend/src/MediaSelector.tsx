import React, { useState, useCallback } from 'react';
import { useDropzone, DropzoneOptions, FileRejection } from 'react-dropzone';
import { X } from 'lucide-react';
import { ImageFile } from './types';

interface MediaSelectorProps {
  images: ImageFile[];
  setImages: React.Dispatch<React.SetStateAction<ImageFile[]>>;
  onUploadClick: () => void;
  onMediaChanged: () => void;
}

const MediaSelector: React.FC<MediaSelectorProps> = ({
  images,
  setImages,
  onMediaChanged,
  onUploadClick }) => {
  const [designsAreExpanded, setDesignsAreExpanded] = useState(false);

  const toggleDesignExpansion = () => {
    setDesignsAreExpanded(!designsAreExpanded);
  };

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    const newImages = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages(prevImages => [...prevImages, ...newImages]);
    onMediaChanged();
  }, [setImages]);

  const dropzoneOptions: DropzoneOptions = {
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone(dropzoneOptions);

  const removeImage = (index: number) => {
    setImages(prevImages => prevImages.filter((_, i) => i !== index));
    onMediaChanged();
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white shadow-md rounded-lg overflow-hidden">
      <div className="px-6 py-4">
        <div
          {...getRootProps()}
          className={`img-drop-area border-2 border-dashed rounded-lg p-4 text-center cursor-pointer ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
        >
          <input {...getInputProps()} />
          <p>{isDragActive ? 'Drop the images here' : 'Drag & drop images here, or click to select'}</p>
        </div>
        {(images.length > 0) && <button className='secondary-button' onClick={toggleDesignExpansion}>
          {designsAreExpanded ? 'Collapse Designs' : 'Expand Designs'}
        </button>}
        <div className="space-y-4 mt-4">
          {images.map((image, index) => (
            <span key={index}>
              <button
                onClick={() => removeImage(index)}
                className="small-close-btn p-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                <X size={16} />
              </button>
              <br />
              <img 
                className={`preview-image ${designsAreExpanded ? 'expanded' : ''}`}
                src={image.preview} 
                alt={`Preview ${index}`} />
              <p className='image-name'> {image.file.name} </p>
            </span>
          ))}
        </div>
      </div>
      <div className="px-6 py-4 bg-gray-50 flex justify-end items-center">
        <button
          onClick={onUploadClick}
          disabled={images.length === 0}
          className={`${images.length === 0
              ? 'main-button disabled-button bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'main-button main-button-active bg-blue-500 text-white hover:bg-blue-600'
            }`}
        >
          Start UX Test
          <br />
          (With an AI acting as the user)
        </button>
      </div>
    </div>
  );
};

export default MediaSelector;
