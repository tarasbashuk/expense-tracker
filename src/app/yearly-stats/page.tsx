'use client';
import dynamic from 'next/dynamic';
import React from 'react';

const YearlyStatsContent = dynamic(() => import('./YearlyStatsContent'), {
  ssr: false,
});

export default function Page() {
  return <YearlyStatsContent />;
}
