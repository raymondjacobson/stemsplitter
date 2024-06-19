import { MutableRefObject, useEffect, useState, useCallback } from "react";

export const Scrubber = ({ audioRef }: { audioRef: MutableRefObject<HTMLAudioElement>}) => {
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const updateProgress = () => {
        if (!isDragging) {
          const currentTime = audio.currentTime;
          const duration = audio.duration;
          const progressPercentage = (currentTime / duration) * 100;
          setProgress(progressPercentage);
        }
      };

      audio.addEventListener('timeupdate', updateProgress);

      return () => {
        audio.removeEventListener('timeupdate', updateProgress);
      };
    }
  }, [audioRef, isDragging]);

  const updateProgress = useCallback((clientX, scrubber) => {
    const rect = scrubber.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const newProgress = (offsetX / rect.width) * 100;
    setProgress(newProgress);

    const audio = audioRef.current;
    if (audio && audio.duration) {
      const newTime = (newProgress / 100) * audio.duration;
      audio.currentTime = newTime;
    }
  }, [audioRef]);

  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
    updateProgress(e.clientX, e.currentTarget);
  }, [updateProgress]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      updateProgress(e.clientX, e.currentTarget);
    }
  }, [isDragging, updateProgress]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback((e) => {
    updateProgress(e.clientX, e.currentTarget);
  }, [updateProgress]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '8px', // 4x the actual height
        cursor: 'pointer',
        backgroundColor: 'transparent'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
    >
      <div
        style={{
          position: 'absolute',
          top: '3px', // center the bar within the 8px container
          width: '100%',
          height: '2px',
          backgroundColor: 'var(--harmony-n-100)'
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: `${progress}%`,
            height: '100%',
            backgroundColor: 'var(--harmony-p-400)'
          }}
        ></div>
      </div>
    </div>
  );
};
