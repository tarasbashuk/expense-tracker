'use client';

import dynamic from 'next/dynamic';

const YearlyStats = dynamic(() => import('./YearlyStatsContent'), {
  ssr: false,
});

export default YearlyStats;
