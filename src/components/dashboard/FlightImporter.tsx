/**
 * Flight importer with drag-and-drop support
 * Handles file selection and invokes the Rust import command
 */

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { open } from '@tauri-apps/plugin-dialog';
import { useFlightStore } from '@/stores/flightStore';

export function FlightImporter() {
  const { importLog, isImporting } = useFlightStore();

  // Handle file selection via dialog
  const handleBrowse = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: 'DJI Log Files',
          extensions: ['txt', 'dat', 'log', 'csv'],
        },
      ],
    });

    if (selected && typeof selected === 'string') {
      const result = await importLog(selected);
      if (!result.success) {
        alert(result.message);
      }
    }
  };

  // Handle drag and drop
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        // For Tauri, we need the file path which isn't directly available
        // from the File object. The user will need to use the file dialog.
        // This is a limitation of web-based drag and drop in Tauri.
        alert(
          'Please use the "Browse" button to select files. ' +
            'Drag and drop file paths are not accessible in Tauri apps.'
        );
      }
    },
    [importLog]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt', '.dat', '.log'],
      'text/csv': ['.csv'],
    },
    multiple: false,
    noClick: true, // Disable click to use our custom button
  });

  return (
    <div
      {...getRootProps()}
      className={`drop-zone p-4 text-center ${isDragActive ? 'active' : ''}`}
    >
      <input {...getInputProps()} />

      {isImporting ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-dji-primary border-t-transparent rounded-full spinner" />
          <span className="text-sm text-gray-400">Importing...</span>
        </div>
      ) : (
        <>
          <div className="mb-2">
            <svg
              className="w-8 h-8 mx-auto text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          <p className="text-xs text-gray-400 mb-2">
            {isDragActive
              ? 'Drop the file here...'
              : 'Import a DJI flight log'}
          </p>

          <button
            onClick={handleBrowse}
            className="btn-primary text-sm py-1.5 px-3"
            disabled={isImporting}
          >
            Browse Files
          </button>
        </>
      )}
    </div>
  );
}
