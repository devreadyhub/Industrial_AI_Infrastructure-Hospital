import React from 'react';

export const RefreshIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <polyline points="21 6 21 12 15 12" />
  </svg>
);

export default RefreshIcon;
