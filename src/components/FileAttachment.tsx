import React, { useState } from 'react';
import { File, Download, Eye, X, Image as ImageIcon, FileText } from 'lucide-react';
import { FileAttachment as FileAttachmentType } from '../types';

interface FileAttachmentProps {
  attachment: FileAttachmentType;
  isOwnMessage?: boolean;
}

const FileAttachmentComponent: React.FC<FileAttachmentProps> = ({ attachment, isOwnMessage = false }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const getFileIcon = () => {
    if (attachment.fileType.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5" />;
    } else if (attachment.fileType === 'application/pdf') {
      return <FileText className="h-5 w-5" />;
    }
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileDataUrl = (): string => {
    // Reconstruct the data URL from base64
    return `data:${attachment.fileType};base64,${attachment.fileData}`;
  };

  const handleDownload = () => {
    const dataUrl = getFileDataUrl();
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = attachment.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleView = () => {
    setShowPreview(true);
    setPreviewError(false);
  };

  const isImage = attachment.fileType.startsWith('image/');
  const isPDF = attachment.fileType === 'application/pdf';

  return (
    <>
      <div className={`mt-2 p-3 rounded-lg border ${
        isOwnMessage 
          ? 'bg-white/20 border-white/30 backdrop-blur-sm' 
          : 'bg-white border-gray-300'
      }`}>
        <div className="flex items-center space-x-3">
          <div className={`flex-shrink-0 ${
            isOwnMessage ? 'text-white' : 'text-gray-600'
          }`}>
            {getFileIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${
              isOwnMessage ? 'text-white' : 'text-gray-900'
            }`}>
              {attachment.fileName}
            </p>
            <p className={`text-xs ${
              isOwnMessage ? 'text-white/80' : 'text-gray-500'
            }`}>
              {formatFileSize(attachment.fileSize)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {(isImage || isPDF) && (
              <button
                onClick={handleView}
                className={`p-1.5 rounded transition-colors ${
                  isOwnMessage 
                    ? 'text-white hover:bg-white/20' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                aria-label="View file"
                title="View file"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={handleDownload}
              className={`p-1.5 rounded transition-colors ${
                isOwnMessage 
                  ? 'text-white hover:bg-white/20' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              aria-label="Download file"
              title="Download file"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPreview(false)}
        >
          <div 
            className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900 truncate flex-1">
                {attachment.fileName}
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="ml-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              {isImage && !previewError ? (
                <img
                  src={getFileDataUrl()}
                  alt={attachment.fileName}
                  className="max-w-full max-h-[70vh] object-contain"
                  onError={() => setPreviewError(true)}
                />
              ) : isPDF ? (
                <iframe
                  src={getFileDataUrl()}
                  className="w-full h-[70vh] border-0"
                  title={attachment.fileName}
                  onError={() => setPreviewError(true)}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Preview not available for this file type.</p>
                  <button
                    onClick={handleDownload}
                    className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </button>
                </div>
              )}
              {previewError && (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Failed to load preview.</p>
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={handleDownload}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FileAttachmentComponent;

