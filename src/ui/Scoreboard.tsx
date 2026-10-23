/**
 * Counter-Strike 1.6 Authentic Scoreboard (Tab)
 */

import React from 'react';
import { EntityState, Team } from '../types';

interface ScoreboardProps {
  isOpen: boolean;
  entities: EntityState[];
  scoreCT: number;
  scoreT: number;
  currentMap: string;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
  isOpen,
  entities,
  scoreCT,
  scoreT,
  currentMap,
}) => {
  if (!isOpen) return null;

  const ctPlayers = entities.filter((e) => e.team === 'CT');
  const tPlayers = entities.filter((e) => e.team === 'T');

  const renderTeamTable = (team: Team, players: EntityState[], score: number) => {
    const isCT = team === 'CT';
    return (
      <div className="flex-1 bg-black/85 rounded-lg border border-neutral-700 overflow-hidden shadow-2xl flex flex-col">
        {/* Team Header */}
        <div
          className={`flex items-center justify-between px-4 py-2.5 font-bold ${
            isCT ? 'bg-blue-950/80 text-blue-300 border-b border-blue-800/60' : 'bg-amber-950/80 text-amber-300 border-b border-amber-800/60'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base tracking-wider uppercase font-black">
              {isCT ? 'Counter-Terrorists' : 'Terrorists'}
            </span>
            <span className="text-xs text-neutral-400 font-normal">
              ({players.filter((p) => !p.isDead).length} alive)
            </span>
          </div>
          <span className="text-2xl font-black tabular-nums">{score}</span>
        </div>

        {/* Table Column Labels */}
        <div className="grid grid-cols-12 px-4 py-1.5 text-[11px] font-semibold text-neutral-400 border-b border-neutral-800 bg-neutral-900/60 uppercase">
          <span className="col-span-6">Player</span>
          <span className="col-span-2 text-center">Kills</span>
          <span className="col-span-2 text-center">Deaths</span>
          <span className="col-span-2 text-right">Ping</span>
        </div>

        {/* Players List */}
        <div className="flex flex-col divide-y divide-neutral-800/40 text-xs">
          {players.map((p) => (
            <div
              key={p.id}
              className={`grid grid-cols-12 px-4 py-2 items-center ${
                p.isPlayer ? 'bg-neutral-800/80 font-bold text-[#e19e05]' : 'text-neutral-200'
              } ${p.isDead ? 'opacity-40 line-through' : ''}`}
            >
              <div className="col-span-6 flex items-center gap-2 truncate">
                <span className="truncate">{p.name}</span>
                {p.inventory.hasC4 && <span title="Carrying C4">💣</span>}
                {p.inventory.hasDefuser && <span title="Defuse Kit">✂️</span>}
              </div>
              <span className="col-span-2 text-center tabular-nums">{p.kills}</span>
              <span className="col-span-2 text-center tabular-nums">{p.deaths}</span>
              <span className="col-span-2 text-right tabular-nums text-neutral-400">{p.ping}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 font-mono select-none pointer-events-none p-8">
      <div className="w-[840px] flex flex-col gap-4">
        {/* Header with Server & Map Info */}
        <div className="flex items-center justify-between text-xs text-neutral-400 px-2 font-semibold">
          <span>Map: <span className="text-neutral-200 font-bold">{currentMap}</span></span>
          <span className="tracking-widest uppercase text-neutral-400">Tactical 5v5 Bomb Defusal</span>
        </div>

        {/* 2 Team Columns */}
        <div className="flex gap-4">
          {renderTeamTable('CT', ctPlayers, scoreCT)}
          {renderTeamTable('T', tPlayers, scoreT)}
        </div>
      </div>
    </div>
  );
};
