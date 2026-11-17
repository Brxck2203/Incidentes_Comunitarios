import { useEffect, useState } from 'react';
import { uiCopy } from '../constants/uiCopy.js';

function BlobMedia({ blob, audio, index }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);
  if (!url) return null;
  return audio
    ? <audio controls src={url} aria-label={uiCopy.evidence.audioAria} />
    : <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={uiCopy.evidence.photoAlt(index)} /></a>;
}

export default function Evidence({ audio, photos = [] }) {
  return <div className="evidence">
    {audio && <BlobMedia blob={audio} audio />}
    <div className="gallery">{photos.map((photo, index) => <BlobMedia key={index} blob={photo} index={index} />)}</div>
  </div>;
}
