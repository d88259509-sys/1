/**
 * Authentic Counter-Strike 1.6 Buy Menu
 * Number keys (1-7) & mouse selection for weapons, armor, and equipment.
 */

import React, { useEffect, useState } from 'react';
import { Team, WeaponId } from '../types';
import { WEAPON_REGISTRY } from '../weapons/WeaponDefs';

interface BuyMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onBuy: (weaponId: WeaponId) => void;
  playerMoney: number;
  playerTeam: Team;
}

type BuyCategory = 'ROOT' | 'PISTOLS' | 'SHOTGUNS' | 'SMGS' | 'RIFLES' | 'MACHINEGUNS' | 'EQUIPMENT' | 'GRENADES';

export const BuyMenu: React.FC<BuyMenuProps> = ({ isOpen, onClose, onBuy, playerMoney, playerTeam }) => {
  const [category, setCategory] = useState<BuyCategory>('ROOT');

  useEffect(() => {
    if (!isOpen) {
      setCategory('ROOT');
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyB') {
        if (category === 'ROOT') {
          onClose();
        } else {
          setCategory('ROOT');
        }
        return;
      }

      const num = parseInt(e.key, 10);
      if (isNaN(num)) return;

      if (category === 'ROOT') {
        switch (num) {
          case 1: setCategory('PISTOLS'); break;
          case 2: setCategory('SHOTGUNS'); break;
          case 3: setCategory('SMGS'); break;
          case 4: setCategory('RIFLES'); break;
          case 5: setCategory('MACHINEGUNS'); break;
          case 6: setCategory('EQUIPMENT'); break;
          case 7: setCategory('GRENADES'); break;
          case 0: onClose(); break;
        }
      } else {
        const items = getCategoryItems(category);
        if (num === 0) {
          setCategory('ROOT');
        } else if (num >= 1 && num <= items.length) {
          const item = items[num - 1];
          if (item && isItemAvailable(item.id)) {
            onBuy(item.id);
            onClose();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, category, playerMoney, playerTeam]);

  if (!isOpen) return null;

  const isItemAvailable = (id: WeaponId) => {
    const def = WEAPON_REGISTRY[id];
    if (def.team && def.team !== playerTeam) return false;
    return true;
  };

  const getCategoryItems = (cat: BuyCategory) => {
    switch (cat) {
      case 'PISTOLS':
        return [
          WEAPON_REGISTRY.glock18,
          WEAPON_REGISTRY.usp,
          WEAPON_REGISTRY.p228,
          WEAPON_REGISTRY.deagle,
          WEAPON_REGISTRY.fiveseven,
          WEAPON_REGISTRY.elites,
        ];
      case 'SHOTGUNS':
        return [WEAPON_REGISTRY.m3, WEAPON_REGISTRY.xm1014];
      case 'SMGS':
        return [
          WEAPON_REGISTRY.mp5,
          WEAPON_REGISTRY.ump45,
          WEAPON_REGISTRY.p90,
          WEAPON_REGISTRY.mac10,
          WEAPON_REGISTRY.tmp,
        ];
      case 'RIFLES':
        return playerTeam === 'T'
          ? [
              WEAPON_REGISTRY.galil,
              WEAPON_REGISTRY.ak47,
              WEAPON_REGISTRY.scout,
              WEAPON_REGISTRY.sg552,
              WEAPON_REGISTRY.awp,
              WEAPON_REGISTRY.g3sg1,
            ]
          : [
              WEAPON_REGISTRY.famas,
              WEAPON_REGISTRY.m4a1,
              WEAPON_REGISTRY.scout,
              WEAPON_REGISTRY.aug,
              WEAPON_REGISTRY.awp,
              WEAPON_REGISTRY.sg550,
            ];
      case 'MACHINEGUNS':
        return [WEAPON_REGISTRY.m249];
      case 'EQUIPMENT':
        return [
          WEAPON_REGISTRY.kevlar,
          WEAPON_REGISTRY.kevlar_helmet,
          WEAPON_REGISTRY.flashbang,
          WEAPON_REGISTRY.hegrenade,
          WEAPON_REGISTRY.smokegrenade,
          WEAPON_REGISTRY.defuser,
          WEAPON_REGISTRY.nvg,
        ];
      case 'GRENADES':
        return [WEAPON_REGISTRY.flashbang, WEAPON_REGISTRY.hegrenade, WEAPON_REGISTRY.smokegrenade];
      default:
        return [];
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 font-mono select-none">
      <div className="w-[440px] bg-[#1a1e22]/95 border-2 border-neutral-700 rounded-lg p-5 shadow-2xl text-[#d4af37]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-700 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-wider text-[#e19e05]">BUY MENU</span>
            <span className="text-xs text-neutral-400">({playerTeam})</span>
          </div>
          <span className="text-lg font-black text-[#00ff41]">${playerMoney}</span>
        </div>

        {/* ROOT CATEGORIES */}
        {category === 'ROOT' ? (
          <div className="flex flex-col gap-2">
            {[
              { id: 1, name: 'Pistols' },
              { id: 2, name: 'Shotguns' },
              { id: 3, name: 'Sub-Machine Guns' },
              { id: 4, name: 'Rifles' },
              { id: 5, name: 'Machine Guns' },
              { id: 6, name: 'Equipment' },
              { id: 7, name: 'Grenades' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  switch (cat.id) {
                    case 1: setCategory('PISTOLS'); break;
                    case 2: setCategory('SHOTGUNS'); break;
                    case 3: setCategory('SMGS'); break;
                    case 4: setCategory('RIFLES'); break;
                    case 5: setCategory('MACHINEGUNS'); break;
                    case 6: setCategory('EQUIPMENT'); break;
                    case 7: setCategory('GRENADES'); break;
                  }
                }}
                className="flex items-center justify-between px-3.5 py-2 rounded bg-neutral-800/80 hover:bg-neutral-700 text-left transition cursor-pointer text-sm font-semibold border border-neutral-700/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-amber-400 font-bold">{cat.id}.</span>
                  <span className="text-neutral-200">{cat.name}</span>
                </div>
                <span className="text-xs text-neutral-500">▶</span>
              </button>
            ))}

            <button
              onClick={onClose}
              className="mt-3 flex items-center justify-between px-3.5 py-2 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 text-xs font-semibold border border-neutral-800 cursor-pointer"
            >
              <span>0. Cancel / Exit</span>
              <span>ESC</span>
            </button>
          </div>
        ) : (
          /* SUB-CATEGORY WEAPON LIST */
          <div className="flex flex-col gap-2">
            <div className="text-xs uppercase tracking-wider text-neutral-400 font-bold mb-1">
              {category}
            </div>
            {getCategoryItems(category).map((item, idx) => {
              const num = idx + 1;
              const available = isItemAvailable(item.id);
              const affordable = playerMoney >= item.price;
              const disabled = !available || !affordable;

              return (
                <button
                  key={item.id}
                  disabled={disabled}
                  onClick={() => {
                    if (!disabled) {
                      onBuy(item.id);
                      onClose();
                    }
                  }}
                  className={`flex items-center justify-between px-3.5 py-2 rounded text-left transition cursor-pointer text-sm font-semibold border ${
                    disabled
                      ? 'bg-neutral-900/60 text-neutral-600 border-neutral-800/40 cursor-not-allowed'
                      : 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 border-neutral-700/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={disabled ? 'text-neutral-600' : 'text-amber-400 font-bold'}>{num}.</span>
                    <span>{item.name}</span>
                  </div>
                  <span className={affordable ? 'text-[#00ff41] font-bold' : 'text-red-500/70 font-semibold'}>
                    ${item.price}
                  </span>
                </button>
              );
            })}

            <button
              onClick={() => setCategory('ROOT')}
              className="mt-3 flex items-center justify-between px-3.5 py-2 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 text-xs font-semibold border border-neutral-800 cursor-pointer"
            >
              <span>0. Back to Main Buy Menu</span>
              <span>ESC</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
