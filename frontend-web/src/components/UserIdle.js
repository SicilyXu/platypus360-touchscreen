import { useEffect, useRef, useCallback } from "react";

const useIdleReset = (
  onIdle,
  delay = 60000,
  events = ["click", "touchstart", "keydown"]
) => {
  const timerRef = useRef(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onIdle, delay);
  }, [onIdle, delay]);

  useEffect(() => {
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [events, resetTimer]); 
};

export default useIdleReset;
