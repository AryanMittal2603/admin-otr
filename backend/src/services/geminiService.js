/**
 * Gemini AI Service — analyzes call recordings.
 *
 * Flow: stream audio URL → pipe directly into Gemini Files API upload
 *       (no temp file, no full download into memory first)
 *       → generateContent with returned file URI → cleanup.
 */

// ─── Categorization schema ────────────────────────────────────────────────────

const CATEGORIZATION_SCHEMA = {
  "Candidate Verification": [
    "Admit Card", "Admit Card error", "Admit Card has to be Scanned or Not",
    "ID Verification Issue", "KYC Issue"
  ],
  "Biometric & Entry": [
    "Device Malfunction (Biometric)", "Devices Insufficient (Biometric)",
    "Devices Ready or Not (Biometric)", "Biometric Confirmation (Entry/Exit)",
    "Exit Biometric Confirmation", "Biometric Left of a Student", "Face Mismatch Biometric"
  ],
  "Manpower & Frisking": [
    "Manpower Issue (General)", "Manpower Absent",
    "Manpower Unable to Perform Biometric Properly", "No Female Manpower for Frisking",
    "Female frisking in open", "Invigilators insufficient",
    "Invigilator not Present in Exam Room", "Operator absent (Technical)"
  ],
  "Candidate Misconduct": [
    "Candidate Misbehaviour", "Candidate Movement", "Candidate Suspicious behaviour",
    "Candidate Wearing Unauthorized Clothing", "Candidates Peeking", "Candidates Talking"
  ],
  "Exam Logistics & Seating": [
    "Seat Change Issue", "Seat Numbers not Matching", "Entry access to be given",
    "Overcrowding at entry", "Exam Sheet is Damaged", "Exam Sheet Distribution Confirmation",
    "Room occupancy", "Candidates Still Seated"
  ],
  "Technical Issues": [
    "Candidate System Issue", "Jammer Issue", "Server Issue",
    "VOIP issue / VOIP Not Working", "Power Issue or Power Cut",
    "Exam application related query", "Candidate Login Issue", "Subject Error"
  ],
  "CCTV & Monitoring": [
    "not visible properly in camera", "proper positioning of camera",
    "setup confirmation (CCTV)", "CCTV malfunction"
  ],
  "General Enquiry (Candidate)": [
    "Additional Time Request", "Center name enquiry", "Candidate feeling unwell",
    "Candidate late arrival", "Form-related enquiry", "PH Candidate issue",
    "Scribe related query", "Washroom enquiry"
  ],
  "Invigilator Conduct": [
    "Invigilator Using Phone", "Invigilators not moving properly",
    "Invigilator Eating", "Invigilator(s) Talking"
  ],
  "SOP & Reporting (Confirmation)": [
    "Candidate Count Confirmation", "Exam Start Confirmation",
    "Data Upload Confirmation", "Exam submission confirmation", "Instruction call",
    "Verification Done Confirmation", "Hardware Received Confirmation",
    "Hardware to be Received Instruction"
  ],
  "Control Room Issues": [
    "Difficulty in reaching the person in charge", "No Content Call",
    "Language Barrier", "No. of Labs Used Count", "Wrong call",
    "Overcrowding in control room", "Entry denied (team/center staff)", "Callback Request"
  ]
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fetchWithTimeout(url, options = {}, timeoutMs = 300_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function cleanCategory(text) {
  if (!text) return text;
  return text
    .replace(/^[IVX]+\.\s*/i, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/^(Category|Type|Class|Group):\s*/i, '')
    .trim();
}

function toLanguageArray(lang) {
  if (!lang) return [];
  return Array.isArray(lang) ? lang : [lang];
}

/**
 * Stream the audio from audioUrl and pipe it directly into the Gemini Files API.
 * Returns { fileUri, fileName } on success or throws on failure.
 *
 * We use the resumable upload protocol:
 *   1. POST metadata to get an upload URL (session URI)
 *   2. PUT the raw audio bytes to that URL
 * This avoids buffering the entire file in Node memory.
 */
async function uploadAudioToGemini(audioUrl, apiKey) {
  // ── Fetch audio as a stream ───────────────────────────────────────────────
  const audioResp = await fetchWithTimeout(audioUrl, {}, 300_000);
  if (!audioResp.ok) throw new Error(`Audio fetch failed: HTTP ${audioResp.status}`);

  // Content-Length header from S3 (needed for resumable upload)
  const contentLength = audioResp.headers.get('content-length');
  const mimeType      = audioResp.headers.get('content-type') || 'audio/x-wav';

  // ── Step A: Initiate resumable upload session ─────────────────────────────
  const initResp = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}&uploadType=resumable`,
    {
      method: 'POST',
      headers: {
        'Content-Type':        'application/json',
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command':  'start',
        ...(contentLength ? { 'X-Goog-Upload-Header-Content-Length': contentLength } : {}),
        'X-Goog-Upload-Header-Content-Type': mimeType,
      },
      body: JSON.stringify({ file: { display_name: 'recording' } }),
    },
    30_000
  );

  if (!initResp.ok) {
    throw new Error(`Gemini upload init failed: ${await initResp.text()}`);
  }

  const uploadUrl = initResp.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error('No upload URL returned from Gemini');

  // ── Step B: Upload audio bytes (stream body directly) ────────────────────
  const uploadResp = await fetchWithTimeout(
    uploadUrl,
    {
      method: 'POST',
      headers: {
        'Content-Type':           mimeType,
        'X-Goog-Upload-Command':  'upload, finalize',
        ...(contentLength ? { 'X-Goog-Upload-Offset': '0', 'Content-Length': contentLength } : {}),
      },
      body: audioResp.body,   // pipe the stream directly — no buffering
      duplex: 'half',         // required for streaming request body in Node fetch
    },
    600_000  // 10 min for large files
  );

  if (!uploadResp.ok) {
    throw new Error(`Gemini upload failed: ${await uploadResp.text()}`);
  }

  const upData  = await uploadResp.json();
  const fileUri = upData?.file?.uri;
  const fileName= upData?.file?.name;

  if (!fileUri) throw new Error('No file URI returned from Gemini');
  return { fileUri, fileName };
}

// ─── Core analysis function ───────────────────────────────────────────────────

async function categorizeRecording(audioUrl, maxRetries = 3) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model  = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  if (!apiKey) return { success: false, error: 'GEMINI_API_KEY not set' };

  const startTime = Date.now();

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let fileName = null;

    try {
      if (attempt > 0) {
        const waitMs = Math.min(2 ** attempt, 5) * 1000;
        console.log(`[Gemini] Retry ${attempt + 1}/${maxRetries}, waiting ${waitMs / 1000}s`);
        await new Promise(r => setTimeout(r, waitMs));
      }

      // ── Upload (stream URL → Gemini, no local download) ──────────────────
      console.log('[Gemini] Streaming audio to Gemini...');
      const upStart = Date.now();

      const { fileUri, fileName: fn } = await uploadAudioToGemini(audioUrl, apiKey);
      fileName = fn;
      console.log(`[Gemini] Upload done in ${((Date.now() - upStart) / 1000).toFixed(1)}s`);

      // ── Generate analysis ─────────────────────────────────────────────────
      const genStart   = Date.now();
      const schemaJson = JSON.stringify(CATEGORIZATION_SCHEMA, null, 2);

      const prompt = `
You are analyzing ONE audio call recording between a Center and the Command Room.
The audio is provided as file_data in this request.

RETURN ONLY ONE VALID JSON OBJECT.
Do not include markdown, explanations, or any extra text.

TASKS:
1) Transcription:
   - Produce a full transcript with speaker differentiation.
   - Use speaker labels separated by a new line exactly like:
       "SPEAKER_1:" and "SPEAKER_2:"
   - If parts are unclear, write [inaudible].
   - Preserve mixed-language speech exactly as spoken.

2) Categorization (STRICT — MUST USE ONLY THIS SCHEMA):
   - Choose exactly ONE category and ONE sub_category from the schema below.
   - category MUST be one of the top-level keys in the schema.
   - sub_category MUST be one of the values under the chosen category.
   - Do NOT invent, paraphrase, or alter category/sub_category text.
   - If the call does not match perfectly, choose the closest matching sub_category anyway.

