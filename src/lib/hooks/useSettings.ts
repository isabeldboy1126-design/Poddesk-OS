import { useState, useEffect } from 'react';

interface Settings {
  completionSound: boolean;
  theme: 'dark' | 'light' | 'custom';
}

const defaultSettings: Settings = {
  completionSound: true,
  theme: 'dark',
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('poddesk_settings');
      if (stored) {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      }
    } catch (e) {
      console.warn('Could not load poddesk settings', e);
    }
    setIsLoaded(true);
  }, []);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem('poddesk_settings', JSON.stringify(next));
      } catch (e) {
        console.warn('Could not save poddesk settings', e);
      }
      return next;
    });
  };

  return { settings, updateSetting, isLoaded };
}
