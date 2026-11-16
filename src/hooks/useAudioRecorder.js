import { useEffect, useRef, useState } from 'react';

export default function useAudioRecorder({ onTimeout } = {}) {
  const session = useRef(null);
  const stream = useRef(null);
  const alive = useRef(true);
  const startingRef = useRef(false);
  const recordingRef = useRef(false);
  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => { onTimeoutRef.current = onTimeout; }, [onTimeout]);
  const [audio, setAudio] = useState(null);
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [seconds, setSeconds] = useState(60);
  const [error, setError] = useState('');

  function clearSessionTimer(current) {
    clearInterval(current.timer);
    current.timer = null;
  }

  function stopTracks(current) {
    current.stream.getTracks().forEach((track) => track.stop());
    if (stream.current === current.stream) stream.current = null;
  }

  function settle(current, result, failure) {
    if (current.settled) return;
    current.settled = true;
    if (failure) current.reject(failure);
    else current.resolve(result);
  }

  function requestStop(current, reason) {
    if (current.stopPromise) return current.stopPromise;
    current.stopReason = reason;
    current.stopPromise = current.resultPromise;
    clearSessionTimer(current);
    if (current.recorder.state === 'recording') {
      try {
        current.recorder.stop();
      } catch (failure) {
        clearSessionTimer(current);
        stopTracks(current);
        recordingRef.current = false;
        if (alive.current) {
          setRecording(false);
          setError(failure.message || 'No se pudo completar la grabación. Vuelve a intentarlo.');
        }
        settle(current, null, failure);
      }
    }
    return current.stopPromise;
  }

  function stop(reason = 'review') {
    if (!session.current) return Promise.resolve(audio);
    return requestStop(session.current, reason);
  }

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      const current = session.current;
      if (!current) return;
      clearSessionTimer(current);
      current.stopReason = 'abandon';
      current.abandoned = true;
      current.stopPromise ??= current.resultPromise;
      if (current.recorder.state === 'recording') {
        try {
          current.recorder.stop();
        } catch {
          // The screen is already inactive; cleanup must not surface a stale error.
        }
      }
      stopTracks(current);
      recordingRef.current = false;
      settle(current, null);
    };
  }, []);

  async function start() {
    if (startingRef.current || recordingRef.current) return;
    startingRef.current = true;
    setError('');
    setStarting(true);
    setAudio(null);
    let media;
    let current;
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        throw new Error('La grabación requiere un navegador compatible y HTTPS o localhost.');
      }
      media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus']
        .find((type) => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error('Este navegador no dispone de un formato de audio compatible.');

      const recorder = new MediaRecorder(media, { mimeType, audioBitsPerSecond: 32000 });
      const chunks = [];
      let resolveResult;
      let rejectResult;
      const resultPromise = new Promise((resolve, reject) => {
        resolveResult = resolve;
        rejectResult = reject;
      });
      resultPromise.catch(() => {});
      current = {
        recorder,
        stream: media,
        resultPromise,
        resolve: resolveResult,
        reject: rejectResult,
        settled: false,
        stopPromise: null,
        stopReason: null,
        timer: null,
        abandoned: false,
      };
      session.current = current;
      recorder.ondataavailable = ({ data }) => {
        if (data.size) chunks.push(data);
      };
      recorder.onstop = () => {
        clearSessionTimer(current);
        stopTracks(current);
        const blob = new Blob(chunks, { type: recorder.mimeType });
        const finalAudio = blob.size ? blob : null;
        if (alive.current && !current.abandoned) {
          setAudio(finalAudio);
          setRecording(false);
        }
        recordingRef.current = false;
        settle(current, finalAudio);
        if (current.stopReason === 'timeout' && alive.current && !current.abandoned) {
          try {
            Promise.resolve(onTimeoutRef.current?.(finalAudio))
              .catch((failure) => {
                if (alive.current) setError(failure.message || 'No se pudo publicar el reporte.');
              });
          } catch (failure) {
            if (alive.current) setError(failure.message || 'No se pudo publicar el reporte.');
          }
        }
      };
      recorder.onerror = () => {
        clearSessionTimer(current);
        stopTracks(current);
        recordingRef.current = false;
        if (alive.current && !current.abandoned) {
          setError('No se pudo completar la grabación. Vuelve a intentarlo.');
          setRecording(false);
        }
        settle(current, null, new Error('No se pudo completar la grabación. Vuelve a intentarlo.'));
      };

      recorder.start();
      recordingRef.current = true;
      setRecording(true);
      setSeconds(60);
      const deadline = Date.now() + 60000;
      current.timer = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        if (alive.current) setSeconds(remaining);
        if (!remaining) void requestStop(current, 'timeout').catch(() => {});
      }, 100);
    } catch (failure) {
      if (current) {
        current.abandoned = true;
        clearSessionTimer(current);
        if (current.recorder.state === 'recording') {
          try {
            current.recorder.stop();
          } catch {
            // Preserve the original startup failure.
          }
        }
        settle(current, null, failure);
        if (session.current === current) session.current = null;
      }
      media?.getTracks().forEach((track) => track.stop());
      if (stream.current === media) stream.current = null;
      recordingRef.current = false;
      if (alive.current) {
        setRecording(false);
        setError(failure.name === 'NotAllowedError'
          ? 'Permite el acceso al micrófono para grabar.'
          : failure.message);
      }
    } finally {
      startingRef.current = false;
      if (alive.current) setStarting(false);
    }
  }

  return { audio, recording, starting, seconds, error, start, stop };
}
