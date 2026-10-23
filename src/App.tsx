/**
 * Counter-Strike 1.6 Web3D Main Application
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import {
  BotDifficulty,
  EntityState,
  GameState,
  KillFeedItem,
  RadioMessage,
  Team,
  UserSettings,
  WeaponId,
} from './types';
import { BuyMenu } from './ui/BuyMenu';
import { ConsoleModal } from './ui/ConsoleModal';
import { HUD } from './ui/HUD';
import { MainMenu } from './ui/MainMenu';
import { Scoreboard } from './ui/Scoreboard';
import { SettingsModal } from './ui/SettingsModal';

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // High-level App States
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [currentMap, setCurrentMap] = useState<'de_nuke' | 'de_inferno' | 'de_marokos'>('de_nuke');
  const [playerTeam, setPlayerTeam] = useState<Team>('CT');
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('NORMAL');

  // Modals & Overlays
  const [isBuyMenuOpen, setIsBuyMenuOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(false);

  // Round / Match Banner
  const [roundEndBanner, setRoundEndBanner] = useState<{ winner: Team; reason: string } | null>(null);
  const [matchWinner, setMatchWinner] = useState<Team | null>(null);

  // Console log history
  const [consoleHistory, setConsoleHistory] = useState<string[]>([
    'Welcome to Counter-Strike 1.6 Web3D!',
    "Protocol version 48, Server 'de_dust2_reborn'",
    "Type 'help' to inspect cheat commands (god, noclip, give ak47, money 16000, etc.)",
  ]);

  // Real-time HUD stats
  const [hudData, setHudData] = useState({
    health: 100,
    armor: 0,
    money: 800,
    currentWeapon: 'usp' as WeaponId,
    ammo: 12,
    reserve: 100,
    roundTime: 115,
    roundNumber: 1,
    scoreCT: 0,
    scoreT: 0,
    team: 'CT' as Team,
    isPlanted: false,
    bombTimer: 40,
    plantProgress: 0,
    defuseProgress: 0,
    hasDefuser: false,
    hasC4: false,
    canBuy: true,
    flashIntensity: 0,
    crosshairSpread: 0,
    isScoped: 0,
    isDead: false,
    isSpectating: false,
    spectatorTargetName: '',
    hitmarker: false,
    isSilenced: false,
    isBurst: false,
  });

  const [killFeed, setKillFeed] = useState<KillFeedItem[]>([]);
  const [radioMessages, setRadioMessages] = useState<RadioMessage[]>([]);
  const [entities, setEntities] = useState<EntityState[]>([]);

  // User Settings
  const [settings, setSettings] = useState<UserSettings>({
    mouseSensitivity: 1.8,
    masterVolume: 0.8,
    fov: 90,
    crosshairColor: '#00ff41',
    crosshairSize: 8,
    crosshairGap: 4,
    language: 'en',
  });

  // Initialize GameEngine
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const engine = new GameEngine(canvasContainerRef.current, {
      onStateUpdate: (state) => {
        setHudData(state);
      },
      onKillFeed: (item) => {
        setKillFeed((prev) => [...prev, item]);
      },
      onRadioMessage: (msg) => {
        setRadioMessages((prev) => [...prev, msg]);
      },
      onRoundEnd: (winner, reason) => {
        setRoundEndBanner({ winner, reason });
        setTimeout(() => setRoundEndBanner(null), 4000);
      },
      onMatchEnd: (winner) => {
        setMatchWinner(winner);
        setGameState('MATCH_END');
      },
      onEntitiesUpdate: (ents) => {
        setEntities([...ents]);
      },
      onConsoleLog: (text) => {
        setConsoleHistory((prev) => [...prev, text]);
      },
    });

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Global key handling (Tab for scoreboard, B for buy menu, ESC for console)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        setIsScoreboardOpen(true);
      } else if (e.code === 'Escape') {
        e.preventDefault();
        if (isBuyMenuOpen) {
          setIsBuyMenuOpen(false);
          engineRef.current?.lockPointer();
        } else if (isSettingsOpen) {
          setIsSettingsOpen(false);
          engineRef.current?.lockPointer();
        } else {
          // Toggle console
          setIsConsoleOpen((prev) => {
            const next = !prev;
            if (next) engineRef.current?.unlockPointer();
            else engineRef.current?.lockPointer();
            return next;
          });
        }
      } else if (e.code === 'KeyB') {
        if (gameState === 'PLAYING' && !isConsoleOpen && !isSettingsOpen) {
          if (hudData.canBuy) {
            setIsBuyMenuOpen((prev) => {
              const next = !prev;
              if (next) engineRef.current?.unlockPointer();
              else engineRef.current?.lockPointer();
              return next;
            });
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        setIsScoreboardOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, isBuyMenuOpen, isConsoleOpen, isSettingsOpen, hudData.canBuy]);

  const handleStartGame = (mapId: 'de_nuke' | 'de_inferno' | 'de_marokos', team: Team, difficulty: BotDifficulty) => {
    setCurrentMap(mapId);
    setPlayerTeam(team);
    setBotDifficulty(difficulty);
    setGameState('PLAYING');
    setMatchWinner(null);
    setRoundEndBanner(null);

    if (engineRef.current) {
      engineRef.current.botDifficulty = difficulty;
      engineRef.current.loadMap(mapId);
      engineRef.current.startNewMatch(team);
      engineRef.current.lockPointer();
    }
  };

  const handleUpdateSettings = (newSettings: Partial<UserSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    engineRef.current?.setSettings(newSettings);
  };

  const handleConsoleCommand = (cmd: string) => {
    setConsoleHistory((prev) => [...prev, `> ${cmd}`]);
    engineRef.current?.executeConsoleCommand(cmd);
  };

  const handleBuyItem = (weaponId: WeaponId) => {
    engineRef.current?.buyItem(weaponId);
    engineRef.current?.lockPointer();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black font-mono select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={canvasContainerRef} className="absolute inset-0 z-0 w-full h-full" />

      {/* Main Menu Screen */}
      {gameState === 'MENU' && (
        <MainMenu
          onStartGame={handleStartGame}
          onOpenSettings={() => setIsSettingsOpen(true)}
          currentMap={currentMap}
          currentTeam={playerTeam}
          currentDifficulty={botDifficulty}
        />
      )}

      {/* In-Game HUD Overlay */}
      {gameState === 'PLAYING' && (
        <HUD
          health={hudData.health}
          armor={hudData.armor}
          money={hudData.money}
          currentWeapon={hudData.currentWeapon}
          ammo={hudData.ammo}
          reserve={hudData.reserve}
          roundTime={hudData.roundTime}
          roundNumber={hudData.roundNumber}
          scoreCT={hudData.scoreCT}
          scoreT={hudData.scoreT}
          team={hudData.team}
          isPlanted={hudData.isPlanted}
          bombTimer={hudData.bombTimer}
          plantProgress={hudData.plantProgress}
          defuseProgress={hudData.defuseProgress}
          hasDefuser={hudData.hasDefuser}
          hasC4={hudData.hasC4}
          canBuy={hudData.canBuy}
          flashIntensity={hudData.flashIntensity}
          crosshairSpread={hudData.crosshairSpread}
          crosshairColor={settings.crosshairColor}
          isScoped={hudData.isScoped}
          isDead={hudData.isDead}
          isSpectating={hudData.isSpectating}
          spectatorTargetName={hudData.spectatorTargetName}
          hitmarker={hudData.hitmarker}
          isSilenced={hudData.isSilenced}
          isBurst={hudData.isBurst}
          killFeed={killFeed}
          radioMessages={radioMessages}
          entities={entities}
          playerYaw={engineRef.current?.player.rotation.yaw || 0}
        />
      )}

      {/* Round End Announcement Banner */}
      {roundEndBanner && gameState === 'PLAYING' && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 flex flex-col items-center bg-black/85 border-2 border-neutral-700 px-8 py-4 rounded-xl shadow-2xl animate-fade-in pointer-events-none">
          <span
            className={`text-3xl font-black uppercase tracking-wider ${
              roundEndBanner.winner === 'CT' ? 'text-blue-400' : 'text-amber-500'
            }`}
          >
            {roundEndBanner.winner === 'CT' ? 'Counter-Terrorists Win' : 'Terrorists Win'}
          </span>
          <span className="text-sm font-semibold text-neutral-300 mt-1">
            {roundEndBanner.reason}
          </span>
        </div>
      )}

      {/* Match End Victory / Defeat Modal */}
      {gameState === 'MATCH_END' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <div className="w-[500px] bg-[#1a1e22] border-2 border-[#e19e05] rounded-xl p-8 shadow-2xl flex flex-col items-center text-center">
            <span className="text-xs uppercase tracking-widest text-[#00ff41] font-bold">
              Match Completed · Best of 30
            </span>
            <h2 className="text-4xl font-black mt-2 text-[#e19e05] uppercase">
              {matchWinner === 'CT' ? 'Counter-Terrorists Victory!' : 'Terrorists Victory!'}
            </h2>
            <div className="flex items-center gap-6 my-6 text-3xl font-black">
              <span className="text-blue-400">CT {hudData.scoreCT}</span>
              <span className="text-neutral-500">:</span>
              <span className="text-amber-500">{hudData.scoreT} T</span>
            </div>
            <button
              onClick={() => setGameState('MENU')}
              className="px-8 py-3 rounded-lg bg-[#e19e05] hover:bg-[#c98b02] text-black font-black uppercase text-sm tracking-wider transition cursor-pointer shadow-lg"
            >
              Play Again / Main Menu
            </button>
          </div>
        </div>
      )}

      {/* Buy Menu Overlay */}
      <BuyMenu
        isOpen={isBuyMenuOpen}
        onClose={() => {
          setIsBuyMenuOpen(false);
          engineRef.current?.lockPointer();
        }}
        onBuy={handleBuyItem}
        playerMoney={hudData.money}
        playerTeam={playerTeam}
      />

      {/* Developer & Cheat Console */}
      <ConsoleModal
        isOpen={isConsoleOpen}
        onClose={() => {
          setIsConsoleOpen(false);
          engineRef.current?.lockPointer();
        }}
        onExecute={handleConsoleCommand}
        history={consoleHistory}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          if (gameState === 'PLAYING') engineRef.current?.lockPointer();
        }}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* Scoreboard (Tab) */}
      <Scoreboard
        isOpen={isScoreboardOpen}
        entities={entities}
        scoreCT={hudData.scoreCT}
        scoreT={hudData.scoreT}
        currentMap={currentMap}
      />
    </div>
  );
}
