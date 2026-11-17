import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAudioRecorder from '../hooks/useAudioRecorder.js';
import { categories, createReport, findPotentialDuplicates, getCurrentReporterId, validatePhotos } from '../services/reportRepository.js';
import DuplicateWarning from '../components/DuplicateWarning.jsx';
import { getCurrentPosition } from '../services/geolocation.js';
import Evidence from '../components/Evidence.jsx';
import { uiCopy } from '../constants/uiCopy.js';
import { triggerUxFeedback } from '../services/uxFeedback.js';

function MicrophoneIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function getTimestamp() {
  return new Date().toISOString();
}

const EMPTY_DRAFT = { mode: null, audio: null, photos: [], capturedAt: null };

function hasEvidence(draft) {
  return Boolean(draft.audio?.size || draft.photos.length);
}

export default function HomePage() {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [category, setCategory] = useState('');
  const [pendingReport, setPendingReport] = useState(null);
  const [error, setError] = useState('');
  const [statusNotice, setStatusNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const draftRef = useRef(EMPTY_DRAFT);
  const publishing = useRef(false);
  const active = useRef(true);
  const cameraInputRef = useRef(null);
  const [reporterId] = useState(() => { try { return getCurrentReporterId(); } catch { return null; } });
  const navigate = useNavigate();

  function updateDraft(nextDraft) {
    draftRef.current = nextDraft;
    setDraft(nextDraft);
  }

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  async function persistReport(payload) {
    const report = await createReport(payload);
    triggerUxFeedback('success');
    if (active.current) navigate(`/reportes/${report.ticket}`, { state: { created: true } });
  }

  async function continuePending() {
    if (publishing.current || !pendingReport) return;
    publishing.current = true; setBusy(true); setError(''); setStatusNotice('');
    try { await persistReport(pendingReport); if (active.current) setPendingReport(null); }
    catch (failure) { if (active.current) setError(failure.message); }
    finally { publishing.current = false; if (active.current) setBusy(false); }
  }

  async function publishReport(options = {}) {
    if (publishing.current || !active.current || pendingReport) return;
    publishing.current = true;
    setBusy(true);
    setError('');
    setStatusNotice(options.stopReason === 'timeout' ? uiCopy.home.recordingTimeoutNotice : '');
    const currentDraft = draftRef.current;
    const snapshot = {
      ...currentDraft,
      audio: currentDraft.audio,
      photos: [...currentDraft.photos],
      capturedAt: currentDraft.capturedAt || getTimestamp(),
    };
    if (!currentDraft.capturedAt) updateDraft(snapshot);
    const hasAudioOverride = Object.prototype.hasOwnProperty.call(options, 'audioBlob');
    try {
      let audio = hasAudioOverride ? options.audioBlob : snapshot.audio;
      if (snapshot.mode === 'voice' && !hasAudioOverride && voice.recording) {
        audio = await voice.stop(options.stopReason || 'send');
      }
      if (!active.current) return;
      if (snapshot.mode === 'voice' && audio?.size) {
        snapshot.audio = audio;
        if (draftRef.current.mode === 'voice' && draftRef.current.capturedAt === snapshot.capturedAt) {
          updateDraft({ ...draftRef.current, audio });
        }
      }
      if (!audio?.size && !snapshot.photos.length) {
        setError(snapshot.mode === 'voice'
          ? uiCopy.home.emptyVoiceError
          : uiCopy.home.missingEvidenceError);
        return;
      }
      const position = await getCurrentPosition();
      if (!active.current) return;
      const payload = {
        audio,
        photos: snapshot.photos,
        position,
        capturedAt: snapshot.capturedAt,
        reporterId,
        category,
      };
      const matches = category ? await findPotentialDuplicates(position, category) : [];
      if (!active.current) return;
      if (matches.length) {
        setPendingReport({ ...payload, matches });
        return;
      }
      await persistReport(payload);
    } catch (failure) {
      if (active.current) setError(failure.message);
    } finally {
      publishing.current = false;
      if (active.current) setBusy(false);
    }
  }

  const voice = useAudioRecorder({
    onTimeout: (recordedBlob) => publishReport({ audioBlob: recordedBlob, stopReason: 'timeout' }),
  });

  async function handleCameraCapture(event) {
    const input = event.currentTarget;
    try {
      if (!active.current || publishing.current) return;
      const files = input.files;
      if (!files?.length) return;
      if (voice.recording || voice.starting) {
        setError(uiCopy.home.stopBeforePhotoError);
        return;
      }
      const selected = validatePhotos(files);
      if (selected.length) {
        if (hasEvidence(draftRef.current)
          && !window.confirm(uiCopy.home.replacePhotoConfirm)) return;
        updateDraft({ mode: 'photo', audio: null, photos: selected, capturedAt: getTimestamp() });
        setError('');
        setStatusNotice('');
        await publishReport();
      }
    } catch (failure) {
      if (active.current) setError(failure.message);
    } finally {
      input.value = '';
    }
  }

  function openCamera() {
    if (!active.current || publishing.current || busy || voice.starting || voice.recording || pendingReport) return;
    cameraInputRef.current?.click();
  }

  async function handleMicClick() {
    if (publishing.current || busy || voice.starting || pendingReport) return;
    if (voice.recording) {
      await publishReport({ stopReason: 'send' });
    } else {
      if (hasEvidence(draftRef.current)
        && !window.confirm(uiCopy.home.replaceAudioConfirm)) return;
      updateDraft({ mode: 'voice', audio: null, photos: [], capturedAt: getTimestamp() });
      setError('');
      setStatusNotice('');
      triggerUxFeedback('record');
      await voice.start();
    }
  }

  async function stopForReview() {
    try {
      const audio = await voice.stop('review');
      if (audio?.size && draftRef.current.mode === 'voice' && !publishing.current) {
        updateDraft({ ...draftRef.current, audio });
      }
    } catch (failure) {
      if (active.current) setError(failure.message);
    }
  }

  function discardAndRestartRecording() {
    if (busy || publishing.current) return;
    voice.discard();
    updateDraft(EMPTY_DRAFT);
    setError('');
    setStatusNotice(uiCopy.home.discardedRecordingNotice);
  }

  const progressPercent = Math.max(0, Math.min(100, Math.round(((60 - voice.seconds) / 60) * 100)));
  const activeError = error || voice.error;

  return (
    <section aria-labelledby="capture-title">
      <p className="eyebrow">{uiCopy.home.eyebrow}</p>
      <h1 id="capture-title">{uiCopy.home.title}</h1>
      <p className="lead">{uiCopy.home.lead}</p>
      <p className="permission-context-note">{uiCopy.home.permissionContext}</p>

      <div className="capture-actions">
        <button
          type="button"
          className={`capture-action-card mic-card ${voice.recording ? 'recording-active' : ''}`}
          disabled={busy || voice.starting || Boolean(pendingReport)}
          onClick={() => { void handleMicClick(); }}
          aria-label={voice.recording ? uiCopy.home.micAriaRecording : uiCopy.home.micAriaIdle}
        >
          <span className="action-icon-circle">
            {voice.recording ? <StopIcon /> : <MicrophoneIcon />}
          </span>
          <span className="action-card-text">
            <strong className="action-title">
              {voice.starting
                ? uiCopy.home.micStartingTitle
                : voice.recording
                  ? uiCopy.home.micRecordingTitle(voice.seconds)
                  : uiCopy.home.micIdleTitle}
            </strong>
            <span className="action-subtitle">
              {voice.recording ? uiCopy.home.micRecordingSubtitle : uiCopy.home.micIdleSubtitle}
            </span>
          </span>
        </button>

        <button
          type="button"
          className="capture-action-card camera-card"
          disabled={busy || voice.starting || voice.recording || Boolean(pendingReport)}
          onClick={openCamera}
          aria-label={uiCopy.home.cameraAria}
        >
          <span className="action-icon-circle">
            <CameraIcon />
          </span>
          <span className="action-card-text">
            <strong className="action-title">{uiCopy.home.cameraTitle}</strong>
            <span className="action-subtitle">{uiCopy.home.cameraSubtitle}</span>
          </span>
        </button>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          capture="environment"
          style={{ display: 'none' }}
          disabled={busy || voice.starting || voice.recording}
          onChange={(event) => { void handleCameraCapture(event); }}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {busy && (
        <div className="sending-indicator" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <span>{uiCopy.home.publishingStatus}</span>
        </div>
      )}

      {voice.recording && (
        <div className="recording-status" role="status" aria-live="polite">
          <p className="recording-countdown-title">
            <strong>{uiCopy.home.recordingStatusHeader(voice.seconds)}</strong>
          </p>
          <div
            className="recording-progress-track"
            role="progressbar"
            aria-label={uiCopy.home.recordingStatusHeader(voice.seconds)}
            aria-valuemin={0}
            aria-valuemax={60}
            aria-valuenow={60 - voice.seconds}
          >
            <div className="recording-progress-bar" style={{ width: `${progressPercent}%` }} />
          </div>
          <p>{uiCopy.home.recordingStatusHint}</p>
          <div className="recording-status-actions">
            <button
              type="button"
              className="primary"
              onClick={() => { void handleMicClick(); }}
              disabled={busy}
            >
              {uiCopy.common.publishAction}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={stopForReview}
              disabled={busy}
            >
              {uiCopy.home.stopAndListenAction}
            </button>
            <button
              type="button"
              className="secondary discard-recording-button"
              onClick={discardAndRestartRecording}
              disabled={busy}
            >
              {uiCopy.home.discardRecordingAction}
            </button>
          </div>
        </div>
      )}

      {statusNotice && !voice.recording && (
        <p className="info-message" role="status">{statusNotice}</p>
      )}

      <Evidence
        audio={draft.mode === 'voice' ? draft.audio : null}
        photos={draft.mode === 'photo' ? draft.photos : []}
      />

      {!voice.recording && draft.mode === 'voice' && Boolean(draft.audio?.size) && (
        <div className="draft-secondary-actions">
          <button
            type="button"
            className="secondary discard-recording-button"
            disabled={busy}
            onClick={discardAndRestartRecording}
          >
            {uiCopy.home.discardRecordingAction}
          </button>
        </div>
      )}

      {!voice.recording && draft.mode === 'photo' && draft.photos.length > 0 && (
        <div className="draft-secondary-actions">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={openCamera}
          >
            {uiCopy.home.retakePhotoAction}
          </button>
        </div>
      )}

      {pendingReport && <DuplicateWarning matches={pendingReport.matches} busy={busy}
        onContinue={() => { void continuePending(); }}
        onCancel={() => { setPendingReport(null); setError(''); }} />}

      {activeError && (
        <div className="error-message" role="alert">
          <p>{activeError}</p>
          {hasEvidence(draft) && <p className="error-retry-hint">{uiCopy.home.retryHint}</p>}
        </div>
      )}

      <button
        className="publish-button"
        type="button"
        disabled={busy || voice.starting || Boolean(pendingReport) || (!voice.recording && !voice.audio && !draft.photos.length)}
        onClick={() => { void publishReport(); }}
      >
        {busy ? uiCopy.home.publishButtonBusy : uiCopy.home.publishButtonIdle}
      </button>

      <label className="report-category-field">{uiCopy.home.categoryLabel}
        <select value={category} disabled={busy || Boolean(pendingReport)} onChange={(event) => setCategory(event.target.value)}>
          <option value="">{uiCopy.home.categoryPlaceholder}</option>
          {categories.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <span className="field-help">{uiCopy.home.categoryHelp}</span>
      </label>

      <p className="auto-location-footnote">{uiCopy.home.autoLocationFootnote}</p>
      <Link className="text-link" to="/reportes">{uiCopy.home.goToMyReports}</Link>
    </section>
  );
}
