import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function CountdownTimer({ targetDate, className = '' }) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(targetDate));

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft(targetDate)), 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (!targetDate) return null;

  if (timeLeft.total <= 0) {
    return (
      <span className={`inline-flex items-center gap-1 text-emerald-400 text-sm font-medium ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Live Now
      </span>
    );
  }

  const { days, hours, minutes, seconds } = timeLeft;
  const isUrgent = timeLeft.total < 86400000;

  if (days > 0) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${isUrgent ? 'text-amber-400' : 'text-gray-400'} ${className}`}>
        <Clock size={13} />
        {days}d {hours}h {minutes}m
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${isUrgent ? 'text-red-400 animate-pulse-gold' : 'text-gray-400'} ${className}`}>
      <Clock size={13} />
      {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}

function getTimeLeft(targetDate) {
  const total = new Date(targetDate) - Date.now();
  if (total <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    total,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}
