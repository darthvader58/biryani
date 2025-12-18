import React, { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import Webcam from 'react-webcam';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import toast, { Toaster } from 'react-hot-toast';
import '../styles/home.css';

// Set up PDF.js worker - use local worker file to avoid CORS issues
try {
    // Try local worker first
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
} catch (e) {
    console.warn('Failed to set local worker, trying fallback');
    // Fallback to a different CDN if local fails
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const Home = ({ user }) => {
    const [imageUrl, setImageUrl] = useState('');
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [extractedText, setExtractedText] = useState('');
    const [loading, setLoading] = useState(false);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');
    const [uploadMethod, setUploadMethod] = useState('file'); // 'file', 'camera', or 'url'
    const [showCamera, setShowCamera] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const webcamRef = useRef(null);

    // Enhanced PDF text extraction with better error handling
    const extractTextFromPDF = async (file) => {
        console.log('Starting PDF extraction for file:', file.name);
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            
            // Configure PDF.js with proper settings
            const loadingTask = pdfjsLib.getDocument({
                data: arrayBuffer,
                verbosity: 0, // Reduce logging
                cMapUrl: 'https://unpkg.com/pdfjs-dist@5.4.449/cmaps/',
                cMapPacked: true,
                standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@5.4.449/standard_fonts/'
            });
            
            const pdf = await loadingTask.promise;
            console.log('PDF loaded successfully, pages:', pdf.numPages);
            
            let fullText = '';
            const maxPages = Math.min(pdf.numPages, 10); // Limit to first 10 pages for performance
            
            for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
                try {
                    const page = await pdf.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    
                    const pageText = textContent.items
                        .map(item => {
                            // Handle both string and object items
                            if (typeof item === 'string') return item;
                            return item.str || item.chars || '';
                        })
                        .join(' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    
                    if (pageText && pageText.length > 0) {
                        fullText += (fullText ? '\n\n--- Page ' + pageNum + ' ---\n' : '') + pageText;
                    }
                    
                    console.log(`Page ${pageNum} processed, text length: ${pageText.length}`);
                } catch (pageError) {
                    console.warn(`Failed to process page ${pageNum}:`, pageError.message);
                    continue;
                }
            }
            
            const cleanText = fullText.trim();
            console.log('Total extracted text length:', cleanText.length);
            
            if (!cleanText || cleanText.length < 10) {
                throw new Error('No readable text found in PDF. This appears to be a scanned or image-based document.');
            }
            
            return cleanText;
        } catch (error) {
            console.error('PDF extraction error:', error);
            
            // Handle specific PDF.js errors
            if (error.name === 'InvalidPDFException') {
                throw new Error('Invalid PDF file. Please check the file and try again.');
            }
            if (error.name === 'MissingPDFException') {
                throw new Error('PDF file appears to be corrupted or incomplete.');
            }
            if (error.name === 'UnexpectedResponseException') {
                throw new Error('Unable to load PDF. Please try a different file.');
            }
            if (error.message && error.message.includes('worker')) {
                throw new Error('PDF processing service unavailable. Please try converting to image format.');
            }
            
            // Re-throw our custom errors
            if (error.message && (
                error.message.includes('selectable text') || 
                error.message.includes('image-based') || 
                error.message.includes('scanned document')
            )) {
                throw error;
            }
            
            // Generic error with helpful message
            throw new Error('Failed to extract text from PDF. This may be a scanned document - try uploading as an image instead.');
        }
    };

    // File upload handler
    const onDrop = useCallback(async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (file) {
            // Add to uploaded files list
            setUploadedFiles(prev => [...prev, file]);
            setOcrLoading(true);
            
            const isPDF = file.type === 'application/pdf';
            const loadingMessage = isPDF ? 'Processing PDF...' : 'Extracting text from image...';
            toast.loading(loadingMessage);
            
            try {
                let extractedText;
                
                if (isPDF) {
                    try {
                        // Try direct PDF text extraction
                        extractedText = await extractTextFromPDF(file);
                        toast.dismiss();
                        toast.success('PDF text extracted successfully!');
                    } catch (pdfError) {
                        console.error('PDF text extraction failed:', pdfError);
                        
                        // Try OCR as fallback for scanned PDFs
                        try {
                            console.log('PDF appears to be scanned, trying OCR fallback...');
                            toast.dismiss();
                            toast.loading('Processing scanned PDF with OCR...', { duration: 10000 });
                            
                            // Convert first page of PDF to image for OCR
                            const arrayBuffer = await file.arrayBuffer();
                            
                            // Use simpler PDF.js configuration for rendering
                            const pdf = await pdfjsLib.getDocument({ 
                                data: arrayBuffer,
                                verbosity: 0
                            }).promise;
                            
                            const page = await pdf.getPage(1);
                            const viewport = page.getViewport({ scale: 2.0 });
                            
                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;
                            
                            // Render PDF page to canvas
                            await page.render({ 
                                canvasContext: context, 
                                viewport: viewport 
                            }).promise;
                            
                            console.log('PDF page rendered to canvas, starting OCR...');
                            
                            // Convert canvas to blob for OCR
                            const blob = await new Promise(resolve => 
                                canvas.toBlob(resolve, 'image/png', 0.95)
                            );
                            
                            // Use Tesseract OCR on the rendered image
                            const result = await Tesseract.recognize(blob, 'eng', {
                                logger: m => {
                                    if (m.status === 'recognizing text') {
                                        console.log(`OCR progress: ${(m.progress * 100).toFixed(1)}%`);
                                    }
                                }
                            });
                            
                            const ocrText = result.data.text.trim();
                            console.log('OCR completed, text length:', ocrText.length);
                            
                            if (ocrText && ocrText.length > 10) {
                                extractedText = ocrText;
                                toast.dismiss();
                                toast.success('Scanned PDF processed successfully with OCR!');
                            } else {
                                throw new Error('OCR could not extract readable text from the PDF');
                            }
                        } catch (ocrError) {
                            console.error('OCR processing failed:', ocrError);
                            throw new Error(`PDF processing failed. This appears to be a scanned or image-based PDF that couldn't be processed.\n\nAlternatives:\n• Convert to JPG/PNG and upload as image\n• Use camera to capture the content\n• Type the problem manually`);
                        }
                    }
                } else {
                    // Use Tesseract.js for image OCR
                    const result = await Tesseract.recognize(file, 'eng', {
                        logger: m => console.log(m)
                    });
                    extractedText = result.data.text;
                }
                
                // Append to existing text if there's already content
                setExtractedText(prev => {
                    const newText = prev ? `${prev}\n\n--- From ${file.name} ---\n${extractedText}` : extractedText;
                    return newText;
                });
                toast.dismiss();
                toast.success(`Text extracted successfully from ${isPDF ? 'PDF' : 'image'}!`);
            } catch (err) {
                console.error('Extraction Error:', err);
                console.error('Error stack:', err.stack);
                toast.dismiss();
                
                // Show detailed error message
                const errorMessage = err.message || 'Failed to extract text from file';
                
                if (errorMessage.includes('PDF') || errorMessage.includes('scanned')) {
                    // Show multi-line error for PDF issues
                    const lines = errorMessage.split('\n');
                    toast.error(lines[0], { duration: 6000 });
                    if (lines.length > 1) {
                        setTimeout(() => {
                            toast(lines.slice(1).join('\n'), { 
                                duration: 8000,
                                icon: '💡'
                            });
                        }, 500);
                    }
                } else {
                    toast.error(errorMessage, { duration: 5000 });
                }
                
                // Set error state for display
                setError(errorMessage);
            } finally {
                setOcrLoading(false);
            }
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp'],
            'application/pdf': ['.pdf']
        },
        multiple: true
    });

    // Camera capture functionality
    const capturePhoto = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
            // Convert base64 to blob
            fetch(imageSrc)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                    setCapturedImage(imageSrc);
                    setUploadedFiles(prev => [...prev, file]);
                    setShowCamera(false);
                    
                    // Process with OCR
                    setOcrLoading(true);
                    toast.loading('Extracting text from captured image...');
                    
                    Tesseract.recognize(file, 'eng', {
                        logger: m => console.log(m)
                    }).then(result => {
                        setExtractedText(prev => {
                            const newText = prev ? `${prev}\n\n--- From Camera ---\n${result.data.text}` : result.data.text;
                            return newText;
                        });
                        toast.dismiss();
                        toast.success('Text extracted successfully!');
                        setOcrLoading(false);
                    }).catch(err => {
                        console.error('OCR Error:', err);
                        toast.dismiss();
                        toast.error('Failed to extract text from image');
                        setOcrLoading(false);
                    });
                });
        }
    }, [webcamRef]);

    const startCamera = () => {
        setShowCamera(true);
        setCapturedImage(null);
    };

    const closeCamera = () => {
        setShowCamera(false);
    };

    // Remove a specific file
    const removeFile = (indexToRemove) => {
        setUploadedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
        // Regenerate extracted text from remaining files
        regenerateExtractedText();
    };

    // Clear all files
    const clearAllFiles = () => {
        setUploadedFiles([]);
        setExtractedText('');
        setCapturedImage(null);
        setError('');
    };

    // Regenerate extracted text from all files
    const regenerateExtractedText = async () => {
        if (uploadedFiles.length === 0) {
            setExtractedText('');
            return;
        }
        
        setOcrLoading(true);
        let combinedText = '';
        
        for (let i = 0; i < uploadedFiles.length; i++) {
            const file = uploadedFiles[i];
            try {
                let fileText = '';
                const isPDF = file.type === 'application/pdf';
                
                if (isPDF) {
                    // Re-extract from PDF
                    fileText = await extractTextFromPDF(file);
                } else {
                    // Re-extract from image
                    const result = await Tesseract.recognize(file, 'eng');
                    fileText = result.data.text;
                }
                
                combinedText += (combinedText ? `\n\n--- From ${file.name} ---\n` : '') + fileText;
            } catch (err) {
                console.error(`Failed to re-extract from ${file.name}:`, err);
            }
        }
        
        setExtractedText(combinedText);
        setOcrLoading(false);
    };

    // Test PDF.js functionality
    const testPDFJS = async () => {
        try {
            console.log('Testing PDF.js...');
            console.log('PDF.js version:', pdfjsLib.version);
            console.log('Worker source:', pdfjsLib.GlobalWorkerOptions.workerSrc);
            
            // Test if worker is accessible
            try {
                const response = await fetch(pdfjsLib.GlobalWorkerOptions.workerSrc);
                if (response.ok) {
                    console.log('PDF.js worker file is accessible');
                    toast.success('PDF.js is configured correctly!');
                } else {
                    throw new Error(`Worker file not found: ${response.status}`);
                }
            } catch (fetchError) {
                console.error('Worker accessibility test failed:', fetchError);
                toast.error('PDF.js worker setup issue. PDF processing may not work.');
            }
        } catch (error) {
            console.error('PDF.js test failed:', error);
            toast.error('PDF.js setup issue: ' + error.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!user) {
            setError('Please sign in first to use the problem solver');
            return;
        }

        const problemText = uploadMethod === 'file' ? extractedText : imageUrl;
        if (!problemText) {
            setError(uploadMethod === 'file' ? 'Please upload an image first' : 'Please enter problem text or image URL');
            return;
        }

        setLoading(true);
        setError('');
        setResults(null);
        toast.loading('Analyzing your problem...');

        try {
            const payload = {
                userEmail: user.email,
                problemText: problemText,
                uploadMethod: uploadMethod,
                imageUrl: uploadMethod === 'url' ? imageUrl : null
            };

            const response = await axios.post('http://localhost:8080/api/analyze-problem', payload);
            setResults(response.data);
            toast.dismiss();
            toast.success('Analysis complete!');
        } catch (err) {
            setError('Failed to analyze problem. Please try again.');
            console.error('Error analyzing problem:', err);
            toast.dismiss();
            toast.error('Analysis failed');
        } finally {
            setLoading(false);
        }
    };

    const getErrorTypeStyle = (errorType) => {
        if (errorType?.includes('no_error') || errorType?.includes('no error')) return 'success';
        if (errorType?.includes('conceptual')) return 'conceptual';
        if (errorType?.includes('computational') || errorType?.includes('calculation')) return 'calculation';
        if (errorType?.includes('no_solution_provided') || errorType?.includes('no solution')) return 'no-solution';
        return 'unknown';
    };

    return (
        <div className="home-container">
            <div className="hero-section">
                <h1 className="main-title">ForMath</h1>
                <p className="subtitle">Step-by-Step Problem Solving Analysis Helper</p>
                <p className="description">
                    Upload your math homework (images or PDFs) and let our AI identify calculation errors, 
                    conceptual mistakes, or confirm your solution is correct!
                </p>
            </div>

            <div className="upload-section">
                <div className="upload-card">
                    <h2>Upload Your Problem</h2>
                    
                    <div className="upload-method-selector">
                        <button 
                            type="button"
                            className={`method-btn ${uploadMethod === 'file' ? 'active' : ''}`}
                            onClick={() => setUploadMethod('file')}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                            </svg>
                            Upload
                        </button>
                        <button 
                            type="button"
                            className={`method-btn ${uploadMethod === 'camera' ? 'active' : ''}`}
                            onClick={() => setUploadMethod('camera')}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M4,4H7L9,2H15L17,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9Z" />
                            </svg>
                            Camera
                        </button>
                        <button 
                            type="button"
                            className={`method-btn ${uploadMethod === 'url' ? 'active' : ''}`}
                            onClick={() => setUploadMethod('url')}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12M8,13H16V11H8V13M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.71 18.71,15.1 17,15.1H13V17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7Z" />
                            </svg>
                            Text
                        </button>
                    </div>

                    {uploadMethod === 'file' && (
                        <div className="file-upload-section">
                            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                                <input {...getInputProps()} />
                                {uploadedFiles.length > 0 ? (
                                    <div className="files-preview">
                                        <div className="files-header">
                                            <h4>{uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} uploaded</h4>
                                            <button onClick={clearAllFiles} className="clear-all-btn">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                                                </svg>
                                                Clear All
                                            </button>
                                        </div>
                                        <div className="files-list">
                                            {uploadedFiles.map((file, index) => (
                                                <div key={index} className="file-item">
                                                    <div className="file-preview">
                                                        {file.type === 'application/pdf' ? (
                                                            <div className="file-icon pdf-icon">
                                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                                                </svg>
                                                            </div>
                                                        ) : (
                                                            <img 
                                                                src={URL.createObjectURL(file)} 
                                                                alt="Uploaded file" 
                                                                className="file-thumbnail"
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="file-info">
                                                        <p className="file-name">{file.name}</p>
                                                        <small className="file-size">
                                                            {file.type === 'application/pdf' ? 'PDF' : 'Image'} • {(file.size / 1024 / 1024).toFixed(2)} MB
                                                        </small>
                                                    </div>
                                                    <button 
                                                        onClick={() => removeFile(index)} 
                                                        className="remove-file-btn"
                                                        title="Remove file"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button 
                                            {...getRootProps()} 
                                            className="add-more-btn"
                                        >
                                            <input {...getInputProps()} />
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                                            </svg>
                                            Add More Files
                                        </button>
                                    </div>
                                ) : (
                                    <div className="dropzone-content">
                                        <div className="upload-icon">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                            </svg>
                                        </div>
                                        <p>Drag & drop your homework file here, or click to select</p>
                                        <small>Supports JPG, PNG, GIF, BMP, PDF</small>
                                        <div className="pdf-tips">
                                            <details>
                                                <summary>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}>
                                                        <path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z" />
                                                    </svg>
                                                    PDF Upload Tips
                                                </summary>
                                                <div className="tips-content">
                                                    <p><strong>Best PDFs for text extraction:</strong></p>
                                                    <ul>
                                                        <li>Digital documents (Word → PDF)</li>
                                                        <li>Typed homework assignments</li>
                                                        <li>Online textbook pages</li>
                                                    </ul>
                                                    <p><strong>If your PDF doesn't work:</strong></p>
                                                    <ul>
                                                        <li>It's likely scanned or image-based</li>
                                                        <li>The app will try OCR automatically</li>
                                                        <li>You can also convert to JPG/PNG</li>
                                                    </ul>
                                                </div>
                                            </details>
                                        </div>
                                        {process.env.NODE_ENV === 'development' && (
                                            <div style={{ marginTop: '12px' }}>
                                                <button 
                                                    type="button"
                                                    onClick={testPDFJS}
                                                    style={{
                                                        padding: '4px 8px',
                                                        fontSize: '12px',
                                                        background: '#272729',
                                                        color: '#d7dadc',
                                                        border: '1px solid #343536',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Test PDF.js Setup
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {ocrLoading && (
                                <div className="ocr-loading">
                                    <div className="spinner"></div>
                                    <p>Extracting text from image...</p>
                                </div>
                            )}
                            
                            {extractedText && (
                                <div className="extracted-text">
                                    <h4>Extracted Text:</h4>
                                    <textarea 
                                        value={extractedText}
                                        onChange={(e) => setExtractedText(e.target.value)}
                                        placeholder="Edit the extracted text if needed..."
                                        rows={6}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {uploadMethod === 'camera' && (
                        <div className="camera-section">
                            {!showCamera && !capturedImage && (
                                <div className="camera-start">
                                    <div className="camera-icon">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M4,4H7L9,2H15L17,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9Z" />
                                        </svg>
                                    </div>
                                    <h3>Take a Photo</h3>
                                    <p>Capture your math problem directly with your camera</p>
                                    <button onClick={startCamera} className="camera-start-btn">
                                        Start Camera
                                    </button>
                                </div>
                            )}

                            {showCamera && (
                                <div className="camera-interface">
                                    <div className="camera-header">
                                        <h3>Position your math problem in the frame</h3>
                                        <button onClick={closeCamera} className="camera-close-btn">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="camera-preview">
                                        <Webcam
                                            audio={false}
                                            ref={webcamRef}
                                            screenshotFormat="image/jpeg"
                                            width="100%"
                                            videoConstraints={{
                                                width: 1280,
                                                height: 720,
                                                facingMode: "environment"
                                            }}
                                        />
                                    </div>
                                    <div className="camera-controls">
                                        <button onClick={capturePhoto} className="capture-btn">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                                                <circle cx="12" cy="12" r="6" fill="currentColor"/>
                                            </svg>
                                            Capture
                                        </button>
                                    </div>
                                </div>
                            )}

                            {capturedImage && (
                                <div className="captured-image">
                                    <h4>Captured Image:</h4>
                                    <img src={capturedImage} alt="Captured problem" className="preview-image" />
                                    <div className="capture-actions">
                                        <button onClick={startCamera} className="retake-btn">
                                            Retake Photo
                                        </button>
                                    </div>
                                </div>
                            )}

                            {ocrLoading && (
                                <div className="ocr-loading">
                                    <div className="spinner"></div>
                                    <p>Extracting text from captured image...</p>
                                </div>
                            )}
                            
                            {extractedText && (
                                <div className="extracted-text">
                                    <h4>Extracted Text:</h4>
                                    <textarea 
                                        value={extractedText}
                                        onChange={(e) => setExtractedText(e.target.value)}
                                        placeholder="Edit the extracted text if needed..."
                                        rows={6}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {uploadMethod === 'url' && (
                        <div className="url-input-section">
                            <div className="input-group">
                                <label htmlFor="imageUrl">Problem Text or Image URL</label>
                                <textarea
                                    id="imageUrl"
                                    placeholder="Enter your math problem text or paste an image URL..."
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    disabled={loading}
                                    rows={4}
                                />
                                <small>You can paste problem text directly or provide an image URL</small>
                            </div>
                        </div>
                    )}
                    
                    {error && <div className="error-message">{error}</div>}
                    
                    <button 
                        onClick={handleSubmit}
                        className="submit-btn"
                        disabled={loading || !user || 
                            (uploadMethod === 'file' && uploadedFiles.length === 0) || 
                            (uploadMethod === 'camera' && !extractedText) || 
                            (uploadMethod === 'url' && !imageUrl)}
                    >
                        {loading ? 'Analyzing...' : 'Analyze Problem'}
                    </button>

                    {!user && (
                        <p className="sign-in-prompt">
                            Please <a href="/signin">sign in</a> to use the problem solver
                        </p>
                    )}
                </div>
            </div>

            <Toaster position="top-right" />

            {loading && (
                <div className="loading-section">
                    <div className="spinner"></div>
                    <p>Analyzing your work with AI...</p>
                    <small>This may take a few moments</small>
                </div>
            )}

            {results && (
                <div className="results-section">
                    <h2>Analysis Results</h2>
                    
                    {/* Original Problem */}
                    <div className="result-card">
                        <h3>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="section-icon">
                                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                            </svg>
                            Original Problem
                        </h3>
                        <div className="problem-display">
                            {results.parsedContent?.originalProblem || 'Could not identify problem'}
                        </div>
                        {results.parsedContent?.givenInformation && (
                            <div className="given-info">
                                <h4>Given Information:</h4>
                                <p>{results.parsedContent.givenInformation}</p>
                            </div>
                        )}
                    </div>

                    {/* Student's Solution */}
                    <div className="result-card">
                        <h3>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="section-icon">
                                <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
                            </svg>
                            Your Solution
                        </h3>
                        <div className="solution-display">
                            {results.parsedContent?.studentSolution ? (
                                <div className="student-work">
                                    {results.parsedContent.studentSolution}
                                </div>
                            ) : (
                                <div className="no-solution">
                                    <p>No solution attempt detected in the uploaded image.</p>
                                    <small>The AI will help you get started with solving this problem.</small>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Correct Solution */}
                    <div className="result-card">
                        <h3>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="section-icon">
                                <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                            </svg>
                            Correct Solution
                        </h3>
                        <div className="wolfram-solution">
                            {results.wolframSolution ? (
                                <pre>{results.wolframSolution}</pre>
                            ) : (
                                <p>Wolfram Alpha solution not available for this problem type.</p>
                            )}
                        </div>
                    </div>

                    {/* AI Analysis */}
                    <div className={`result-card error-analysis ${getErrorTypeStyle(results.analysis?.errorType)}`}>
                        <h3>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="section-icon">
                                <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z" />
                            </svg>
                            AI Analysis
                        </h3>
                        
                        <div className="analysis-header">
                            <div className="error-type">
                                <strong>Assessment:</strong>{' '}
                                <span className={`badge ${getErrorTypeStyle(results.analysis?.errorType)}`}>
                                    {results.analysis?.errorType?.replace('_', ' ') || 'Unknown'}
                                </span>
                            </div>
                            <div className="topic-info">
                                <strong>Topic:</strong> {results.analysis?.topic || 'Unknown'}
                                {results.analysis?.subtopic && (
                                    <span> - {results.analysis.subtopic}</span>
                                )}
                            </div>
                            <div className="difficulty">
                                <strong>Level:</strong> {results.analysis?.difficultyLevel || 'Unknown'}
                            </div>
                        </div>

                        <div className="analysis-content">
                            <div className="explanation">
                                <h4>Explanation:</h4>
                                <p>{results.analysis?.explanation || 'No analysis available'}</p>
                            </div>
                            
                            {results.analysis?.errorDescription && (
                                <div className="error-details">
                                    <h4>Error Details:</h4>
                                    <p>{results.analysis.errorDescription}</p>
                                </div>
                            )}
                            
                            {results.analysis?.hints && (
                                <div className="hints">
                                    <h4>Hints for Improvement:</h4>
                                    <p>{results.analysis.hints}</p>
                                </div>
                            )}
                            
                            {results.analysis?.correctApproach && (
                                <div className="correct-approach">
                                    <h4>Recommended Approach:</h4>
                                    <p>{results.analysis.correctApproach}</p>
                                </div>
                            )}
                        </div>

                        <div className="confidence-score">
                            <small>
                                Analysis Confidence: {results.analysis?.confidenceScore ? 
                                    (results.analysis.confidenceScore * 100).toFixed(1) : 0}%
                            </small>
                        </div>
                    </div>

                    <div className="action-buttons">
                        <button 
                            onClick={() => {
                                setResults(null);
                                setImageUrl('');
                            }}
                            className="secondary-btn"
                        >
                            Analyze Another Problem
                        </button>
                        <a href="/dashboard" className="primary-btn">
                            View Dashboard
                        </a>
                    </div>
                </div>
            )}

            <div className="features-section">
                <h2>How It Works</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M4,4H7L9,2H15L17,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9Z" />
                            </svg>
                        </div>
                        <h3>Upload Files</h3>
                        <p>Upload images or PDF files of your math work for analysis</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z" />
                            </svg>
                        </div>
                        <h3>AI Analysis</h3>
                        <p>Advanced AI reads and analyzes your solution</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                            </svg>
                        </div>
                        <h3>Get Feedback</h3>
                        <p>Receive detailed feedback on errors and improvements</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22,21H2V3H4V19H6V10H10V19H12V6H16V19H18V14H22V21Z" />
                            </svg>
                        </div>
                        <h3>Track Progress</h3>
                        <p>Monitor your learning progress and error patterns</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;