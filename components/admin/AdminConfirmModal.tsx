'use client';

import React, { useState } from 'react';
import { Icon } from '@/components/vendor/Icon';

export interface AdminConfirmModalProps {
  title: string;
  subtitle?: string;
  description: string;
  warningNote?: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning' | 'green';
  requireReasonInput?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  defaultReason?: string;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

export const AdminConfirmModal: React.FC<AdminConfirmModalProps> = ({
  title,
  subtitle,
  description,
  warningNote,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'danger',
  requireReasonInput = false,
  reasonLabel = 'Admin Audit Note / Reason (Prototype Mock)',
  reasonPlaceholder = 'Provide a brief reason for this action...',
  defaultReason = '',
  onConfirm,
  onCancel,
}) => {
  const [reason, setReason] = useState(defaultReason);

  const badgeTone = {
    danger: 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/25',
    warning: 'bg-[#F59E0B]/15 text-[#B45309] border-[#F59E0B]/30',
    green: 'bg-[#166534]/10 text-[#166534] border-[#166534]/25',
  }[tone];

  const confirmBtnTone = {
    danger: 'bg-[#DC2626] hover:bg-[#B91C1C] text-white',
    warning: 'bg-[#B45309] hover:bg-[#92400E] text-white',
    green: 'bg-[#166534] hover:bg-[#14532D] text-white',
  }[tone];

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-confirm-modal-title"
    >
      <div className="bg-white border border-[#E2E8E3] rounded-3xl max-w-lg w-full shadow-xl p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${badgeTone}`}
            >
              <Icon
                name={tone === 'green' ? 'check' : 'alert'}
                className="w-5 h-5"
              />
            </div>
            <div>
              <h2
                id="admin-confirm-modal-title"
                className="text-base sm:text-lg font-black text-[#17201A]"
              >
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs font-semibold text-[#647067] mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close confirmation dialog"
            className="p-1.5 rounded-xl text-[#647067] hover:bg-[#F8FAF7] hover:text-[#17201A]"
          >
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-[#17201A] leading-relaxed">
          {description}
        </p>

        {warningNote && (
          <div className="rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 p-3.5 text-xs text-[#B45309] space-y-1">
            <div className="font-bold uppercase tracking-wider text-[11px]">
              Impact Notice
            </div>
            <p className="text-[#17201A] font-medium">{warningNote}</p>
          </div>
        )}

        {requireReasonInput && (
          <div>
            <label
              htmlFor="admin-confirm-reason"
              className="block text-xs font-bold text-[#17201A] mb-1.5"
            >
              {reasonLabel}
            </label>
            <textarea
              id="admin-confirm-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              className="w-full rounded-xl border border-[#E2E8E3] bg-[#F8FAF7] px-3 py-2 text-xs text-[#17201A] placeholder:text-[#647067] focus:outline-none focus:border-[#166534]"
            />
          </div>
        )}

        <div className="rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] px-3 py-2 text-[11px] text-[#647067] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#B45309] shrink-0" />
          <span>
            Phase 2 Prototype: State updates immediately in the current session and resets on full browser refresh.
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-[#E2E8E3]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-[#E2E8E3] bg-white text-xs font-semibold text-[#17201A] hover:bg-[#F8FAF7] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors ${confirmBtnTone}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
