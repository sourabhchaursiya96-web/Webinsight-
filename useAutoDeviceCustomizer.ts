import { useState, useEffect, useCallback } from 'react';
import { MobileSettings } from '../components/MobileCustomizerModal';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface DeviceInfo {
  type: DeviceType;
  width: number;
  height: number;
  isTouch: boolean;
  orientation: 'portrait' | 'landscape';
  devicePixelRatio: number;
  label: string;
  badgeColor: string;
}

export function getAutoPresetForDevice(info: DeviceInfo): MobileSettings {
  if (info.type === 'mobile') {
    return {
      density: 'compact',
      touchTargetSize: 'large',
      fontSize: 'sm',
      stickyDock: true,
      autoProfileName: `Mobile (${info.width}×${info.height}px - Touch Optimized)`,
    };
  } else if (info.type === 'tablet') {
    return {
      density: 'standard',
      touchTargetSize: 'large',
      fontSize: 'md',
      stickyDock: true,
      autoProfileName: `Tablet (${info.width}×${info.height}px - Touch & Dock)`,
    };
  } else {
    return {
      density: 'standard',
      touchTargetSize: 'standard',
      fontSize: 'md',
      stickyDock: false,
      autoProfileName: `Desktop (${info.width}×${info.height}px - Workstation)`,
    };
  }
}

export function useAutoDeviceCustomizer() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const h = typeof window !== 'undefined' ? window.innerHeight : 800;
    const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    let type: DeviceType = 'desktop';
    if (w < 640 || (w < 768 && isTouch)) {
      type = 'mobile';
    } else if ((w >= 640 && w <= 1024) || (isTouch && w <= 1180)) {
      type = 'tablet';
    }

    const orientation = w < h ? 'portrait' : 'landscape';
    const label = type === 'mobile' ? 'Smartphone' : type === 'tablet' ? 'Tablet / iPad' : 'Desktop PC';
    const badgeColor = type === 'mobile' ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' : type === 'tablet' ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

    return { type, width: w, height: h, isTouch, orientation, devicePixelRatio: dpr, label, badgeColor };
  });

  const [isAutoMode, setIsAutoMode] = useState<boolean>(() => {
    try {
      const isManual = localStorage.getItem('webaudit_manual_mobile_settings');
      return !isManual;
    } catch {
      return true;
    }
  });

  const [settings, setSettings] = useState<MobileSettings>(() => {
    const defaultInfo: DeviceInfo = {
      type: typeof window !== 'undefined' && window.innerWidth < 640 ? 'mobile' : 'desktop',
      width: typeof window !== 'undefined' ? window.innerWidth : 1280,
      height: typeof window !== 'undefined' ? window.innerHeight : 800,
      isTouch: typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0),
      orientation: 'landscape',
      devicePixelRatio: 1,
      label: 'Auto',
      badgeColor: 'text-cyan-400',
    };

    try {
      const saved = localStorage.getItem('webaudit_mobile_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return getAutoPresetForDevice(defaultInfo);
  });

  // Real-time device environment detection & auto customization
  const updateDeviceAndAutoCustomizer = useCallback(() => {
    if (typeof window === 'undefined') return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const dpr = window.devicePixelRatio || 1;

    let type: DeviceType = 'desktop';
    if (w < 640 || (w < 768 && isTouch)) {
      type = 'mobile';
    } else if ((w >= 640 && w <= 1024) || (isTouch && w <= 1180)) {
      type = 'tablet';
    }

    const orientation = w < h ? 'portrait' : 'landscape';
    const label = type === 'mobile' ? 'Smartphone' : type === 'tablet' ? 'Tablet / iPad' : 'Desktop PC';
    const badgeColor = type === 'mobile' ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' : type === 'tablet' ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

    const info: DeviceInfo = { type, width: w, height: h, isTouch, orientation, devicePixelRatio: dpr, label, badgeColor };
    setDeviceInfo(info);

    // If auto-mode is enabled, automatically adapt settings according to detected device
    if (isAutoMode) {
      const autoPreset = getAutoPresetForDevice(info);
      setSettings(autoPreset);
      try {
        localStorage.setItem('webaudit_mobile_settings', JSON.stringify(autoPreset));
      } catch (e) {
        console.error(e);
      }
    }
  }, [isAutoMode]);

  useEffect(() => {
    updateDeviceAndAutoCustomizer();
    window.addEventListener('resize', updateDeviceAndAutoCustomizer);
    window.addEventListener('orientationchange', updateDeviceAndAutoCustomizer);

    return () => {
      window.removeEventListener('resize', updateDeviceAndAutoCustomizer);
      window.removeEventListener('orientationchange', updateDeviceAndAutoCustomizer);
    };
  }, [updateDeviceAndAutoCustomizer]);

  const updateSettingsManually = (newSettings: MobileSettings) => {
    setIsAutoMode(false);
    setSettings(newSettings);
    try {
      localStorage.setItem('webaudit_manual_mobile_settings', 'true');
      localStorage.setItem('webaudit_mobile_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.error(e);
    }
  };

  const resetToAutoDevicePreset = () => {
    setIsAutoMode(true);
    try {
      localStorage.removeItem('webaudit_manual_mobile_settings');
    } catch (e) {
      console.error(e);
    }
    const autoPreset = getAutoPresetForDevice(deviceInfo);
    setSettings(autoPreset);
    try {
      localStorage.setItem('webaudit_mobile_settings', JSON.stringify(autoPreset));
    } catch (e) {
      console.error(e);
    }
  };

  return {
    deviceInfo,
    settings,
    isAutoMode,
    updateSettingsManually,
    resetToAutoDevicePreset,
  };
}
