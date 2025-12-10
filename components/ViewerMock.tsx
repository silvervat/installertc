
import React from 'react';
import { AssemblyPart, AppMode } from '../types';
import { Box, Layers, MousePointer2, Settings2, ToggleLeft, ToggleRight } from 'lucide-react';

interface ViewerMockProps {
  parts: AssemblyPart[];
  onPartClick: (id: string) => void;
  mode: AppMode;
  assemblySelectionEnabled: boolean;
  onToggleAssemblySelection: () => void;
}

export const ViewerMock: React.FC<ViewerMockProps> = ({ 
  parts, 
  onPartClick, 
  mode,
  assemblySelectionEnabled,
  onToggleAssemblySelection
}) => {
  return (
    <div className="relative w-full h-full bg-slate-100 overflow-hidden flex flex-col">
      {/* Fake Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <div className="bg-white p-2 rounded-md shadow-sm border border-slate-200 text-slate-500">
          <Box size={20} />
        </div>
        <div className="bg-white p-2 rounded-md shadow-sm border border-slate-200 text-slate-500">
          <Layers size={20} />
        </div>
        <div className="bg-blue-600 p-2 rounded-md shadow-sm border border-blue-700 text-white">
          <MousePointer2 size={20} />
        </div>
      </div>

      {/* Assembly Selection Simulation Toggle (Top Center) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur p-2 px-4 rounded-full shadow-md border border-slate-200 flex items-center gap-3">
        <div className="flex flex-col items-end leading-tight">
          <span className="text-[10px] font-bold text-gray-500 uppercase">Trimble API Simulatsioon</span>
          <span className={`text-xs font-semibold ${assemblySelectionEnabled ? 'text-green-600' : 'text-gray-600'}`}>
            Assembly Selection: {assemblySelectionEnabled ? 'ON' : 'OFF'}
          </span>
        </div>
        <button 
          onClick={onToggleAssemblySelection}
          className="text-slate-700 hover:text-blue-600 transition-colors"
          title="Lülita Assembly Selection sisse/välja"
        >
          {assemblySelectionEnabled ? <ToggleRight size={28} className="text-green-500" /> : <ToggleLeft size={28} className="text-gray-400" />}
        </button>
      </div>

      {/* 3D Viewport Simulation */}
      <div className="flex-1 flex items-center justify-center relative bg-gradient-to-br from-gray-200 to-gray-300">
        
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-3 rounded shadow-sm text-xs text-gray-500 text-right">
          <p className="font-bold text-gray-700 mb-1">Mudeli Eelvaade</p>
          <div className="flex items-center justify-end gap-2 mb-1">
            <span>Valimata (Ootel)</span>
            <span className="w-3 h-3 bg-gray-400 border border-gray-500 inline-block rounded-sm"></span>
          </div>
          <div className="flex items-center justify-end gap-2 mb-1">
            <span>Valitud</span>
            <span className="w-3 h-3 bg-green-400 border border-green-600 inline-block rounded-sm"></span>
          </div>
          {mode === 'installation' && (
            <div className="flex items-center justify-end gap-2">
              <span>Paigaldatud</span>
              <span className="w-3 h-3 bg-green-700 border border-green-900 inline-block rounded-sm"></span>
            </div>
          )}
          {mode === 'delivery' && (
            <div className="flex items-center justify-end gap-2">
              <span>Tarnitud</span>
              <span className="w-3 h-3 bg-blue-600 border border-blue-800 inline-block rounded-sm"></span>
            </div>
          )}
          {mode === 'bolts' && (
            <div className="flex items-center justify-end gap-2">
              <span>Pingutatud</span>
              <span className="w-3 h-3 bg-orange-500 border border-orange-700 inline-block rounded-sm"></span>
            </div>
          )}
        </div>

        {/* This SVG acts as the "3D Model" */}
        <svg viewBox="0 0 100 100" className="w-full max-w-2xl h-auto drop-shadow-2xl">
          {parts.map((part) => {
            // Logic: 
            // 1. If Selected -> Always Light Green (active action)
            // 2. If Not Selected -> Check Mode
            //    - Mode Installation: If installed -> Dark Green
            //    - Mode Delivery: If delivered -> Blue
            //    - Mode Bolts: If bolted -> Orange
            //    - Mode Stats: Show Installation status by default
            
            let fillColor = "#9ca3af"; // gray-400 (pending)
            let strokeColor = "#6b7280";

            if (part.isSelected) {
              fillColor = "#4ade80"; // green-400 (active selection)
              strokeColor = "#16a34a";
            } else {
              // Not selected, check existing status based on mode
              if (mode === 'installation' || mode === 'statistics') {
                if (part.installation) {
                  fillColor = "#15803d"; // green-700 (installed)
                  strokeColor = "#14532d";
                }
              } else if (mode === 'delivery') {
                if (part.delivery) {
                  fillColor = "#2563eb"; // blue-600 (delivered)
                  strokeColor = "#1e40af";
                }
              } else if (mode === 'bolts') {
                if (part.bolting) {
                  fillColor = "#f97316"; // orange-500 (bolted)
                  strokeColor = "#c2410c";
                }
              }
            }

            return (
              <g 
                key={part.id} 
                onClick={() => onPartClick(part.id)}
                className="cursor-pointer transition-all duration-300 hover:opacity-90"
              >
                {/* Simple shapes representing BIM objects */}
                <rect
                  x={part.position.x}
                  y={part.position.y}
                  width="12"
                  height="12"
                  rx="1"
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth="1"
                  className="transition-colors duration-300 ease-in-out"
                />
                <text 
                  x={part.position.x + 6} 
                  y={part.position.y - 2} 
                  fontSize="3" 
                  textAnchor="middle" 
                  fill="#374151"
                  className="select-none font-bold"
                >
                  {part.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