3) Summary:
   - Write exactly TWO sentences describing the purpose of the call.

4) Language detection:
   - Return a list of all languages spoken in the call (e.g., ["Hindi", "English"]).

ERROR HANDLING:
- If audio is missing/corrupted/unusable, set "error" to a short reason (string).
- If no error, set "error" to null.
- Even if error is present, still return all keys (use empty strings/lists for other fields).

CATEGORIZATION SCHEMA:
${schemaJson}

OUTPUT FORMAT (must match exactly):
{
  "category": "",
  "sub_category": "",
  "summary": "",
  "transcription": "",
  "language": [],
  "error": null
}
`;

      const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{
          parts: [
            { text: prompt },
            { file_data: { mime_type: 'audio/x-wav', file_uri: fileUri } },
          ],
        }],
        generationConfig: { response_mime_type: 'application/json' },
      };

      console.log('[Gemini] Running analysis...');
      const genResp = await fetchWithTimeout(
        generateUrl,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
        300_000
      );

      // Async cleanup — fire and forget
      if (fileName) {
        fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`,
          { method: 'DELETE' }, 30_000
        ).catch(() => {});
        fileName = null;
      }

      if (!genResp.ok) {
        const errText = await genResp.text();
        if (attempt < maxRetries - 1) continue;
        return { success: false, error: `Gemini generate failed: ${errText}` };
      }

      const resultData = await genResp.json();
      const candidates = resultData?.candidates;
      if (!candidates?.length) {
        if (attempt < maxRetries - 1) continue;
        return { success: false, error: 'No candidates returned from Gemini' };
      }

      const textResponse = candidates[0]?.content?.parts?.[0]?.text || '{}';
      let analysis;
      try {
        analysis = JSON.parse(textResponse);
      } catch {
        if (attempt < maxRetries - 1) continue;
        return { success: false, error: 'Invalid JSON returned from Gemini' };
      }

      if (analysis.error) return { success: false, error: analysis.error };

      console.log(`[Gemini] Done in ${((Date.now() - startTime) / 1000).toFixed(1)}s total (analysis ${((Date.now() - genStart) / 1000).toFixed(1)}s)`);

      return {
        success:       true,
        category:      cleanCategory(analysis.category)      || 'Uncategorized',
        sub_category:  cleanCategory(analysis.sub_category)  || 'N/A',
        summary:       analysis.summary       || 'N/A',
        transcription: analysis.transcription || 'N/A',
        language:      toLanguageArray(analysis.language),
      };

    } catch (err) {
      // Cleanup uploaded Gemini file on error
      if (fileName) {
        fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`,
          { method: 'DELETE' }, 30_000
        ).catch(() => {});
      }

      const isRetryable =
        err.name === 'AbortError' ||
        err.code === 'ECONNRESET'  ||
        err.code === 'ECONNREFUSED'||
        err.message?.toLowerCase().includes('timeout') ||
        err.message?.toLowerCase().includes('connection');

      if (isRetryable && attempt < maxRetries - 1) {
        console.warn(`[Gemini] Retryable error (attempt ${attempt + 1}): ${err.message}`);
        continue;
      }

      console.error(`[Gemini] Fatal error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

module.exports = { categorizeRecording, CATEGORIZATION_SCHEMA };
