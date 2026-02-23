import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure the worker explicitly using Vite's URL import.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export const extractTextFromPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        // Join items with SPACE to preserve readable text flow
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + ' ';
    }

    // Normalize whitespace
    fullText = fullText.replace(/\s+/g, ' ').trim();

    // Remove section/page headers like "Grade 3 ! 4 !" or "Grade Pre-2 ! 6 !"
    fullText = fullText.replace(/Grade\s+(?:Pre-)?\d+\s*!\s*\d+\s*!/g, ' ');
    fullText = fullText.replace(/\s+/g, ' ').trim();

    return parseQuestions(fullText);
};

function parseQuestions(text) {
    // Find all ( number ) markers — these are question numbers in Eiken format
    const markerRegex = /\(\s*(\d+)\s*\)/g;
    const markers = [];
    let match;

    while ((match = markerRegex.exec(text)) !== null) {
        markers.push({
            start: match.index,
            end: match.index + match[0].length,
            number: parseInt(match[1]),
            raw: `(${match[1]})`
        });
    }

    // Extract content between consecutive markers
    const rawQuestions = [];

    for (let i = 0; i < markers.length; i++) {
        const marker = markers[i];
        const next = markers[i + 1];
        const contentEnd = next ? next.start : text.length;
        const content = text.substring(marker.end, contentEnd).trim();

        // Skip very short content — answer-sheet artifacts
        if (content.length < 40) continue;

        // Skip answer-sheet patterns like "( ) 1 2 3 4" or "1 2 3 4 N"
        if (/^\(\s*\)\s*1\s+2\s+3\s+4/.test(content)) continue;
        if (/^1\s+2\s+3\s+4\s+\d/.test(content)) continue;

        // Generate a clean snippet for UI display
        let snippet = content;
        // Remove leading dialog markers like "A :", "Boy :", "Man 1 :", etc.
        snippet = snippet.replace(/^[A-Za-z]+\s*\d*\s*:\s*/, '');
        snippet = snippet.trim();
        snippet = snippet.length > 70 ? snippet.substring(0, 70) + '...' : snippet;

        rawQuestions.push({
            number: marker.number,
            rawNumber: marker.raw,
            snippet,
            contentLength: content.length,
            fullText: `${marker.raw} ${content}`
        });
    }

    // Deduplicate: if same question number appears multiple times,
    // keep the version with the longest content (most complete)
    const seen = new Map();
    for (const q of rawQuestions) {
        if (!seen.has(q.number) || seen.get(q.number).contentLength < q.contentLength) {
            seen.set(q.number, q);
        }
    }

    // Sort by question number and assign IDs
    return [...seen.values()]
        .sort((a, b) => a.number - b.number)
        .map((q, i) => ({
            id: `q-${i + 1}`,
            rawNumber: q.rawNumber,
            snippet: q.snippet,
            fullText: q.fullText
        }));
}
