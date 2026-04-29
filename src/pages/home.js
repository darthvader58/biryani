import React, { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import Webcam from 'react-webcam';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import toast, { Toaster } from 'react-hot-toast';
import katex from 'katex';
import '../styles/home.css';

try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
} catch (e) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const STEPS = ['Method', 'Input', 'Review', 'Results'];

const METHODS = [
    {
        id: 'file',
        label: 'Upload File',
        desc: 'JPG, PNG or PDF — OCR extracts text automatically',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            </svg>
        ),
    },
    {
        id: 'camera',
        label: 'Camera',
        desc: 'Capture your homework with your device camera',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4,4H7L9,2H15L17,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9Z" />
            </svg>
        ),
    },
    {
        id: 'text',
        label: 'Type / Paste',
        desc: 'Enter the problem and your solution as text',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm21.41-16.9c-.39-.39-1.02-.39-1.41 0l-2.34 2.34 3.75 3.75 2.34-2.34c.39-.39.39-1.02 0-1.41l-2.34-2.34z" />
            </svg>
        ),
    },
    {
        id: 'separate',
        label: 'Separate Files',
        desc: 'Upload the problem and your solution separately',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8,3A2,2 0 0,0 6,5V9A2,2 0 0,1 4,11H3V13H4A2,2 0 0,1 6,15V19A2,2 0 0,0 8,21H10V19H8V14A2,2 0 0,0 6,12A2,2 0 0,0 8,10V5H10V3M16,3A2,2 0 0,1 18,5V9A2,2 0 0,0 20,11H21V13H20A2,2 0 0,0 18,15V19A2,2 0 0,1 16,21H14V19H16V14A2,2 0 0,1 18,12A2,2 0 0,1 16,10V5H14V3H16Z" />
            </svg>
        ),
    },
];

/* KaTeX block helper (gracefully falls back to plain text) */
const KMath = ({ tex, displayMode = false }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (!ref.current || !tex) return;
        try {
            katex.render(String(tex), ref.current, { throwOnError: false, displayMode });
        } catch (e) {
            ref.current.textContent = String(tex);
        }
    }, [tex, displayMode]);
    return <span ref={ref} />;
};

/* Step indicator — Edtech variant (progress bar) */
const StepIndicator = ({ step }) => {
    const pct = Math.round((step / (STEPS.length - 1)) * 100);
    return (
        <div className="step-wrap">
            <div className="step-top">
                <span className="step-current">{STEPS[step]}</span>
                <span className="step-count">{step + 1} / {STEPS.length}</span>
            </div>
            <div className="step-track">
                <div className="step-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="step-labels">
                {STEPS.map((label, i) => (
                    <span
                        key={label}
                        className={`step-label ${i < step ? 'is-done' : ''} ${i === step ? 'is-active' : ''}`}
                    >
                        {label}
                    </span>
                ))}
            </div>
        </div>
    );
};

/* PDF text extraction */
const extractTextFromPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        verbosity: 0,
        cMapUrl: 'https://unpkg.com/pdfjs-dist@5.4.449/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@5.4.449/standard_fonts/'
    });
    const pdf = await loadingTask.promise;
    let fullText = '';
    const maxPages = Math.min(pdf.numPages, 10);
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        try {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item) => (typeof item === 'string' ? item : item.str || ''))
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
            if (pageText) {
                fullText += (fullText ? `\n\n--- Page ${pageNum} ---\n` : '') + pageText;
            }
        } catch (e) {
            /* skip page */
        }
    }
    if (!fullText.trim() || fullText.trim().length < 10) {
        throw new Error('No readable text found in PDF. This may be a scanned document — try uploading as an image instead.');
    }
    return fullText.trim();
};

