'use client';

import React from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { logoutAction } from '@/app/actions/auth';

interface LogoutButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
  fullWidth?: boolean;
}

function SubmitButton({
  variant = 'outline',
  size = 'sm',
  className = '',
  showIcon = true,
  fullWidth = false,
}: LogoutButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      isLoading={pending}
      disabled={pending}
      className={`text-[#DC2626] border-[#DC2626]/30 hover:bg-[#DC2626]/5 hover:border-[#DC2626] ${className}`}
      leftIcon={
        showIcon && !pending ? (
          <svg
            className="w-4 h-4 text-current"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        ) : undefined
      }
    >
      {pending ? 'Logging out...' : 'Log out'}
    </Button>
  );
}

export function LogoutButton({ fullWidth = false, ...props }: LogoutButtonProps) {
  return (
    <form action={logoutAction} className={fullWidth ? 'w-full block' : 'inline-block'}>
      <SubmitButton fullWidth={fullWidth} {...props} />
    </form>
  );
}
