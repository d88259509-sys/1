/**
 * Settings Modal for Counter-Strike 1.6 Web3D
 * Customizes mouse sensitivity, volume, FOV, crosshair color/size, and language.
 */

import React from 'react';
import { Language, UserSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const colors = [
    { name: 'Green', val: '#00ff41' },
    { name: 'Cyan', val: '#00ffff' },
    { name: 'Red', val: '#ff2222' },
    { name: 'Yellow', val: '#ffea00' },
    { name: 'White', val: '#ffffff' },
  ];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 font-mono select-none p-4">
      <div className="w-[500px] bg-[#1a1e22] border-2 border-neutral-700 rounded-lg p-6 shadow-2xl text-neutral-200">
        <div className="flex items-center justify-between border-b border-neutral-700 pb-3 mb-5">
          <span className="text-lg font-bold text-[#e19e05] uppercase tracking-wider">
            Game Options
          </span>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white px-2 py-0.5 rounded hover:bg-neutral-800 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-5 text-xs">
          {/* Mouse Sensitivity */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between font-semibold">
              <span className="text-neutral-300">Mouse Sensitivity</span>
              <span className="text-[#00ff41]">{settings.mouseSensitivity.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.1"
              value={settings.mouseSensitivity}
              onChange={(e) => onUpdateSettings({ mouseSensitivity: parseFloat(e.target.value) })}
              className="accent-[#e19e05] cursor-pointer"
            />
          </div>

          {/* Master Volume */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between font-semibold">
              <span className="text-neutral-300">Master Volume</span>
              <span className="text-[#00ff41]">{Math.round(settings.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.masterVolume}
              onChange={(e) => onUpdateSettings({ masterVolume: parseFloat(e.target.value) })}
              className="accent-[#e19e05] cursor-pointer"
            />
          </div>

          {/* Field of View (FOV) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between font-semibold">
              <span className="text-neutral-300">Field of View (FOV)</span>
              <span className="text-[#00ff41]">{settings.fov}°</span>
            </div>
            <input
              type="range"
              min="70"
              max="110"
              step="1"
              value={settings.fov}
              onChange={(e) => onUpdateSettings({ fov: parseInt(e.target.value, 10) })}
              className="accent-[#e19e05] cursor-pointer"
            />
          </div>

          {/* Crosshair Color */}
          <div className="flex flex-col gap-2">
            <span className="text-neutral-300 font-semibold">Crosshair Color</span>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c.val}
                  onClick={() => onUpdateSettings({ crosshairColor: c.val })}
                  className={`flex-1 py-1.5 rounded text-[11px] font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    settings.crosshairColor === c.val
                      ? 'border-white bg-neutral-800'
                      : 'border-neutral-700 bg-neutral-900/60 opacity-60 hover:opacity-100'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.val }} />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Language Selector */}
          <div className="flex flex-col gap-2">
            <span className="text-neutral-300 font-semibold">Language / Til / Язык</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { code: 'en' as Language, label: 'English' },
                { code: 'uz' as Language, label: "O'zbekcha" },
                { code: 'ru' as Language, label: 'Русский' },
              ].map((l) => (
                <button
                  key={l.code}
                  onClick={() => onUpdateSettings({ language: l.code })}
                  className={`py-2 rounded font-bold transition cursor-pointer border text-center ${
                    settings.language === l.code
                      ? 'border-[#e19e05] bg-neutral-800 text-[#e19e05]'
                      : 'border-neutral-700 bg-neutral-900/60 text-neutral-400 hover:text-white'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-neutral-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded bg-[#e19e05] hover:bg-[#c98b02] text-black font-bold text-xs uppercase transition cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
