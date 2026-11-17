import { useEffect, useState } from 'react';
import { uiCopy } from '../constants/uiCopy.js';

function BlobMedia({ blob, audio, index, total = 0, onRemove }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);
  if (!url) return null;
  if (audio) {
    return (
      <div className="evidence-audio-item">
        <audio controls src={url} aria-label={uiCopy.evidence.audioAria} />
        {onRemove && (
          <button type="button" className="secondary remove-evidence-button" onClick={onRemove}>
            <span aria-hidden="true">✕</span> <span>{uiCopy.home.removeAudioAction}</span>
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="evidence-photo-item">
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt={uiCopy.evidence.photoAlt(index, total)} />
      </a>
      {onRemove && (
        <button
          type="button"
          className="secondary remove-evidence-button"
          onClick={onRemove}
          aria-label={uiCopy.home.removePhotoAction(index)}
        >
          <span aria-hidden="true">✕</span> <span>Quitar</span>
        </button>
      )}
    </div>
  );
}

export default function Evidence({ audio, photos = [], onRemoveAudio, onRemovePhoto, counterLabel = '' }) {
  return <div className="evidence">
    {audio && <BlobMedia blob={audio} audio onRemove={onRemoveAudio} />}
    {counterLabel && photos.length > 0 && (
      <p className="evidence-photos-counter" role="status">{counterLabel}</p>
    )}
    <div className="gallery">
      {photos.map((photo, index) => (
        <BlobMedia
          key={index}
          blob={photo}
          index={index}
          total={photos.length}
          onRemove={onRemovePhoto ? () => onRemovePhoto(index) : undefined}
        />
      ))}
    </div>
  </div>;
}
