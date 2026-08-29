'use client';

import { useState, useEffect } from 'react';

export function TimeAgo({ timestamp }: { timestamp: string | Date }) {
  const [displayText, setDisplayText] = useState<string>('');

  useEffect(() => {
    function formatTime() {
      const now = new Date();
      const date = new Date(timestamp);
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) {
        setDisplayText('Just now');
      } else if (diffMins < 60) {
        setDisplayText(`${diffMins}m ago`);
      } else if (diffHours < 24) {
        setDisplayText(`${diffHours}h ${diffMins % 60}m ago`);
      } else {
        setDisplayText(date.toLocaleDateString([], { month: 'short', day: 'numeric' }));
      }
    }

    formatTime();
    const timer = setInterval(formatTime, 60000);
    return () => clearInterval(timer);
  }, [timestamp]);

  if (!displayText) {
    // SSR Fallback in UTC
    const d = new Date(timestamp);
    return <span>{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC</span>;
  }

  return (
    <span title={new Date(timestamp).toLocaleString()}>
      {displayText}
    </span>
  );
}

export function LocalTime({ timestamp }: { timestamp: string | Date }) {
  const [localStr, setLocalStr] = useState<string>('');

  useEffect(() => {
    const d = new Date(timestamp);
    setLocalStr(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, [timestamp]);

  if (!localStr) {
    const d = new Date(timestamp);
    return <span>{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC</span>;
  }

  return <span title={`Recorded at ${new Date(timestamp).toISOString()}`}>{localStr}</span>;
}
