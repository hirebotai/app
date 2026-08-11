'use client';

import { useState, useCallback, useEffect } from 'react';
import { validateLicenseKey, extractKeyPrefix } from '@/lib/utils';
import { LicenseValidationResponse } from '@/lib/types';

interface UseLicenseValidationReturn {
  validate: (key: string, hwId: string) => Promise<LicenseValidationResponse>;
  validating: boolean;
  error: string | null;
  lastResult: LicenseValidationResponse | null;
}

export function useLicenseValidation(): UseLicenseValidationReturn {
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<LicenseValidationResponse | null>(null);

  const validate = useCallback(async (key: string, hwId: string): Promise<LicenseValidationResponse> => {
    if (!validateLicenseKey(key)) {
      const err = 'Invalid license key format';
      setError(err);
      return { valid: false, error: err };
    }

    setValidating(true);
    setError(null);

    try {
      const response = await fetch('/api/license/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, hw_id: hwId }),
      });

      const data = await response.json();
      setLastResult(data);

      if (!data.valid) {
        setError(data.error || 'Invalid license key');
      }

      return data;
    } catch (err) {
      const errorMsg = 'Validation failed. Please try again.';
      setError(errorMsg);
      return { valid: false, error: errorMsg };
    } finally {
      setValidating(false);
    }
  }, []);

  return { validate, validating, error, lastResult };
}

export function useHwId(): string {
  const [hwId] = useState(() => {
    if (typeof window === 'undefined') return '';
    // Generate or retrieve hardware ID from localStorage
    let id = localStorage.getItem('hirebotai_hw_id');
    if (!id) {
      // Create a pseudo-HWID from browser fingerprint
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Hirebotai HWID', 2, 2);
      }
      const fingerprint = canvas.toDataURL() + navigator.userAgent + screen.width + screen.height;
      let hash = 0;
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      id = 'hw_' + Math.abs(hash).toString(36) + Date.now().toString(36);
      localStorage.setItem('hirebotai_hw_id', id);
    }
    return id;
  });

  return hwId;
}