'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

interface FileItem { file: File; path: string; }

export default function PdfPage() {
  const [activeTab, setActiveTab] = useState<'generate' | 'extract'>('generate');
  const [generateFiles, setGenerateFiles] = useState<FileItem[]>([]);
  const [outputName, setOutputName] = useState('output.pdf');
  const [includeSubdirs, setIncludeSubdirs] = useState(true);
  const [progress, setProgress] = useState({ msg: '', type: 'info', show: false });
  const [extractedText, setExtractedText] = useState('');
  const [extractProgress, setExtractProgress] = useState({ msg: '', type: 'info', show: false });
  const dropGenRef = useRef<HTMLDivElement>(null);
  const dropExtRef = useRef<HTMLDivElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const traverseEntry = (entry: any): Promise<File[]> => {
    return new Promise((resolve) => {
      if (entry.isFile) {
        entry.file((file: File) => {
          (file as any).customRelativePath = entry.fullPath.replace(/^\//, '');
          resolve([file]);
        });
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        reader.readEntries((entries: any[]) => {
          Promise.all(entries.map((e: any) => traverseEntry(e))).then((results) => resolve(results.flat()));
        });
      } else {
        resolve([]);
      }
    });
  };

  const handleGenerateDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dropGenRef.current?.classList.remove('dragover');
    const items = e.dataTransfer.items;
    if (items) {
      const promises: Promise<File[]>[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = (items[i] as any).webkitGetAsEntry?.();
        if (entry) promises.push(traverseEntry(entry));
      }
      Promise.all(promises).then((results) => {
        const files = results.flat();
        addGenerateFiles(files);
      });
    } else if (e.dataTransfer.files) {
      addGenerateFiles(Array.from(e.dataTransfer.files));
    }
  };

  const addGenerateFiles = (files: File[]) => {
    setGenerateFiles((prev) => {
      const existing = new Set(prev.map((f) => f.path));
      const newFiles = files
        .map((f) => ({ file: f, path: (f as any).customRelativePath || (f as any).webkitRelativePath || f.name }))
        .filter((f) => !existing.has(f.path));
      return [...prev, ...newFiles];
    });
  };

  const removeGenerateFile = (path: string) => {
    setGenerateFiles((prev) => prev.filter((f) => f.path !== path));
  };

  const generatePDF = async () => {
    const files = includeSubdirs ? generateFiles : generateFiles.filter((f) => !f.path.includes('/') && !f.path.includes('\\'));
    if (files.length === 0) {
      setProgress({ msg: 'No files selected.', type: 'error', show: true });
      return;
    }

    setProgress({ msg: 'Reading files...', type: 'info', show: true });

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 40;
      const usableW = pageW - margin * 2;
      let y = margin;

      const addText = (text: string, size = 10, style: string = 'normal') => {
        doc.setFontSize(size);
        doc.setFont('Courier', style as any);
        const lines = doc.splitTextToSize(text, usableW);
        for (const line of lines) {
          if (y + size > pageH - margin) { doc.addPage(); y = margin; }
          doc.text(line, margin, y);
          y += size * 0.35 + 4;
        }
      };

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setProgress({ msg: `Processing ${f.path} (${i + 1}/${files.length})...`, type: 'info', show: true });
        const content = await f.file.text();
        if (y + 40 > pageH - margin) { doc.addPage(); y = margin; }
        (doc as any).setFillColor(74, 108, 247);
        doc.rect(margin - 4, y - 6, usableW + 8, 24, 'F');
        doc.setTextColor(255, 255, 255);
        addText(`File: ${f.path}`, 11, 'bold');
        y += 4;
        doc.setTextColor(0, 0, 0);
        (doc as any).setDrawColor(200, 200, 200);
        doc.line(margin, y, pageW - margin, y);
        y += 8;
        addText(content || '(empty file)', 8);
        y += 12;
      }

      doc.save(outputName || 'output.pdf');
      setProgress({ msg: `PDF saved as "${outputName}" with ${files.length} files.`, type: 'success', show: true });
    } catch (err: any) {
      setProgress({ msg: `Error: ${err.message}`, type: 'error', show: true });
    }
  };

  const handleExtractDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dropExtRef.current?.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') handleExtractFile(file);
    else setExtractProgress({ msg: 'Please drop a PDF file.', type: 'error', show: true });
  };

  const handleExtractFile = async (file: File) => {
    setExtractProgress({ msg: `Loading "${file.name}"...`, type: 'info', show: true });
    setExtractedText('');

    try {
      const pdfjsLib = await import('pdfjs-dist');
      (pdfjsLib as any).GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const buf = await file.arrayBuffer();
      const pdf = await (pdfjsLib as any).getDocument({ data: buf }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        setExtractProgress({ msg: `Extracting page ${i}/${pdf.numPages}...`, type: 'info', show: true });
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item: any) => item.str).join(' ') + '\n\n';
      }
      setExtractedText(fullText.trim());
      setExtractProgress({ msg: `Extracted ${pdf.numPages} page(s) from "${file.name}".`, type: 'success', show: true });
    } catch (err: any) {
      setExtractProgress({ msg: `Error: ${err.message}`, type: 'error', show: true });
    }
  };

  const downloadExtractedText = () => {
    if (!extractedText) return;
    const blob = new Blob([extractedText], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'extracted.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const copyExtractedText = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
  };

  const filteredGenerateFiles = includeSubdirs
    ? generateFiles
    : generateFiles.filter((f) => !f.path.includes('/') && !f.path.includes('\\'));

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', color: '#1a1a2e', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ textAlign: 'center', marginBottom: 8, fontSize: '2rem' }}>PDF Tool</h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: 32 }}>Generate PDFs from your files & extract text from existing PDFs</p>

        <div style={{ display: 'flex', background: '#e2e5ec', borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
          {(['generate', 'extract'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: 14, textAlign: 'center', cursor: 'pointer', fontWeight: 600,
                border: 'none', background: activeTab === tab ? '#fff' : 'transparent',
                color: activeTab === tab ? '#1a1a2e' : '#555', fontSize: '1rem', transition: 'all 0.2s'
              }}>
              {tab === 'generate' ? 'Generate PDF' : 'Extract PDF'}
            </button>
          ))}
        </div>

        {activeTab === 'generate' && (
          <div style={{ background: '#fff', padding: 32, borderRadius: '0 0 12px 12px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <h2 style={{ marginBottom: 20, fontSize: '1.3rem' }}>Generate PDF from Files</h2>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
              <label style={{ fontSize: '0.9rem', color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                Output filename:
                <input type="text" value={outputName} onChange={(e) => setOutputName(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #d0d4dd', borderRadius: 6, fontSize: '0.9rem', width: 160 }} />
              </label>
              <label style={{ fontSize: '0.9rem', color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={includeSubdirs} onChange={(e) => setIncludeSubdirs(e.target.checked)}
                  style={{ width: 16, height: 16 }} /> Include subdirectories
              </label>
            </div>

            <div ref={dropGenRef}
              onDragOver={(e) => { e.preventDefault(); dropGenRef.current?.classList.add('dragover'); }}
              onDragLeave={() => dropGenRef.current?.classList.remove('dragover')}
              onDrop={handleGenerateDrop}
              onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.multiple = true; (input as any).webkitdirectory = true; input.onchange = () => input.files && addGenerateFiles(Array.from(input.files)); input.click(); }}
              style={{
                border: '2px dashed #c0c4cc', borderRadius: 10, padding: '40px 20px', textAlign: 'center',
                cursor: 'pointer', transition: 'all 0.2s', marginBottom: 20, background: '#fafbfc'
              }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>&#128196;</div>
              <p style={{ color: '#888', fontSize: '0.95rem' }}><strong>Click to select</strong> or drag & drop files here</p>
              <p style={{ marginTop: 6, fontSize: '0.85rem', color: '#aaa' }}>Accepts any file type</p>
            </div>

            <ul style={{ listStyle: 'none', marginBottom: 20 }}>
              {filteredGenerateFiles.map((f) => (
                <li key={f.path} style={{ padding: '8px 12px', background: '#f5f7fa', borderRadius: 6, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                  <span>{f.path} <span style={{ color: '#888', fontSize: '0.8rem' }}>({formatSize(f.file.size)})</span></span>
                  <button onClick={() => removeGenerateFile(f.path)} style={{ color: '#e74c3c', cursor: 'pointer', background: 'none', border: 'none', fontSize: '1rem' }}>&times;</button>
                </li>
              ))}
            </ul>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <button onClick={() => setGenerateFiles([])} style={{ padding: '6px 14px', fontSize: '0.85rem', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Clear All</button>
              <button onClick={generatePDF} style={{ padding: '12px 28px', background: '#4a6cf7', color: '#fff', border: 'none', borderRadius: 8, fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}>Generate PDF</button>
            </div>

            {progress.show && (
              <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: progress.type === 'error' ? '#fde8e8' : progress.type === 'success' ? '#e6f9ed' : '#e8f0fe', color: progress.type === 'error' ? '#b91c1c' : progress.type === 'success' ? '#1a7a3a' : '#1a5cc8' }}>
                {progress.msg}
              </div>
            )}
          </div>
        )}

        {activeTab === 'extract' && (
          <div style={{ background: '#fff', padding: 32, borderRadius: '0 0 12px 12px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <h2 style={{ marginBottom: 20, fontSize: '1.3rem' }}>Extract Text from PDF</h2>

            <div ref={dropExtRef}
              onDragOver={(e) => { e.preventDefault(); dropExtRef.current?.classList.add('dragover'); }}
              onDragLeave={() => dropExtRef.current?.classList.remove('dragover')}
              onDrop={handleExtractDrop}
              onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = '.pdf,application/pdf'; input.onchange = () => input.files?.[0] && handleExtractFile(input.files[0]); input.click(); }}
              style={{
                border: '2px dashed #c0c4cc', borderRadius: 10, padding: '40px 20px', textAlign: 'center',
                cursor: 'pointer', transition: 'all 0.2s', marginBottom: 20, background: '#fafbfc'
              }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>&#128462;</div>
              <p style={{ color: '#888', fontSize: '0.95rem' }}><strong>Click to select</strong> or drag & drop a PDF file here</p>
            </div>

            {extractProgress.show && (
              <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 16, background: extractProgress.type === 'error' ? '#fde8e8' : extractProgress.type === 'success' ? '#e6f9ed' : '#e8f0fe', color: extractProgress.type === 'error' ? '#b91c1c' : extractProgress.type === 'success' ? '#1a7a3a' : '#1a5cc8' }}>
                {extractProgress.msg}
              </div>
            )}

            {extractedText && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 6 }}>
                  <label style={{ fontWeight: 600, fontSize: '0.95rem' }}>Extracted Text:</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={downloadExtractedText} style={{ padding: '6px 14px', fontSize: '0.85rem', background: '#2ecc71', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Download .txt</button>
                    <button onClick={copyExtractedText} style={{ padding: '6px 14px', fontSize: '0.85rem', background: '#4a6cf7', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Copy to Clipboard</button>
                  </div>
                </div>
                <textarea readOnly value={extractedText} style={{ width: '100%', minHeight: 200, padding: 12, border: '1px solid #d0d4dd', borderRadius: 8, fontFamily: 'Courier New, monospace', fontSize: '0.85rem', resize: 'vertical', marginTop: 12 }} />
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link href="/" style={{ color: '#888', fontSize: 14, textDecoration: 'none' }}>&larr; Back to Portfolio</Link>
        </div>
      </div>
    </div>
  );
}
