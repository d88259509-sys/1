/**
 * Authentic Counter-Strike 1.6 HUD
 * Classic green/gold digital readouts, radar, killfeed, dynamic crosshair,
 * sniper scope overlay, plant/defuse progress bar, and flashbang blinding.
 */

import React from 'react';
import { EntityState, KillFeedItem, RadioMessage, Team, WeaponId } from '../types';

interface HUDProps {
  health: number;
  armor: number;
  money: number;
  currentWeapon: WeaponId;
  ammo: number;
  reserve: number;
  roundTime: number;
  roundNumber: number;
  scoreCT: number;
  scoreT: number;
  team: Team;
  isPlanted: boolean;
  bombTimer: number;
  plantProgress: number;
  defuseProgress: number;
  hasDefuser: boolean;
  hasC4: boolean;
  canBuy: boolean;
  flashIntensity: number;
  crosshairSpread: number;
  crosshairColor: string;
  isScoped: number;
  isDead: boolean;
  isSpectating: boolean;
  spectatorTargetName: string;
  hitmarker: boolean;
  isSilenced: boolean;
  isBurst: boolean;
  killFeed: KillFeedItem[];
  radioMessages: RadioMessage[];
  entities: EntityState[];
  playerYaw: number;
}

export const HUD: React.FC<HUDProps> = ({
  health,
  armor,
  money,
  currentWeapon,
  ammo,
  reserve,
  roundTime,
  roundNumber,
  scoreCT,
  scoreT,
  team,
  isPlanted,
  bombTimer,
  plantProgress,
  defuseProgress,
  hasDefuser,
  hasC4,
  canBuy,
  flashIntensity,
  crosshairSpread,
  crosshairColor,
  isScoped,
  isDead,
  isSpectating,
  spectatorTargetName,
  hitmarker,
  isSilenced,
  isBurst,
  killFeed,
  radioMessages,
  entities,
  playerYaw,
}) => {
  // Format seconds into MM:SS
  const mins = Math.floor(roundTime / 60);
  const secs = roundTime % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const playerEntity = entities.find((e) => e.isPlayer);
  const px = playerEntity ? playerEntity.position.x : 0;
  const pz = playerEntity ? playerEntity.position.z : 0;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-mono">
      {/* --- Flashbang White Screen Overlay --- */}
      {flashIntensity > 0 && (
        <div
          className="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity"
          style={{ opacity: flashIntensity }}
        />
      )}

      {/* --- Hitmarker --- */}
      {hitmarker && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
          <div className="w-5 h-5 relative">
            <div className="absolute w-2 h-0.5 bg-red-500 top-0 left-0 rotate-45 origin-top-left" />
            <div className="absolute w-2 h-0.5 bg-red-500 top-0 right-0 -rotate-45 origin-top-right" />
            <div className="absolute w-2 h-0.5 bg-red-500 bottom-0 left-0 -rotate-45 origin-bottom-left" />
            <div className="absolute w-2 h-0.5 bg-red-500 bottom-0 right-0 rotate-45 origin-bottom-right" />
          </div>
        </div>
      )}

      {/* --- Sniper Scope Reticle (AWP / Scout) --- */}
      {isScoped > 0 ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          {/* Black Vignette Mask */}
          <div className="absolute inset-0 bg-black/90 [mask-image:radial-gradient(circle_at_center,transparent_380px,black_400px)]" />
          {/* Scope Crosshair Lines */}
          <div className="absolute w-full h-[1px] bg-black/80" />
          <div className="absolute h-full w-[1px] bg-black/80" />
          <div className="w-[760px] h-[760px] rounded-full border border-black/40 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-red-500/70 tracking-widest mt-8">
            [ ZOOM {isScoped}x ]
          </div>
        </div>
      ) : (
        /* --- Dynamic CS 1.6 Crosshair --- */
        !isDead && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
            {/* Top */}
            <div
              className="absolute w-[2px] -translate-x-1/2"
              style={{
                backgroundColor: crosshairColor,
                height: '9px',
                bottom: `${4 + crosshairSpread}px`,
                boxShadow: '0 0 1px #000',
              }}
            />
            {/* Bottom */}
            <div
              className="absolute w-[2px] -translate-x-1/2"
              style={{
                backgroundColor: crosshairColor,
                height: '9px',
                top: `${4 + crosshairSpread}px`,
                boxShadow: '0 0 1px #000',
              }}
            />
            {/* Left */}
            <div
              className="absolute h-[2px] -translate-y-1/2"
              style={{
                backgroundColor: crosshairColor,
                width: '9px',
                right: `${4 + crosshairSpread}px`,
                boxShadow: '0 0 1px #000',
              }}
            />
            {/* Right */}
            <div
              className="absolute h-[2px] -translate-y-1/2"
              style={{
                backgroundColor: crosshairColor,
                width: '9px',
                left: `${4 + crosshairSpread}px`,
                boxShadow: '0 0 1px #000',
              }}
            />
          </div>
        )
      )}

      {/* --- Top Left: Radar / Minimap --- */}
      <div className="absolute top-4 left-4 z-20">
        <div className="w-36 h-36 rounded-full bg-black/60 border border-[#00ff41]/40 relative overflow-hidden backdrop-blur-xs shadow-lg">
          {/* Radar Sweep Rings */}
          <div className="absolute inset-4 rounded-full border border-[#00ff41]/20" />
          <div className="absolute inset-10 rounded-full border border-[#00ff41]/20" />
          <div className="absolute w-full h-[1px] top-1/2 bg-[#00ff41]/20" />
          <div className="absolute h-full w-[1px] left-1/2 bg-[#00ff41]/20" />

          {/* Bomb Sites A & B Markers */}
          <div className="absolute text-[10px] font-bold text-red-500/80 top-4 right-8">A</div>
          <div className="absolute text-[10px] font-bold text-red-500/80 bottom-4 left-6">B</div>

          {/* Planted Bomb Blink */}
          {isPlanted && (
            <div className="absolute top-1/2 right-7 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full animate-ping" />
          )}

          {/* Radar Entities */}
          {entities.map((e) => {
            if (e.isDead) return null;
            // Relative coordinates on radar (scaling 1 world meter = 1.6 radar px)
            const dx = (e.position.x - px) * 1.5;
            const dz = (e.position.z - pz) * 1.5;
            const left = 72 + dx;
            const top = 72 + dz;

            if (left < 4 || left > 140 || top < 4 || top > 140) return null;

            if (e.isPlayer) {
              return (
                <div
                  key={e.id}
                  className="absolute w-2 h-2 bg-[#00ff41] rounded-full -translate-x-1/2 -translate-y-1/2 z-10"
                  style={{ left: `${left}px`, top: `${top}px` }}
                />
              );
            }

            // Teammate dot
            const isTeammate = e.team === team;
            return (
              <div
                key={e.id}
                className={`absolute w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2 ${
                  isTeammate ? (team === 'CT' ? 'bg-blue-400' : 'bg-red-400') : 'bg-red-600'
                }`}
                style={{ left: `${left}px`, top: `${top}px` }}
              />
            );
          })}
        </div>
      </div>

      {/* --- Top Center: Round Timer, Scores & Round Count --- */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
        <div className="flex items-center gap-4 bg-black/70 px-5 py-2 rounded-md border border-neutral-800 shadow-md">
          {/* CT Score */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-400">CT</span>
            <span className="text-2xl font-black text-blue-400 tabular-nums">{scoreCT}</span>
          </div>

          {/* Timer */}
          <div className="flex flex-col items-center px-4 border-x border-neutral-700">
            <span
              className={`text-2xl font-black tracking-wider tabular-nums ${
                isPlanted ? 'text-red-500 animate-pulse' : 'text-[#e19e05]'
              }`}
            >
              {isPlanted ? `00:${bombTimer.toString().padStart(2, '0')}` : timeStr}
            </span>
            <span className="text-[10px] text-neutral-400 uppercase tracking-widest">
              Round {roundNumber}/30
            </span>
          </div>

          {/* T Score */}
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-amber-500 tabular-nums">{scoreT}</span>
            <span className="text-xs font-bold text-amber-500">TERRORIST</span>
          </div>
        </div>

        {/* Buy Zone Indicator */}
        {canBuy && (
          <div className="mt-2 text-xs text-[#00ff41] bg-black/50 px-3 py-0.5 rounded border border-[#00ff41]/30">
            [B] Buy Zone Active
          </div>
        )}
      </div>

      {/* --- Top Right: Kill Feed --- */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-1.5">
        {killFeed.slice(-5).map((kf) => (
          <div
            key={kf.id}
            className="flex items-center gap-2 bg-black/80 px-3 py-1 rounded text-xs border border-neutral-800 shadow animate-fade-in"
          >
            <span className={kf.killerTeam === 'CT' ? 'text-blue-400 font-bold' : 'text-amber-500 font-bold'}>
              {kf.killerName}
            </span>
            <span className="text-neutral-300 text-[11px] bg-neutral-900 px-1 rounded uppercase font-semibold">
              {kf.weapon}
            </span>
            {kf.isHeadshot && (
              <span className="text-red-500 font-bold text-sm" title="Headshot">
                🎯
              </span>
            )}
            {kf.isWallbang && (
              <span className="text-neutral-400 text-xs" title="Wallbang">
                🚪
              </span>
            )}
            <span className={kf.victimTeam === 'CT' ? 'text-blue-400 font-bold' : 'text-amber-500 font-bold'}>
              {kf.victimName}
            </span>
          </div>
        ))}
      </div>

      {/* --- Center: Plant / Defuse Progress Bar --- */}
      {(plantProgress > 0 || defuseProgress > 0) && (
        <div className="absolute top-2/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center">
          <span className="text-sm font-bold uppercase tracking-wider text-white mb-1.5 drop-shadow">
            {plantProgress > 0 ? 'Planting C4 Explosive...' : 'Defusing Bomb...'}
          </span>
          <div className="w-56 h-3 bg-black/80 border border-neutral-500 rounded p-0.5">
            <div
              className={`h-full rounded-sm transition-all duration-75 ${
                plantProgress > 0 ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ width: `${(plantProgress > 0 ? plantProgress : defuseProgress) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* --- Spectator Banner --- */}
      {isSpectating && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-black/80 text-white px-5 py-2 rounded border border-neutral-700 text-sm">
          Spectating: <span className="font-bold text-blue-400">{spectatorTargetName}</span>
        </div>
      )}

      {/* --- Radio Messages Chat Log (Bottom Left) --- */}
      <div className="absolute bottom-28 left-6 z-20 flex flex-col gap-1 max-w-sm">
        {radioMessages.slice(-4).map((msg) => (
          <div key={msg.id} className="text-xs bg-black/70 px-2.5 py-1 rounded border-l-2 border-[#00ff41]">
            <span className={msg.senderTeam === 'CT' ? 'text-blue-400 font-bold' : 'text-amber-500 font-bold'}>
              {msg.senderName}:{' '}
            </span>
            <span className="text-neutral-200">{msg.message}</span>
          </div>
        ))}
      </div>

      {/* --- Middle Left: Money ($16,000) --- */}
      <div className="absolute left-6 bottom-40 z-20">
        <span className="text-3xl font-black text-[#00ff41] tracking-wider drop-shadow-md">
          ${money}
        </span>
      </div>

      {/* --- Bottom Left: Health & Armor --- */}
      <div className="absolute bottom-6 left-6 z-20 flex items-center gap-6 bg-black/60 px-5 py-2.5 rounded-lg border border-neutral-800 backdrop-blur-xs">
        {/* Health */}
        <div className="flex items-center gap-2.5">
          <span className="text-2xl font-black text-[#e19e05]">+</span>
          <span className={`text-4xl font-black tracking-tight tabular-nums ${health <= 25 ? 'text-red-500' : 'text-[#e19e05]'}`}>
            {health}
          </span>
        </div>

        {/* Armor */}
        <div className="flex items-center gap-2.5 pl-4 border-l border-neutral-700">
          <span className="text-xl font-bold text-[#e19e05]">🛡</span>
          <span className="text-3xl font-black text-[#e19e05] tabular-nums">
            {armor}
          </span>
        </div>
      </div>

      {/* --- Bottom Center: C4 or Defuse Kit Icons --- */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4">
        {hasC4 && (
          <div className="bg-red-950/80 border border-red-600 px-3 py-1.5 rounded flex items-center gap-1.5 shadow">
            <span className="text-base">💣</span>
            <span className="text-xs font-bold text-red-400 uppercase">C4 Explosive</span>
          </div>
        )}
        {hasDefuser && (
          <div className="bg-blue-950/80 border border-blue-600 px-3 py-1.5 rounded flex items-center gap-1.5 shadow">
            <span className="text-base">✂️</span>
            <span className="text-xs font-bold text-blue-400 uppercase">Defuse Kit</span>
          </div>
        )}
      </div>

      {/* --- Bottom Right: Ammo & Weapon Info --- */}
      <div className="absolute bottom-6 right-6 z-20 flex items-center gap-5 bg-black/60 px-6 py-2.5 rounded-lg border border-neutral-800 backdrop-blur-xs">
        {/* Weapon info & mode */}
        <div className="flex flex-col items-end">
          <span className="text-xs uppercase font-bold text-neutral-400 tracking-wider">
            {currentWeapon}
          </span>
          {isSilenced && <span className="text-[10px] text-blue-400 font-semibold">[Silenced]</span>}
          {isBurst && <span className="text-[10px] text-amber-400 font-semibold">[Burst-Fire]</span>}
        </div>

        {/* Ammo Display */}
        {currentWeapon !== 'knife' && currentWeapon !== 'c4' && currentWeapon !== 'hegrenade' && currentWeapon !== 'flashbang' && currentWeapon !== 'smokegrenade' ? (
          <div className="flex items-baseline gap-1.5 pl-4 border-l border-neutral-700">
            <span className="text-4xl font-black text-[#e19e05] tabular-nums tracking-tight">
              {ammo}
            </span>
            <span className="text-lg font-bold text-[#e19e05]/60">/</span>
            <span className="text-2xl font-bold text-[#e19e05]/80 tabular-nums">
              {reserve}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
