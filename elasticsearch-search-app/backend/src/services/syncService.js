/**
 * syncService — MongoDB Change Stream → Elasticsearch
 *
 * Watches the books collection for insert / update / replace / delete events
 * and mirrors them to the ES index in real time.
 *
 * Resume tokens: stored in a `_sync_tokens` MongoDB collection so that if the
 * process restarts it picks up exactly where it left off, with no missed events
 * and no duplicate work.
 */

import mongoose from 'mongoose';
import { Book } from '../models/Book.js';
import { searchRepo } from '../repositories/searchRepo.js';

// Tiny schema — stores one document: { _id: 'books', resumeToken: {...} }
const SyncToken = mongoose.model(
  '_SyncToken',
  new mongoose.Schema({ _id: String, resumeToken: mongoose.Schema.Types.Mixed }, { _id: false })
);

let activeStream = null;
let stopping = false;

async function loadResumeToken() {
  const state = await SyncToken.findById('books').lean();
  return state?.resumeToken ?? null;
}

async function saveResumeToken(token) {
  await SyncToken.findByIdAndUpdate('books', { resumeToken: token }, { upsert: true });
}

async function handleChange(change) {
  const docId = change.documentKey._id.toString();

  switch (change.operationType) {
    case 'insert':
    case 'replace':
    case 'update': {
      const doc = change.fullDocument;
      if (!doc) return; // safety — fullDocument missing (shouldn't happen with updateLookup)
      await searchRepo.indexDoc(doc);
      console.log(`[sync] ✏️  ${change.operationType}: "${doc.title}" → ES`);
      break;
    }
    case 'delete': {
      await searchRepo.deleteDoc(docId);
      console.log(`[sync] 🗑  delete: ${docId} → ES`);
      break;
    }
    default:
      // invalidate, drop, rename — ignore for now
  }

  // Persist token after successful processing
  await saveResumeToken(change._id);
}

export async function startSync() {
  stopping = false;
  const resumeToken = await loadResumeToken();

  const streamOptions = {
    fullDocument: 'updateLookup', // always include the full document on update
    ...(resumeToken ? { resumeAfter: resumeToken } : {}),
  };

  try {
    activeStream = Book.watch([], streamOptions);
    console.log(`[sync] 🚀 Change stream started${resumeToken ? ' (resuming from saved token)' : ' (fresh)'}`);
  } catch (err) {
    console.error('[sync] Failed to open change stream:', err.message);
    scheduleRestart();
    return;
  }

  activeStream.on('change', async change => {
    try {
      await handleChange(change);
    } catch (err) {
      // Log and continue — one failed event shouldn't kill the stream
      // In production: push to a DLQ (Dead Letter Queue) / alert
      console.error(`[sync] ⚠️  Failed to process ${change.operationType} for ${change.documentKey._id}:`, err.message);
    }
  });

  activeStream.on('error', async err => {
    console.error('[sync] Stream error:', err.message);

    // Error code 286 = ChangeStreamHistoryLost — the oplog window has been exceeded.
    // Must reset the token and do a full re-index rather than resuming.
    if (err.code === 286 || err.codeName === 'ChangeStreamHistoryLost') {
      console.error('[sync] ⚠️  Oplog history lost — clearing resume token. Run `npm run reindex` to rebuild ES.');
      await SyncToken.findByIdAndDelete('books').catch(() => {});
    }

    scheduleRestart();
  });

  activeStream.on('close', () => {
    if (!stopping) {
      console.log('[sync] Stream closed unexpectedly — restarting...');
      scheduleRestart();
    }
  });
}

function scheduleRestart(delayMs = 5000) {
  if (stopping) return;
  setTimeout(() => startSync(), delayMs);
}

export async function stopSync() {
  stopping = true;
  if (activeStream) {
    await activeStream.close();
    activeStream = null;
    console.log('[sync] Change stream stopped');
  }
}
