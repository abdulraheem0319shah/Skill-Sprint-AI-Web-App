import React from 'react';

export const StatusBadge = ({ status }) => {
  const norm = String(status || '').toLowerCase().replace(/_/g, ' ');

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-300';
  let dotColor = 'bg-slate-400';

  if (norm.includes('verified') && !norm.includes('warning') && !norm.includes('partially')) {
    colorClasses = 'bg-brand-50/80 text-brand-700 border-brand-200/80';
    dotColor = 'bg-brand-400';
  } else if (norm.includes('warning') || norm.includes('partially') || norm.includes('attention')) {
    colorClasses = 'bg-brand-50/80 text-brand-700 border-brand-200/80';
    dotColor = 'bg-brand-400 animate-pulse';
  } else if (norm.includes('flagged') || norm.includes('rejected') || norm.includes('quarantined') || norm.includes('unsupported') || norm.includes('contradict')) {
    colorClasses = 'bg-brand-50/80 text-brand-700 border-brand-200/80';
    dotColor = 'bg-brand-400';
  } else if (norm.includes('approved') || norm.includes('completed') || norm.includes('active')) {
    colorClasses = 'bg-brand-50/80 text-brand-700 border-brand-200/80';
    dotColor = 'bg-brand-400';
  } else if (norm.includes('pending') || norm.includes('in progress')) {
    colorClasses = 'bg-brand-50/80 text-brand-700 border-brand-200/80';
    dotColor = 'bg-brand-400 animate-pulse';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
      <span className="capitalize">{norm || 'Unknown'}</span>
    </span>
  );
};
