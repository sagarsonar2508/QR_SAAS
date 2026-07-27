"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

export default function Chart({
  option,
  className,
}: {
  option: Record<string, unknown>;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chart.setOption(option);
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [option]);

  return <div ref={ref} className={className ?? "h-64 w-full"} />;
}