const Home = ({ user }) => {
    /* Wizard state */
    const [step, setStep] = useState(0);
    const [method, setMethod] = useState(null);

    /* Input state */
    const [extractedText, setExtractedText] = useState('');
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [problemText, setProblemText] = useState('');
    const [solutionText, setSolutionText] = useState('');
    const [problemFiles, setProblemFiles] = useState([]);
    const [solutionFiles, setSolutionFiles] = useState([]);
    const [showCamera, setShowCamera] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);

    /* Status */
    const [ocrLoading, setOcrLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [results, setResults] = useState(null);

    const webcamRef = useRef(null);

    const reset = () => {
        setStep(0);
        setMethod(null);
        setExtractedText('');
        setUploadedFiles([]);
        setProblemText('');
        setSolutionText('');
        setProblemFiles([]);
        setSolutionFiles([]);
        setShowCamera(false);
        setCapturedImage(null);
        setResults(null);
        setError('');
    };

    /* ---------- File upload ---------- */
    const onDrop = useCallback(async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setExtractedText('');
        setUploadedFiles((prev) => [...prev, file]);
        setOcrLoading(true);
        setError('');
        const isPDF = file.type === 'application/pdf';
        toast.loading(isPDF ? 'Processing PDF…' : 'Extracting text…');

        try {
            let text;
            if (isPDF) {
                text = await extractTextFromPDF(file);
                toast.dismiss();
                toast.success('PDF text extracted');
            } else {
                const result = await Tesseract.recognize(file, 'eng');
                text = result.data.text;
                toast.dismiss();
                toast.success('Text extracted with OCR');
            }
            setExtractedText(text);
        } catch (err) {
            toast.dismiss();
            toast.error(err.message || 'Failed to extract text');
            setError(err.message || 'Failed to extract text');
        } finally {
            setOcrLoading(false);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp'],
            'application/pdf': ['.pdf'],
        },
        multiple: true,
    });

    /* ---------- Camera ---------- */
    const startCamera = () => {
        setShowCamera(true);
        setCapturedImage(null);
    };
    const closeCamera = () => setShowCamera(false);

    const capturePhoto = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (!imageSrc) return;
        fetch(imageSrc)
            .then((res) => res.blob())
            .then((blob) => {
                const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                setCapturedImage(imageSrc);
                setUploadedFiles((prev) => [...prev, file]);
                setShowCamera(false);
                setOcrLoading(true);
                toast.loading('Extracting text from captured image…');
                Tesseract.recognize(file, 'eng')
                    .then((result) => {
                        setExtractedText((prev) =>
                            prev ? `${prev}\n\n--- From Camera ---\n${result.data.text}` : result.data.text
                        );
                        toast.dismiss();
                        toast.success('Text extracted!');
                    })
                    .catch((err) => {
                        toast.dismiss();
                        toast.error('OCR failed');
                        setError(err.message || 'OCR failed');
                    })
                    .finally(() => setOcrLoading(false));
            });
    }, []);

    /* ---------- Separate uploads ---------- */
    const handleSeparateUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;
        if (type === 'problem') {
            setProblemFiles([file]);
            setProblemText('');
        } else {
            setSolutionFiles([file]);
            setSolutionText('');
        }
        setOcrLoading(true);
        toast.loading(`Extracting text from ${type}…`);
        try {
            let text;
            if (file.type === 'application/pdf') {
                text = await extractTextFromPDF(file);
            } else {
                const result = await Tesseract.recognize(file, 'eng');
                text = result.data.text;
            }
            if (type === 'problem') setProblemText(text);
            else setSolutionText(text);
            toast.dismiss();
            toast.success(`${type} text extracted`);
        } catch (err) {
            toast.dismiss();
            toast.error(`Failed to extract ${type} text`);
        } finally {
            setOcrLoading(false);
        }
    };

    /* ---------- Submit ---------- */
    const handleSubmit = async () => {
        if (!user) {
            setError('Please sign in to use the problem solver');
            return;
        }

        let finalProblemText = '';
        if (method === 'file' || method === 'camera') {
            finalProblemText = extractedText;
        } else if (method === 'text') {
            finalProblemText = `${problemText}\n\n${solutionText}`.trim();
        } else if (method === 'separate') {
            finalProblemText = `PROBLEM: ${problemText}\n\nSOLUTION: ${solutionText}`;
        }

        if (!finalProblemText.trim()) {
            setError('Please provide problem text or upload files');
            return;
        }

        setLoading(true);
        setError('');
        setResults(null);
        toast.loading('Analyzing your problem…');

        try {
            const apiUploadMethod = method === 'text' ? 'url' : method;
            const payload = {
                userEmail: user.email,
                problemText: finalProblemText,
                uploadMethod: apiUploadMethod,
                imageUrl: null,
                separateProblem: method === 'separate' ? problemText : null,
                separateSolution: method === 'separate' ? solutionText : null,
            };
            const response = await axios.post('/api/analyze-problem', payload);
            setResults(response.data);
            toast.dismiss();
            toast.success('Analysis complete');
            setStep(3);
        } catch (err) {
            setError('Failed to analyze problem. Please try again.');
            toast.dismiss();
            toast.error('Analysis failed');
        } finally {
            setLoading(false);
        }
    };

    /* ---------- Validation per step ---------- */
    const canContinueFromInput = () => {
        if (method === 'file' || method === 'camera') return !!extractedText.trim();
        if (method === 'text') return !!problemText.trim() && !!solutionText.trim();
        if (method === 'separate') return !!problemText.trim() && !!solutionText.trim();
        return false;
    };

    const reviewText =
        method === 'separate'
            ? `PROBLEM:\n${problemText}\n\nSOLUTION:\n${solutionText}`
            : method === 'text'
            ? `${problemText}\n\n${solutionText}`
            : extractedText;

    const setReviewText = (val) => {
        if (method === 'separate' || method === 'text') {
            /* Preserve combined edits as a single solution-side string */
            setSolutionText(val);
            setProblemText('');
        } else {
            setExtractedText(val);
        }
    };

    return (
        <div className="page">
            <StepIndicator step={step} />

            {/* ---------- STEP 0 — METHOD ---------- */}
            {step === 0 && (
                <div className="fade-up">
                    <div className="page-head">
                        <span className="eyebrow">Step 1</span>
                        <h1 className="page-title">How are you submitting your work?</h1>
                        <p className="page-sub">Choose the input method that works best for you.</p>
                    </div>

                    <div className="method-grid">
                        {METHODS.map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                className={`method-card ${method === m.id ? 'is-selected' : ''}`}
                                onClick={() => setMethod(m.id)}
                            >
                                <div className="method-icon">{m.icon}</div>
                                <div>
                                    <div className="method-title">{m.label}</div>
                                    <div className="method-desc">{m.desc}</div>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="step-actions">
                        <button
                            type="button"
                            className="btn btn-primary btn-lg"
                            disabled={!method}
                            onClick={() => setStep(1)}
                        >
                            Continue
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* ---------- STEP 1 — INPUT ---------- */}
            {step === 1 && (
                <div className="fade-up">
                    <div className="page-head">
                        <span className="eyebrow">Step 2</span>
                        <h1 className="page-title">
                            {method === 'file' && 'Upload your homework'}
                            {method === 'camera' && 'Capture with camera'}
                            {method === 'text' && 'Enter your problem'}
                            {method === 'separate' && 'Upload problem & solution'}
                        </h1>
                    </div>

                    {method === 'file' && (
                        <>
                            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'is-active' : ''}`}>
                                <input {...getInputProps()} />
                                {uploadedFiles.length > 0 && !ocrLoading ? (
                                    <div className="dz-files">
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--green)">
                                            <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                                        </svg>
                                        <span className="dz-files-name">
                                            {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} uploaded
                                        </span>
                                        <span className="dz-files-sub">Click to add more · drop to replace</span>
                                    </div>
                                ) : ocrLoading ? (
                                    <div className="dz-files">
                                        <div className="spinner" />
                                        <span className="dz-files-sub">Extracting text via OCR…</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="dz-icon">
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                            </svg>
                                        </div>
                                        <div className="dz-title">Drag &amp; drop or click to upload</div>
                                        <div className="dz-sub">JPG, PNG, GIF, BMP, PDF — up to 10 MB</div>
                                    </>
                                )}
                            </div>

                            {extractedText && !ocrLoading && (
                                <div className="form-row">
                                    <label className="form-label">Extracted text — edit if needed</label>
                                    <textarea
                                        className="form-textarea"
                                        rows={6}
                                        value={extractedText}
                                        onChange={(e) => setExtractedText(e.target.value)}
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {method === 'camera' && (
                        <div className="camera-block">
                            <div className="camera-frame">
                                {showCamera ? (
                                    <Webcam
                                        audio={false}
                                        ref={webcamRef}
                                        screenshotFormat="image/jpeg"
                                        videoConstraints={{ width: 1280, height: 720, facingMode: 'environment' }}
                                        style={{ width: '100%', display: 'block' }}
                                    />
                                ) : capturedImage ? (
                                    <img src={capturedImage} alt="Captured" style={{ width: '100%', display: 'block' }} />
                                ) : (
                                    <div className="camera-placeholder">
                                        <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M4,4H7L9,2H15L17,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9Z" />
                                        </svg>
                                        <span>Camera preview (device required)</span>
                                    </div>
                                )}
                            </div>
                            <div className="camera-controls">
                                {!showCamera && !capturedImage && (
                                    <button type="button" className="btn btn-primary" onClick={startCamera}>
                                        Start Camera
                                    </button>
                                )}
                                {showCamera && (
                                    <>
                                        <button type="button" className="btn btn-primary" onClick={capturePhoto}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                <circle cx="12" cy="12" r="8" />
                                            </svg>
                                            Capture
                                        </button>
                                        <button type="button" className="btn btn-ghost btn-sm" onClick={closeCamera}>
                                            Cancel
                                        </button>
                                    </>
                                )}
                                {capturedImage && (
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={startCamera}>
                                        Retake
                                    </button>
                                )}
                            </div>
                            {ocrLoading && (
                                <div className="inline-status">
                                    <div className="spinner" /> Extracting text from image…
                                </div>
                            )}
                            {extractedText && !ocrLoading && (
                                <div className="form-row">
                                    <label className="form-label">Extracted text</label>
                                    <textarea
                                        className="form-textarea"
                                        rows={6}
                                        value={extractedText}
                                        onChange={(e) => setExtractedText(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {method === 'text' && (
                        <div className="form-stack">
                            <div className="form-row">
                                <label className="form-label">Problem statement</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="e.g. Find the derivative of f(x) = x³ + 2x² − 5x"
                                    rows={3}
                                    style={{ minHeight: 80 }}
                                    value={problemText}
                                    onChange={(e) => setProblemText(e.target.value)}
                                />
                            </div>
                            <div className="form-row">
                                <label className="form-label">Your solution</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="Show your working here…"
                                    rows={5}
                                    value={solutionText}
                                    onChange={(e) => setSolutionText(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {method === 'separate' && (
                        <div className="separate-grid">
                            {[
                                { key: 'problem', title: 'Problem Statement', files: problemFiles, setFiles: setProblemFiles, text: problemText, setText: setProblemText },
                                { key: 'solution', title: 'Your Solution', files: solutionFiles, setFiles: setSolutionFiles, text: solutionText, setText: setSolutionText },
                            ].map((box) => (
                                <div key={box.key} className="separate-card">
                                    <div className="separate-title">{box.title}</div>
                                    <label className="separate-drop">
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            onChange={(e) => handleSeparateUpload(e, box.key)}
                                            style={{ display: 'none' }}
                                        />
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                        </svg>
                                        <span>Click to upload image or PDF</span>
                                    </label>
                                    {box.files.length > 0 && (
                                        <div className="separate-file-tag">
                                            {box.files[0].name}
                                            <button type="button" onClick={() => box.setFiles([])}>×</button>
                                        </div>
                                    )}
                                    <textarea
                                        className="form-textarea"
                                        placeholder={`Or type the ${box.key}…`}
                                        rows={3}
                                        style={{ minHeight: 80 }}
                                        value={box.text}
                                        onChange={(e) => box.setText(e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {error && <div className="error-message">{error}</div>}

                    <div className="step-actions">
                        <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}>
                            Back
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary btn-lg"
                            disabled={!canContinueFromInput() || ocrLoading}
                            onClick={() => setStep(2)}
                        >
                            Continue
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* ---------- STEP 2 — REVIEW ---------- */}
            {step === 2 && (
                <div className="fade-up">
                    <div className="page-head">
                        <span className="eyebrow">Step 3</span>
                        <h1 className="page-title">Review your work</h1>
                        <p className="page-sub">Check that the text looks correct before analysis — edit it directly if needed.</p>
                    </div>

                    <div className="card card-lg">
                        <div className="card-row-between">
                            <label className="form-label">Extracted content</label>
                            <span className="word-count">
                                {(reviewText || '').trim().split(/\s+/).filter(Boolean).length} words
                            </span>
                        </div>
                        <textarea
                            className="form-textarea"
                            rows={9}
                            style={{ minHeight: 200 }}
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                        />
                        <div className="tip-box">
                            <strong>Tip:</strong> Make sure both the problem statement and your solution are clearly included for the best analysis.
                        </div>
                    </div>

                    {error && <div className="error-message">{error}</div>}
                    {!user && (
                        <div className="error-message" style={{ marginTop: 14 }}>
                            Please <a href="/signin" style={{ color: 'var(--green)' }}>sign in</a> to analyze your problem.
                        </div>
                    )}

                    <div className="step-actions">
                        <button type="button" className="btn btn-ghost" onClick={() => setStep(1)} disabled={loading}>
                            Back
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary btn-lg"
                            disabled={loading || !reviewText.trim() || !user}
                            onClick={handleSubmit}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner" /> Analyzing…
                                </>
                            ) : (
                                <>
                                    Analyze with AI
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* ---------- STEP 3 — RESULTS ---------- */}
            {step === 3 && results && <ResultsView results={results} onReset={reset} />}
            {step === 3 && !results && (
                <div className="results-loading">
                    <div className="spinner spinner-lg" />
                    <div className="results-loading-title">Analyzing your work…</div>
                    <div className="results-loading-sub">GPT-4 · Wolfram Alpha</div>
                </div>
            )}

            <Toaster position="top-right" />
        </div>
    );
};

/* ---------- Results view ---------- */
const ResultsView = ({ results, onReset }) => {
    const errorType = results.analysis?.errorType || 'unknown';
    const isCorrect = errorType.includes('no_error') || errorType.includes('no error');
    const isComputational = errorType.includes('computational') || errorType.includes('calculation');
    const isConceptual = errorType.includes('conceptual');
    const badgeClass = isCorrect ? 'rb-ok' : isComputational ? 'rb-err' : isConceptual ? 'rb-warn' : 'rb-info';
    const badgeLabel = isCorrect
        ? '✓ Correct'
        : isComputational
        ? 'Computational Error'
        : isConceptual
        ? 'Conceptual Error'
        : (errorType || 'Analysis');
    const accentColor = isCorrect ? 'var(--green)' : isComputational ? 'var(--red)' : isConceptual ? 'var(--amber)' : 'var(--blue)';
    const confidence = results.analysis?.confidenceScore ? Math.round(results.analysis.confidenceScore * 100) : null;

    return (
        <div className="fade-up">
            <div className="results-head">
                <div>
                    <span className="eyebrow">Results</span>
                    <h1 className="page-title">Analysis Complete</h1>
                </div>
                <span className={`result-badge ${badgeClass}`}>{badgeLabel}</span>
            </div>

            <div className="results-stack">
                {/* Original problem */}
                <div className="card">
                    <div className="card-head">
                        <div className="card-accent" style={{ background: 'var(--t3)' }} />
                        <span className="card-label">Original Problem</span>
                        {results.analysis?.topic && <span className="card-tag">{results.analysis.topic}</span>}
                    </div>
                    <div className="math-wrap">
                        <KMath tex={results.parsedContent?.originalProblem || 'Could not identify problem'} displayMode />
                    </div>
                    {results.parsedContent?.givenInformation && (
                        <div className="card-extra">
                            <div className="analysis-lbl">Given</div>
                            <div className="analysis-txt">{results.parsedContent.givenInformation}</div>
                        </div>
                    )}
                </div>

                {/* Two columns: student vs wolfram */}
                <div className="results-twocol">
                    <div className="card">
                        <div className="card-head">
                            <div className="card-accent" style={{ background: 'var(--blue)' }} />
                            <span className="card-label">Your Solution</span>
                        </div>
                        {results.parsedContent?.studentSolution ? (
                            <div className="math-wrap">
                                <KMath tex={results.parsedContent.studentSolution} displayMode />
                            </div>
                        ) : (
                            <div className="empty-state">No solution attempt detected.</div>
                        )}
                    </div>

                    <div className="card">
                        <div className="card-head">
                            <div className="card-accent" style={{ background: 'var(--green)' }} />
                            <span className="card-label">Correct Solution</span>
                            <span className="card-tag">Wolfram</span>
                        </div>
                        {results.wolframSolution ? (
                            <div className="math-wrap">
                                <KMath tex={results.wolframSolution} displayMode />
                            </div>
                        ) : (
                            <div className="empty-state">Wolfram Alpha solution not available.</div>
                        )}
                    </div>
                </div>

                {/* AI Analysis */}
                <div className="card" style={{ borderColor: accentColor + '33' }}>
                    <div className="card-head">
                        <div className="card-accent" style={{ background: accentColor }} />
                        <span className="card-label">AI Feedback</span>
                        <span className="card-tag" style={{ color: 'var(--green)' }}>GPT-4</span>
                    </div>

                    {results.analysis?.explanation && (
                        <div className="analysis-block">
                            <div className="analysis-lbl">Assessment</div>
                            <div className="analysis-txt">{results.analysis.explanation}</div>
                        </div>
                    )}

                    {results.analysis?.errorDescription && (
                        <div className="analysis-block">
                            <div className="analysis-lbl">Error Details</div>
                            <div className="analysis-txt">{results.analysis.errorDescription}</div>
                        </div>
                    )}

                    {results.analysis?.hints && (
                        <div className="analysis-block">
                            <div className="analysis-lbl">Hint</div>
                            <div className="analysis-txt">{results.analysis.hints}</div>
                        </div>
                    )}

                    {results.analysis?.correctApproach && (
                        <div className="analysis-block">
                            <div className="analysis-lbl">Recommended Approach</div>
                            <div className="analysis-txt">{results.analysis.correctApproach}</div>
                        </div>
                    )}

                    {confidence !== null && (
                        <div className="conf-bar-wrap">
                            <div className="conf-bar-labels">
                                <span>Confidence</span>
                                <span>{confidence}%</span>
                            </div>
                            <div className="conf-bar-track">
                                <div className="conf-bar-fill" style={{ width: `${confidence}%` }} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="results-actions">
                <button type="button" className="btn btn-primary" onClick={onReset}>
                    Analyze Another
                </button>
                <a href="/dashboard" className="btn btn-secondary">
                    View Dashboard
                </a>
            </div>
        </div>
    );
};

export default Home;
