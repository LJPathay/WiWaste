import { useState, useEffect } from 'react';
import { usePrivacyConsent } from '../../hooks/usePrivacyConsent';
import { Link } from 'react-router-dom';

const PrivacyBanner: React.FC = () => {
  const { consent, updateConsent, hasConsent } = usePrivacyConsent();
  const [showBanner, setShowBanner] = useState(true);

  // Check if consent has been dismissed (we'll use localStorage for simplicity)
  useEffect(() => {
    const dismissed = localStorage.getItem('privacyBannerDismissed');
    if (dismissed) {
      setShowBanner(false);
    }
  }, []);

  const acceptAll = () => {
    updateConsent('analytics', true);
    updateConsent('marketing', true);
    localStorage.setItem('privacyBannerDismissed', 'true');
    setShowBanner(false);
  };

  const acceptNecessaryOnly = () => {
    // Necessary is always true, so we just set analytics and marketing to false
    updateConsent('analytics', false);
    updateConsent('marketing', false);
    localStorage.setItem('privacyBannerDismissed', 'true');
    setShowBanner(false);
  };

  const openPreferences = () => {
    // In a real app, you might open a modal or redirect to a preferences page
    alert('Opening privacy preferences...');
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-gray-100 px-4 py-3 z-50">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm">
            We use cookies to enhance your experience, analyze site usage, and support our marketing efforts.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={acceptAll}
              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
            >
              Accept All
            </button>
            <button
              onClick={acceptNecessaryOnly}
              className="text-xs bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition"
            >
              Necessary Only
            </button>
            <button
              onClick={openPreferences}
              className="text-xs bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-800 transition"
            >
              Preferences
            </button>
          </div>
        </div>
        <div className="text-center sm:text-right mt-2 sm:mt-0">
          <Link
            to="/privacy"
            className="text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Learn More
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyBanner;