/**
 * Analysis Worker — background job that processes call recordings.
 *
 * Polls every POLL_INTERVAL_MS for calls that have a recording URL
 * but no completed analysis yet. Processes one at a time and writes
 * results to the `call_analysis` collection.
 */
const { getDb }                 = require('../db');
const { categorizeRecording }   = require('../services/geminiService');

const POLL_INTERVAL_MS  = 15_000;   // check every 15 seconds
const STALE_LOCK_MIN    = 15;       // re-queue if stuck in "processing" > 15 min

let isRunning = false;

// ─── One processing tick ──────────────────────────────────────────────────────

async function processTick() {
  if (isRunning) return;  // prevent overlap

  let db;
  try {
    db = await getDb();
  } catch (err) {
    console.error('[Worker] DB connection error:', err.message);
    return;
  }

  const analysisCol = db.collection('call_analysis');
  const callsCol    = db.collection('calls');

  // ── 1. Reset stale "processing" records ──────────────────────────────────
  const staleThreshold = new Date(Date.now() - STALE_LOCK_MIN * 60 * 1000);
  await analysisCol.updateMany(
    { status: 'processing', updated_at: { $lt: staleThreshold } },
    { $set: { status: 'pending', error: 'Stale lock reset', updated_at: new Date() } }
  );

  // ── 2. Find a pending call_analysis record ────────────────────────────────
  //    (records are inserted as "pending" when a recording URL arrives)
  const record = await analysisCol.findOneAndUpdate(
    { status: 'pending' },
    { $set: { status: 'processing', updated_at: new Date() } },
    { sort: { created_at: 1 }, returnDocument: 'after' }
  );

  if (!record) return;  // nothing to process right now

  isRunning = true;
  const { call_id, recording_url } = record;
  console.log(`[Worker] Processing call_id=${call_id}`);

  try {
    const result = await categorizeRecording(recording_url);

    if (result.success) {
      // Write results to call_analysis
      await analysisCol.updateOne(
        { call_id },
        {
          $set: {
            status:        'completed',
            category:      result.category,
            sub_category:  result.sub_category,
            summary:       result.summary,
            transcription: result.transcription,
            language:      result.language,
            error:         null,
            processed_at:  new Date(),
            updated_at:    new Date(),
          },
        }
      );

      // Mirror category + sub_category back onto the calls document
      // so the table can display them without an extra join.
      await callsCol.updateOne(
        { call_id },
        { $set: { category: result.category, sub_category: result.sub_category } }
      );

      console.log(`[Worker] Done: call_id=${call_id} → ${result.category} / ${result.sub_category}`);
    } else {
      await analysisCol.updateOne(
        { call_id },
        {
          $set: {
            status:     'failed',
            error:      result.error,
            updated_at: new Date(),
          },
          $inc: { attempts: 1 },
        }
      );
      console.warn(`[Worker] Failed: call_id=${call_id} — ${result.error}`);

      // If under 3 attempts, re-queue as pending for a later retry
      const updated = await analysisCol.findOne({ call_id });
      if ((updated?.attempts || 0) < 3) {
        await analysisCol.updateOne(
          { call_id },
          { $set: { status: 'pending', updated_at: new Date() } }
        );
      }
    }
  } catch (err) {
    console.error(`[Worker] Unexpected error for call_id=${call_id}:`, err.message);
    await analysisCol.updateOne(
      { call_id },
      { $set: { status: 'failed', error: err.message, updated_at: new Date() } }
    );
  } finally {
    isRunning = false;
  }
}

// ─── Enqueue a new recording (called by webhook) ──────────────────────────────

async function enqueueRecording(call_id, recording_url) {
  const db = await getDb();
  const col = db.collection('call_analysis');

  // Upsert — don't overwrite a completed record
  const existing = await col.findOne({ call_id });
  if (existing && existing.status === 'completed') return;  // already done

  await col.updateOne(
    { call_id },
    {
      $setOnInsert: { created_at: new Date(), attempts: 0 },
      $set: {
        recording_url,
        status:     'pending',
        updated_at: new Date(),
      },
    },
    { upsert: true }
  );
  console.log(`[Worker] Enqueued call_id=${call_id}`);
}

// ─── Start the background polling loop ───────────────────────────────────────

function startWorker() {
  console.log(`[Worker] Started — polling every ${POLL_INTERVAL_MS / 1000}s`);
  processTick();  // run immediately on start
  setInterval(processTick, POLL_INTERVAL_MS);
}

module.exports = { startWorker, enqueueRecording };
