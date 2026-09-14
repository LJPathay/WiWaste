import { useState, useEffect } from 'react';

/**
 * Hook to manage privacy consent for different purposes.
 * Returns an object with consent states and functions to update them.
 */
export function usePrivacyConsent() {
  const [consent, setConsent] = useState({
    necessary: true, // Necessary cookies are always enabled
    analytics: false,
    marketing: false,
    // Add other purposes as needed
  });

  // Load consent from localStorage on initial mount
  useEffect(() => {
    const savedConsent = localStorage.getItem('privacyConsent');
    if (savedConsent) {
      try {
        setConsent(JSON.parse(savedConsent));
      } catch (e) {
        console.error('Failed to parse consent from localStorage', e);
      }
    }
  }, []);

  // Save consent to localStorage whenever it changes
  useEffect(() => {
    // We don't save the necessary cookie because it's always true and not user-configurable
    const { necessary, ...toSave } = consent;
    localStorage.setItem('privacyConsent', JSON.stringify(toSave));
  }, [consent]);

  /**
   * Update consent for a specific purpose
   * @param purpose - The purpose to update (e.g., 'analytics', 'marketing')
   * @param value - The consent value (true or false)
   */
  const updateConsent = (purpose: keyof typeof consent, value: boolean) => {
    setConsent(prev => ({
      ...prev,
      [purpose]: value,
    }));
  };

  /**
   * Check if consent is given for a purpose
   * @param purpose - The purpose to check
   * @returns boolean - True if consent is given
   */
  const hasConsent = (purpose: keyof typeof consent) => {
    return consent[purpose];
  };

  /**
   * Reset all consent to default (necessary only)
   */
  const resetConsent = () => {
    setConsent({
      necessary: true,
      analytics: false,
      marketing: false,
    });
  };

  return {
    consent,
    updateConsent,
    hasConsent,
    resetConsent,
  };
}