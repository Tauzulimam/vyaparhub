'use client';

import { useState, useEffect, useCallback } from 'react';
import { Address, UserProfile } from '@/types';
import { mockUserProfile } from '@/data/mockData';

const PROFILE_STORAGE_KEY = 'vyaparhub_mock_profile';

const profileManager = {
  profile: { ...mockUserProfile } as UserProfile,
  isHydrated: false,
  listeners: new Set<() => void>(),

  notify() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(this.profile));
      } catch {
        // ignore storage errors
      }
    }
    this.listeners.forEach((callback) => callback());
  },

  initFromLocalStorage() {
    if (typeof window === 'undefined' || this.isHydrated) return;
    this.isHydrated = true;
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.name && Array.isArray(parsed.savedAddresses)) {
          this.profile = parsed;
        }
      }
    } catch {
      // keep default memory state
    }
  },

  updateProfile(data: Partial<UserProfile>) {
    this.initFromLocalStorage();
    this.profile = {
      ...this.profile,
      ...data,
    };
    this.notify();
  },

  addAddress(addrInput: Omit<Address, 'id'>): Address {
    this.initFromLocalStorage();
    const newId = `addr-${Date.now()}`;
    const newAddress: Address = {
      ...addrInput,
      id: newId,
      isDefault: addrInput.isDefault || this.profile.savedAddresses.length === 0,
    };

    let updatedList = [...this.profile.savedAddresses];
    if (newAddress.isDefault) {
      updatedList = updatedList.map((a) => ({ ...a, isDefault: false }));
    }
    updatedList.push(newAddress);

    this.profile = {
      ...this.profile,
      savedAddresses: updatedList,
    };
    this.notify();
    return newAddress;
  },

  updateAddress(id: string, addrData: Partial<Address>) {
    this.initFromLocalStorage();
    let updatedList = this.profile.savedAddresses.map((a) => {
      if (a.id === id) {
        return { ...a, ...addrData };
      }
      return a;
    });

    if (addrData.isDefault) {
      updatedList = updatedList.map((a) => (a.id === id ? a : { ...a, isDefault: false }));
    }

    this.profile = {
      ...this.profile,
      savedAddresses: updatedList,
    };
    this.notify();
  },

  deleteAddress(id: string) {
    this.initFromLocalStorage();
    const filtered = this.profile.savedAddresses.filter((a) => a.id !== id);
    if (filtered.length > 0 && !filtered.some((a) => a.isDefault)) {
      filtered[0] = { ...filtered[0], isDefault: true };
    }
    this.profile = {
      ...this.profile,
      savedAddresses: filtered,
    };
    this.notify();
  },

  setDefaultAddress(id: string) {
    this.initFromLocalStorage();
    const updated = this.profile.savedAddresses.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));
    this.profile = {
      ...this.profile,
      savedAddresses: updated,
    };
    this.notify();
  },

  updatePreferences(prefs: Partial<UserProfile['preferences']>) {
    this.initFromLocalStorage();
    this.profile = {
      ...this.profile,
      preferences: {
        ...this.profile.preferences,
        ...prefs,
      },
    };
    this.notify();
  },
};

export function useMockProfile() {
  const [, setTick] = useState(0);

  useEffect(() => {
    profileManager.initFromLocalStorage();
    const update = () => setTick((t) => t + 1);
    profileManager.listeners.add(update);
    update();
    return () => {
      profileManager.listeners.delete(update);
    };
  }, []);

  const profile = profileManager.profile;

  const updateProfile = useCallback(
    (data: Partial<UserProfile>) => profileManager.updateProfile(data),
    []
  );
  const addAddress = useCallback(
    (addrInput: Omit<Address, 'id'>) => profileManager.addAddress(addrInput),
    []
  );
  const updateAddress = useCallback(
    (id: string, addrData: Partial<Address>) => profileManager.updateAddress(id, addrData),
    []
  );
  const deleteAddress = useCallback((id: string) => profileManager.deleteAddress(id), []);
  const setDefaultAddress = useCallback(
    (id: string) => profileManager.setDefaultAddress(id),
    []
  );
  const updatePreferences = useCallback(
    (prefs: Partial<UserProfile['preferences']>) => profileManager.updatePreferences(prefs),
    []
  );

  return {
    profile,
    updateProfile,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    updatePreferences,
  };
}
