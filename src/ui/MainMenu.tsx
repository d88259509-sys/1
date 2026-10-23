/**
 * Counter-Strike 1.6 Authentic Main Menu
 * Select map, team, bot difficulty, and launch match.
 */

import React from 'react';
import { BotDifficulty, Team } from '../types';

interface MainMenuProps {
  onStartGame: (mapId: 'de_nuke' | 'de_inferno' | 'de_marokos', team: Team, difficulty: BotDifficulty) => void;
  onOpenSettings: () => void;
  currentMap: 'de_nuke' | 'de_inferno' | 'de_marokos';
  currentTeam: Team;
  currentDifficulty: BotDifficulty;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  onOpenSettings,
  currentMap,
  currentTeam,
  currentDifficulty,
}) => {
  const [selectedMap, setSelectedMap] = React.useState<'de_nuke' | 'de_inferno' | 'de_marokos'>(currentMap);
  const [selectedTeam, setSelectedTeam] = React.useState<Team>(currentTeam);
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<BotDifficulty>(currentDifficulty);

  const maps = [
    {
      id: 'de_nuke' as const,
      name: 'de_nuke',
      desc: 'Nuclear power facility with upper Site A & lower Site B connected by vents.',
      badge: 'Industrial',
      accent: 'border-amber-600/70',
    },
    {
      id: 'de_inferno' as const,
      name: 'de_inferno',
      desc: 'Mediterranean village with Banana alley, Church fountain, and Mid Apartments.',
      badge: 'Italian Village',
      accent: 'border-red-600/70',
    },
    {
      id: 'de_marokos' as const,
      name: 'de_marokos',
      desc: 'Moroccan desert bazaar citadel with sandstone alleys, market stalls, and rooftops.',
      badge: 'Desert Citadel',
      accent: 'border-yellow-600/70',
    },
  ];

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-between p-8 bg-gradient-to-br from-[#0c0f12] via-[#14191e] to-[#0a0d10] font-mono select-none overflow-y-auto">
      {/* Top Header & CS 1.6 Logo Lockup */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            {/* Retro Crosshair SVG Icon */}
            <svg className="w-10 h-10 text-[#e19e05]" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="6" />
              <circle cx="50" cy="50" r="16" stroke="currentColor" strokeWidth="4" />
              <line x1="50" y1="2" x2="50" y2="30" stroke="currentColor" strokeWidth="6" />
              <line x1="50" y1="70" x2="50" y2="98" stroke="currentColor" strokeWidth="6" />
              <line x1="2" y1="50" x2="30" y2="50" stroke="currentColor" strokeWidth="6" />
              <line x1="70" y1="50" x2="98" y2="50" stroke="currentColor" strokeWidth="6" />
            </svg>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-[#e19e05] drop-shadow-md">
                COUNTER-STRIKE <span className="text-white text-3xl font-light">1.6</span>
              </h1>
              <p className="text-xs uppercase tracking-widest text-[#00ff41] font-bold">
                Tactical 3D Browser FPS · Bomb Defusal Mode
              </p>
            </div>
          </div>
        </div>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 px-4 py-2 rounded bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-bold transition cursor-pointer"
        >
          <span>⚙ Options</span>
        </button>
      </div>

      {/* Main Content: Map Selection & Team Setup */}
      <div className="my-auto max-w-5xl w-full mx-auto flex flex-col gap-8 py-6">
        {/* Map Selection */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <span className="text-xs uppercase font-bold text-neutral-400 tracking-wider">
              1. Select Map / Arenas
            </span>
            <span className="text-xs text-[#00ff41]">Procedurally Generated 3D Environments</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {maps.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMap(m.id)}
                className={`p-5 rounded-lg border-2 text-left transition flex flex-col justify-between cursor-pointer ${
                  selectedMap === m.id
                    ? `${m.accent} bg-neutral-800/90 shadow-xl ring-2 ring-[#e19e05]/50`
                    : 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-850 opacity-75 hover:opacity-100'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl font-black text-white">{m.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-800 text-[#e19e05] uppercase">
                      {m.badge}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">{m.desc}</p>
                </div>
                <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-neutral-500">
                  <span>Bomb Sites: A & B</span>
                  <span className={selectedMap === m.id ? 'text-[#00ff41]' : 'text-neutral-600'}>
                    {selectedMap === m.id ? '● Selected' : 'Select'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Team & Difficulty Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team Select */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs uppercase font-bold text-neutral-400 tracking-wider">
              2. Choose Your Faction
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedTeam('CT')}
                className={`p-4 rounded-lg border-2 transition cursor-pointer flex flex-col items-center gap-1 ${
                  selectedTeam === 'CT'
                    ? 'border-blue-500 bg-blue-950/60 text-blue-300 shadow-lg'
                    : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white'
                }`}
              >
                <span className="text-2xl">🛡</span>
                <span className="font-black text-sm uppercase">Counter-Terrorists</span>
                <span className="text-[11px] text-neutral-400">Defuse bomb / Defend</span>
              </button>

              <button
                onClick={() => setSelectedTeam('T')}
                className={`p-4 rounded-lg border-2 transition cursor-pointer flex flex-col items-center gap-1 ${
                  selectedTeam === 'T'
                    ? 'border-amber-500 bg-amber-950/60 text-amber-300 shadow-lg'
                    : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white'
                }`}
              >
                <span className="text-2xl">💣</span>
                <span className="font-black text-sm uppercase">Terrorists</span>
                <span className="text-[11px] text-neutral-400">Carry C4 / Plant & Detonate</span>
              </button>
            </div>
          </div>

          {/* Bot Difficulty */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs uppercase font-bold text-neutral-400 tracking-wider">
              3. Bot Combat Difficulty
            </span>
            <div className="grid grid-cols-4 gap-2">
              {(['EASY', 'NORMAL', 'HARD', 'EXPERT'] as BotDifficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDifficulty(d)}
                  className={`py-3 rounded border text-xs font-bold transition cursor-pointer flex flex-col items-center gap-1 ${
                    selectedDifficulty === d
                      ? 'border-[#00ff41] bg-neutral-800 text-[#00ff41] shadow'
                      : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white'
                  }`}
                >
                  <span>{d}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Start Game Big CTA Button */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <button
            onClick={() => onStartGame(selectedMap, selectedTeam, selectedDifficulty)}
            className="w-full md:w-96 py-4 rounded-lg bg-[#e19e05] hover:bg-[#c98b02] active:scale-[0.98] text-black font-black text-lg tracking-wider uppercase transition shadow-2xl cursor-pointer flex items-center justify-center gap-3"
          >
            <span>JOIN GAME SERVER</span>
            <span className="text-xl">▶</span>
          </button>
          <span className="text-[11px] text-neutral-500">
            Press to enter full 3D simulation with Pointer Lock controls
          </span>
        </div>
      </div>

      {/* Footer: Controls Reference Bar */}
      <div className="border-t border-neutral-800/80 pt-3 flex flex-wrap items-center justify-between text-[11px] text-neutral-400">
        <div className="flex flex-wrap items-center gap-3">
          <span><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-200">WASD</kbd> Move</span>
          <span><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-200">SPACE</kbd> Jump</span>
          <span><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-200">CTRL</kbd> Crouch</span>
          <span><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-200">SHIFT</kbd> Silent Walk</span>
          <span><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-200">LMB</kbd> Fire</span>
          <span><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-200">RMB</kbd> Alt-Fire / Zoom</span>
          <span><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-200">B</kbd> Buy</span>
          <span><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-200">E</kbd> Plant/Defuse</span>
          <span><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-200">T</kbd> Spray</span>
          <span><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-200">ESC</kbd> Console</span>
        </div>
        <span className="text-neutral-500 font-bold">100% Procedural · No External Assets</span>
      </div>
    </div>
  );
};
