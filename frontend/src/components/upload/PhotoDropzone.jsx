import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, ImageIcon } from 'lucide-react';

function PhotoDropzone({ onFilesSelect, maxFiles = 10, maxSize = 10 * 1024 * 1024 }) {
  const [selectedFiles, setSelectedFiles] = useState([]);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      alert('Some files were rejected. Please check file types and sizes.');
      return;
    }

    // Limit total files
    if (selectedFiles.length + acceptedFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newFiles = [...selectedFiles, ...acceptedFiles];
    setSelectedFiles(newFiles);
    onFilesSelect(newFiles);
  }, [selectedFiles, onFilesSelect, maxFiles]);

  const removeFile = (fileToRemove) => {
    const newFiles = selectedFiles.filter(file => file !== fileToRemove);
    setSelectedFiles(newFiles);
    onFilesSelect(newFiles);
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    onFilesSelect([]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxSize,
    multiple: true,
  });

  const formatFileSize = (size) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center">
          {isDragActive ? (
            <>
              <Upload className="h-12 w-12 text-blue-500 mb-4" />
              <p className="text-lg font-medium text-blue-600">
                Drop your photos here...
              </p>
            </>
          ) : (
            <>
              <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-600 mb-2">
                Drag and drop photos here
              </p>
              <p className="text-sm text-gray-500 mb-4">
                or click to select files
              </p>
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Choose Photos
              </button>
            </>
          )}
        </div>

        <div className="mt-4 text-xs text-gray-400">
          <p>Maximum {maxFiles} files • Max {Math.floor(maxSize / (1024 * 1024))}MB per file</p>
          <p>Supports: JPEG, PNG, GIF, WebP</p>
        </div>
      </div>

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Selected Photos ({selectedFiles.length})
            </h3>
            <button
              onClick={clearAllFiles}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {selectedFiles.map((file, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Remove button */}
                  <button
                    onClick={() => removeFile(file)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* File info */}
                <div className="mt-2 text-sm text-gray-600">
                  <p className="truncate font-medium">{file.name}</p>
                  <p className="text-gray-400">{formatFileSize(file.size)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PhotoDropzone;