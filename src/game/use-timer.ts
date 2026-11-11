import { useEffect, useRef, type RefObject } from "react";
import { formatClock } from "@/game/engine";

export function useRailTimer(options: {
  total: number;
  active: boolean;
  resetKey: string;
  remainRef: RefObject<number>;
  barRef: RefObject<HTMLDivElement | null>;
  labelRef: RefObject<HTMLSpanElement | null>;
  onEnd: () => void;
}) {
  const { total, active, resetKey, remainRef, barRef, labelRef, onEnd } = options;
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const fired = useRef(false);

  useEffect(() => {
    remainRef.current = total;
    fired.current = false;
    if (labelRef.current) labelRef.current.textContent = formatClock(total);
    if (barRef.current) {
      barRef.current.style.transform = "scaleX(1)";
      delete barRef.current.dataset.hot;
    }
  }, [resetKey, total, remainRef, barRef, labelRef]);

  useEffect(() => {
    if (!active || fired.current) return;
    const deadline = performance.now() + remainRef.current * 1000;
    let raf = 0;
    let lastSec = -1;
    const tick = (now: number) => {
      const remain = Math.max(0, (deadline - now) / 1000);
      remainRef.current = remain;
      const sec = Math.ceil(remain);
      if (labelRef.current && sec !== lastSec) {
        lastSec = sec;
        labelRef.current.textContent = formatClock(remain);
      }
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${total > 0 ? remain / total : 0})`;
        if (sec <= 5) barRef.current.dataset.hot = "1";
        else delete barRef.current.dataset.hot;
      }
      if (remain <= 0) {
        if (!fired.current) {
          fired.current = true;
          onEndRef.current();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      remainRef.current = Math.max(0, (deadline - performance.now()) / 1000);
      cancelAnimationFrame(raf);
    };
  }, [active, resetKey, total, remainRef, barRef, labelRef]);
}
