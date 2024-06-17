import { MutableRefObject, useEffect, useState } from "react";

export const Scrubber = ({ audioRef }: { audioRef: MutableRefObject<HTMLAudioElement>}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const updateProgress = () => {
        const currentTime = audio.currentTime
        const duration = audio.duration
        const progressPercentage = (currentTime / duration) * 100
        setProgress(progressPercentage)
      }
  
      audio.addEventListener('timeupdate', updateProgress)
  
      return () => {
        audio.removeEventListener('timeupdate', updateProgress)
      }
    }

  }, [audioRef]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '2px', backgroundColor: 'var(--harmony-n-100)' }}>
      <div
        style={{
          position: 'absolute',
          width: `${progress}%`,
          height: '100%',
          backgroundColor: 'var(--harmony-p-400)',
        }}
      ></div>
    </div>
  )
}
