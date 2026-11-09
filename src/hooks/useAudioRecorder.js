import { useEffect, useRef, useState } from 'react';

export default function useAudioRecorder() {
  const recorder = useRef(null);
  const stream = useRef(null);
  const timer = useRef(null);
  const pending = useRef(null);
  const alive = useRef(true);
  const [audio, setAudio] = useState(null);
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [seconds, setSeconds] = useState(60);
  const [error, setError] = useState('');

  function stop() {
    if (recorder.current?.state === 'recording') recorder.current.stop();
    return pending.current ?? Promise.resolve(audio);
  }

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clearInterval(timer.current);
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function start() {
    setError(''); setStarting(true); setAudio(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('La grabación requiere un navegador compatible y HTTPS o localhost.');
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) { media.getTracks().forEach((track) => track.stop()); return; }
      stream.current = media;
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find((type) => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error('Este navegador no dispone de un formato de audio compatible.');
      const instance = new MediaRecorder(media, { mimeType, audioBitsPerSecond: 32000 });
      recorder.current = instance;
      const chunks = [];
      pending.current = new Promise((resolve) => {
        instance.ondataavailable = ({ data }) => { if (data.size) chunks.push(data); };
        instance.onstop = () => {
          clearInterval(timer.current);
          media.getTracks().forEach((track) => track.stop());
          const blob = new Blob(chunks, { type: instance.mimeType });
          if (alive.current) { setAudio(blob.size ? blob : null); setRecording(false); }
          resolve(blob.size ? blob : null);
        };
        instance.onerror = () => {
          clearInterval(timer.current);
          media.getTracks().forEach((track) => track.stop());
          if (alive.current) { setError('No se pudo completar la grabación. Vuelve a intentarlo.'); setRecording(false); }
          resolve(null);
        };
      });
      instance.start(); setRecording(true); setSeconds(60);
      const deadline = Date.now() + 60000;
      timer.current = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        if (alive.current) setSeconds(remaining);
        if (!remaining && instance.state === 'recording') instance.stop();
      }, 100);
    } catch (failure) {
      stream.current?.getTracks().forEach((track) => track.stop());
      if (alive.current) setError(failure.name === 'NotAllowedError' ? 'Permite el acceso al micrófono para grabar.' : failure.message);
    } finally { if (alive.current) setStarting(false); }
  }
  return { audio, recording, starting, seconds, error, start, stop };
}
