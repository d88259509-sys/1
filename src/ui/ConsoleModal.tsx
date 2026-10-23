/**
 * Counter-Strike 1.6 Developer & Cheat Console
 * Commands: god, noclip, money 16000, give ak47, give awp, infinite_ammo,
 * bot_add, bot_kill, speed 2, gravity 0.5, wallhack, restart, map <nuke|inferno|marokos>
 */

import React, { useEffect, useRef, useState } from 'react';

interface ConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecute: (cmd: string) => void;
  history: string[];
}

export const ConsoleModal: React.FC<ConsoleModalProps> = ({
  isOpen,
  onClose,
  onExecute,
  history,
}) => {
  const [inputVal, setInputVal] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    onExecute(inputVal.trim());
    setInputVal('');
  };

  const quickCommands = [
    'god',
    'noclip',
    'money 16000',
    'give ak47',
    'give awp',
    'give deagle',
    'infinite_ammo',
    'bot_add',
    'bot_kill',
    'wallhack',
    'restart',
    'map nuke',
    'map inferno',
    'map marokos',
  ];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 font-mono select-none p-6">
      <div className="w-[680px] h-[480px] bg-[#121619] border-2 border-[#3d444b] rounded-lg shadow-2xl flex flex-col overflow-hidden text-[#00ff41]">
        {/* Title Bar */}
        <div className="bg-[#1e2328] px-4 py-2 border-b border-[#3d444b] flex items-center justify-between text-xs text-neutral-300">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#e19e05]">CS 1.6 Console</span>
            <span className="text-neutral-500">v1.6.0.4 - Build 4554</span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white px-2 py-0.5 rounded hover:bg-neutral-800 transition cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>

        {/* Quick Cheat Buttons Bar */}
        <div className="bg-[#181d22] px-3 py-1.5 border-b border-[#2b3137] flex items-center gap-1.5 overflow-x-auto text-[11px] scrollbar-none">
          <span className="text-neutral-400 text-[10px] uppercase font-bold shrink-0">Quick:</span>
          {quickCommands.map((qc) => (
            <button
              key={qc}
              onClick={() => onExecute(qc)}
              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-[#00ff41] transition shrink-0 cursor-pointer border border-neutral-700/60"
            >
              {qc}
            </button>
          ))}
        </div>

        {/* History Log Window */}
        <div className="flex-1 p-3.5 overflow-y-auto text-xs flex flex-col gap-1 leading-relaxed bg-[#0c0f12]">
          <div className="text-neutral-500 text-[11px] mb-2 border-b border-neutral-800 pb-1">
            Console initialized. Type 'help' for command list. Press ESC to return to match.
          </div>
          {history.map((line, idx) => (
            <div key={idx} className="break-words font-mono text-[12px] opacity-90">
              {line.startsWith('>') ? (
                <span className="text-[#e19e05] font-bold">{line}</span>
              ) : (
                <span className="text-emerald-400">{line}</span>
              )}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>

        {/* Command Input Field */}
        <form onSubmit={handleSubmit} className="bg-[#1a1f24] p-2.5 border-t border-[#3d444b] flex items-center gap-2">
          <span className="text-[#e19e05] font-bold text-sm">]</span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Enter cheat or command (e.g. give awp, money 16000, god)..."
            className="flex-1 bg-transparent text-sm text-neutral-100 placeholder-neutral-500 outline-none font-mono"
          />
          <button
            type="submit"
            className="px-4 py-1 rounded bg-[#00ff41]/20 hover:bg-[#00ff41]/30 text-[#00ff41] text-xs font-bold border border-[#00ff41]/40 transition cursor-pointer"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};
