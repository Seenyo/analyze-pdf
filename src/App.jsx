import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Copy, Check, File, CheckSquare, Square } from 'lucide-react';
import { extractTextFromPDF } from './lib/pdfExtractor';

function App() {
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [fileName, setFileName] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file) => {
    if (file.type !== 'application/pdf') {
      setError('Please upload a valid PDF file.');
      return;
    }

    setError('');
    setFileName(file.name);
    setIsExtracting(true);
    setExtractedQuestions([]);
    setSelectedIds(new Set());
    setIsCopied(false);

    try {
      const questions = await extractTextFromPDF(file);
      if (questions.length === 0) {
        setError('No valid questions found in this PDF.');
      } else {
        setExtractedQuestions(questions);
        // Auto-select all by default
        setSelectedIds(new Set(questions.map(q => q.id)));
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while extracting text from the PDF: ' + err.message);
    } finally {
      setIsExtracting(false);
      // Reset the file input so the same file can be uploaded again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const toggleSelection = (id) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleAll = () => {
    if (selectedIds.size === extractedQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(extractedQuestions.map(q => q.id)));
    }
  };

  const copyToClipboard = () => {
    const selectedText = extractedQuestions
      .filter(q => selectedIds.has(q.id))
      .map(q => q.fullText)
      .join('\n\n');

    if (selectedText) {
      navigator.clipboard.writeText(selectedText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>PDF Extractor</h1>
        <p>Drop your PDF to seamlessly extract and copy its text.</p>
      </div>

      <div
        className={`dropzone ${isDragging ? 'active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          accept="application/pdf"
        />
        <div className="icon-wrapper">
          {isExtracting ? <div className="loader"></div> : <UploadCloud size={32} />}
        </div>
        {isExtracting ? (
          <>
            <h3>Extracting text...</h3>
            <p>This might take a few seconds.</p>
          </>
        ) : (
          <>
            <h3>Click or drag PDF to upload</h3>
            <p>Maximum file size 50MB</p>
          </>
        )}
      </div>

      {error && <div style={{ color: '#ef4444', textAlign: 'center', marginBottom: '1rem' }}>{error}</div>}

      {extractedQuestions.length > 0 && !isExtracting && (
        <div className="result-area">
          <div className="result-header">
            <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="file-info">
                <File size={20} className="text-accent" style={{ color: '#4f46e5' }} />
                <span>{fileName}</span>
              </div>
              <span className="selection-count" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {selectedIds.size} of {extractedQuestions.length} selected
              </span>
            </div>

            <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button className="text-btn" onClick={toggleAll} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}>
                {selectedIds.size === extractedQuestions.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                className={`copy-btn ${isCopied ? 'copied' : ''}`}
                onClick={copyToClipboard}
                disabled={selectedIds.size === 0}
                style={{ opacity: selectedIds.size === 0 ? 0.5 : 1, cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer' }}
              >
                {isCopied ? <Check size={18} /> : <Copy size={18} />}
                {isCopied ? 'Copied Selected!' : 'Copy Selected'}
              </button>
            </div>
          </div>

          <div className="questions-list">
            {extractedQuestions.map((q) => {
              const isSelected = selectedIds.has(q.id);
              return (
                <div
                  key={q.id}
                  className={`question-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleSelection(q.id)}
                >
                  <div className="checkbox-wrapper">
                    {isSelected ? (
                      <CheckSquare size={20} className="checkbox-icon checked" style={{ color: 'var(--success)' }} />
                    ) : (
                      <Square size={20} className="checkbox-icon" style={{ color: 'var(--text-secondary)' }} />
                    )}
                  </div>
                  <div className="question-content">
                    <span className="question-number">{q.rawNumber}</span>
                    <span className="question-snippet">{q.snippet}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
