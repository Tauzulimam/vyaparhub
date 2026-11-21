'use client';

import React from 'react';
import {
  type ChartGranularity,
  type DateRangePreset,
  DATA_END_DATE,
  DATA_START_DATE,
  formatReadableDate,
} from '@/data/adminAnalyticsData';

export interface AnalyticsDateFilterProps {
  preset: DateRangePreset;
  customFrom: string;
  customTo: string;
  granularity: ChartGranularity;
  isAutoGranularity: boolean;
  validationError: string | null;
  activeRangeLabel: string;
  previousRangeLabel: string;
  dayCount: number;
  onPresetChange: (preset: DateRangePreset) => void;
  onCustomRangeChange: (from: string, to: string) => void;
  onGranularityChange: (granularity: ChartGranularity | 'auto') => void;
}

const PRESET_OPTIONS: { id: DateRangePreset; label: string }[] = [
  { id: 'THIS_MONTH', label: 'This Month' },
  { id: 'LAST_MONTH', label: 'Last Month' },
  { id: 'THIS_QUARTER', label: 'This Quarter' },
  { id: 'THIS_YEAR', label: 'This Year' },
  { id: 'CUSTOM', label: 'Custom Date Range' },
];

const GRANULARITY_OPTIONS: { id: ChartGranularity | 'auto'; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'daily', label: 'Daily' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
];

export const AnalyticsDateFilter: React.FC<AnalyticsDateFilterProps> = ({
  preset,
  customFrom,
  customTo,
  granularity,
  isAutoGranularity,
  validationError,
  activeRangeLabel,
  previousRangeLabel,
  dayCount,
  onPresetChange,
  onCustomRangeChange,
  onGranularityChange,
}) => {
  return (
    <section
      aria-label="Global analytics date range filter"
      className="bg-white border border-[#E2E8E3] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Preset Selector Pills */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#647067]">
              Analytics Period
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#166534]/10 text-[#166534]">
              {dayCount > 0 ? `${dayCount} ${dayCount === 1 ? 'day' : 'days'}` : 'No records'}
            </span>
          </div>
          <div
            role="group"
            aria-label="Select analytics period"
            className="flex flex-wrap items-center gap-1.5"
          >
            {PRESET_OPTIONS.map((opt) => {
              const active = preset === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onPresetChange(opt.id)}
                  aria-pressed={active}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] ${
                    active
                      ? 'bg-[#166534] text-white shadow-xs'
                      : 'bg-[#F8FAF7] text-[#17201A] border border-[#E2E8E3] hover:border-[#166534] hover:text-[#166534]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart Granularity Control */}
        <div className="flex flex-col sm:flex-row sm:items-center lg:flex-col lg:items-end justify-between gap-2 border-t lg:border-t-0 pt-3 lg:pt-0 border-[#E2E8E3]">
          <span className="text-xs font-bold uppercase tracking-wider text-[#647067]">
            Chart Granularity ({granularity})
          </span>
          <div
            role="group"
            aria-label="Chart time granularity"
            className="inline-flex items-center bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl p-1 self-start lg:self-end"
          >
            {GRANULARITY_OPTIONS.map((g) => {
              const selected =
                g.id === 'auto' ? isAutoGranularity : !isAutoGranularity && granularity === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onGranularityChange(g.id)}
                  aria-pressed={selected}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    selected
                      ? 'bg-white text-[#166534] shadow-xs border border-[#E2E8E3]'
                      : 'text-[#647067] hover:text-[#17201A]'
                  }`}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {preset === 'CUSTOM' && (
        <div className="pt-3 border-t border-[#E2E8E3] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div>
              <label
                htmlFor="analytics-from-date"
                className="block text-xs font-semibold text-[#17201A] mb-1"
              >
                From Date
              </label>
              <input
                id="analytics-from-date"
                type="date"
                value={customFrom}
                onChange={(e) => onCustomRangeChange(e.target.value, customTo)}
                className={`w-full rounded-xl border px-3 py-2 text-sm bg-[#F8FAF7] text-[#17201A] focus:outline-none focus:ring-2 ${
                  validationError
                    ? 'border-[#DC2626] focus:ring-[#DC2626]'
                    : 'border-[#E2E8E3] focus:border-[#166534] focus:ring-[#166534]'
                }`}
              />
            </div>

            <div>
              <label
                htmlFor="analytics-to-date"
                className="block text-xs font-semibold text-[#17201A] mb-1"
              >
                To Date
              </label>
              <input
                id="analytics-to-date"
                type="date"
                value={customTo}
                onChange={(e) => onCustomRangeChange(customFrom, e.target.value)}
                className={`w-full rounded-xl border px-3 py-2 text-sm bg-[#F8FAF7] text-[#17201A] focus:outline-none focus:ring-2 ${
                  validationError
                    ? 'border-[#DC2626] focus:ring-[#DC2626]'
                    : 'border-[#E2E8E3] focus:border-[#166534] focus:ring-[#166534]'
                }`}
              />
            </div>

            {/* Quick sample custom windows for fast prototype evaluation */}
            <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-[#647067] w-full">
                Quick custom presets (dataset covers {formatReadableDate(DATA_START_DATE)} –{' '}
                {formatReadableDate(DATA_END_DATE)}):
              </span>
              <button
                type="button"
                onClick={() => onCustomRangeChange('2026-11-08', '2026-11-21')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#F8FAF7] border border-[#E2E8E3] text-[#17201A] hover:border-[#166534] hover:text-[#166534]"
              >
                Last 14 Days
              </button>
              <button
                type="button"
                onClick={() => onCustomRangeChange('2026-06-01', '2026-08-31')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#F8FAF7] border border-[#E2E8E3] text-[#17201A] hover:border-[#166534] hover:text-[#166534]"
              >
                Jun – Aug 2026
              </button>
              <button
                type="button"
                onClick={() => onCustomRangeChange('2025-10-01', '2026-11-21')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#F8FAF7] border border-[#E2E8E3] text-[#17201A] hover:border-[#166534] hover:text-[#166534]"
              >
                All Available Data
              </button>
              <button
                type="button"
                onClick={() => onCustomRangeChange('2026-12-01', '2026-12-15')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#B45309]/10 border border-[#B45309]/30 text-[#B45309] hover:bg-[#B45309]/15"
              >
                Preview Empty Range (Dec 2026)
              </button>
            </div>
          </div>

          {validationError && (
            <div
              role="alert"
              className="flex items-center gap-2.5 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/30 px-3.5 py-2.5 text-xs font-semibold text-[#DC2626]"
            >
              <span aria-hidden="true">⚠</span>
              <span>{validationError}</span>
            </div>
          )}
        </div>
      )}

      {/* Active Period Summary Strip */}
      <div className="pt-2 border-t border-[#E2E8E3] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#647067]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-[#17201A]">Showing:</span>
          <span>{activeRangeLabel}</span>
          {!validationError && dayCount > 0 && (
            <>
              <span className="text-[#E2E8E3]">•</span>
              <span>
                Comparing against previous period:{' '}
                <strong className="font-medium text-[#17201A]">{previousRangeLabel}</strong>
              </span>
            </>
          )}
        </div>
        <span className="text-[11px] font-medium text-[#B45309]">
          Phase 2 Mock Analytics Dataset
        </span>
      </div>
    </section>
  );
};
