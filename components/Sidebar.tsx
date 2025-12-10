import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AssemblyPart, InstallationRecord, DeliveryRecord, BoltingRecord, AppMode, DisplayField } from '../types';
import { 
  User, Save, Trash2, Box, Truck, BarChart3, Hammer, MousePointer2, History, AlertCircle, 
  ChevronRight, ChevronDown, Plus, X, ChevronsUpDown, CalendarDays, Settings, Wrench, AlertTriangle,
  Clock, TrendingUp, CheckCircle, PieChart, Construction, AlertOctagon, RefreshCcw,
  TowerControl, Forklift, BicepsFlexed, HelpCircle, Pencil, Calendar, XCircle, Info, ArrowLeft, CheckSquare
} from 'lucide-react';
import { DEFAULT_INSTALLER, DEFAULT_VEHICLE } from '../constants';

// --- HELPERS ---

const WEEKDAYS = ['pühapäev', 'esmaspäev', 'teisipäev', 'kolmapäev', 'neljapäev', 'reede', 'laupäev'];
const MONTHS = ['Jaanuar', 'Veebruar', 'Märts', 'Aprill', 'Mai', 'Juuni', 'Juuli', 'August', 'September', 'Oktoober', 'November', 'Detsember'];
const INSTALL_METHODS = ['Kraana', 'Upitaja', 'Käsitsi', 'MUU'];

const METHOD_ICONS: Record<string, React.ReactNode> = {
  'Kraana': <TowerControl size={16} />,
  'Upitaja': <Forklift size={16} />,
  'Käsitsi': <BicepsFlexed size={16} />,
  'MUU': <HelpCircle size={16} />
};

const METHOD_LABELS: Record<string, string> = {
  'Kraana': 'Kraana',
  'Upitaja': 'Teleskooplaadur (Upitaja)',
  'Käsitsi': 'Käsitsi (Muskel)',
  'MUU': 'Muu'
};

// Converts YYYY-MM-DD to dd.mm.yyyy
const toEstonianDate = (isoDate: string): string => {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
};

const formatDateLabel = (isoDate: string): string => {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = WEEKDAYS[date.getDay()];
  return `${toEstonianDate(isoDate)} - ${weekday}`;
};

const formatMonthLabel = (year: number, monthIdx: number): string => {
  return `${MONTHS[monthIdx]} ${year}`;
};

const getTodayIso = () => new Date().toISOString().split('T')[0];

const addHours = (timeStr: string, hours: number) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(h + hours, m);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

// --- INTERNAL COMPONENTS ---

// Checkbox Confirmation Component for Overwriting
interface OverwriteConfirmationProps {
  duplicates: AssemblyPart[];
  onConfirm: () => void;
  getPartLabel: (p: AssemblyPart) => string;
  mode: AppMode;
}

const OverwriteConfirmation: React.FC<OverwriteConfirmationProps> = ({ duplicates, onConfirm, getPartLabel, mode }) => {
  const [confirmed, setConfirmed] = useState(false);
  
  // Limit displayed duplicates to avoid huge DOM rendering if user selects 2000 items
  const DISPLAY_LIMIT = 20;
  const displayedDuplicates = duplicates.slice(0, DISPLAY_LIMIT);
  const remainingCount = duplicates.length - DISPLAY_LIMIT;

  return (
    <div className="text-xs">
      <p className="font-bold mb-1 flex items-center gap-1"><AlertOctagon size={12}/> Järgmised detailid on juba {mode === 'installation' ? 'paigaldatud' : (mode === 'delivery' ? 'tarnitud' : 'pingutatud')}:</p>
      <ul className="list-disc pl-4 space-y-0.5 mb-3 text-slate-600 max-h-32 overflow-y-auto">
        {displayedDuplicates.map(p => {
           let info = '';
           if (mode === 'installation' && p.installation) info = `${toEstonianDate(p.installation.date)} (${p.installation.installers.join(', ')})`;
           if (mode === 'delivery' && p.delivery) info = `${toEstonianDate(p.delivery.date)} (${p.delivery.vehicle})`;
           if (mode === 'bolts' && p.bolting) info = `${toEstonianDate(p.bolting.date)} (${p.bolting.installer})`;
           
           return (
            <li key={p.id}>
              <span className="font-semibold">{getPartLabel(p)}</span>: {info}
            </li>
           );
        })}
        {remainingCount > 0 && (
          <li className="text-gray-400 italic font-medium pt-1 list-none -ml-4 pl-4 border-t border-gray-100 mt-1">
            ... ja {remainingCount} detaili veel.
          </li>
        )}
      </ul>
      
      <div className="bg-orange-100/50 p-2 rounded border border-orange-200 mb-2">
        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input 
            type="checkbox" 
            checked={confirmed} 
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 rounded border-orange-400 text-orange-600 focus:ring-orange-500"
          />
          <span className="font-medium text-orange-800 leading-tight">
            Olen teadlik, et olemasolevad andmed kirjutatakse üle.
          </span>
        </label>
      </div>

      <button 
        type="button" 
        onClick={onConfirm}
        disabled={!confirmed}
        className={`w-full px-3 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm ${
          confirmed 
          ? 'bg-orange-500 hover:bg-orange-600 text-white cursor-pointer' 
          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        <RefreshCcw size={12} /> Jah, kirjuta üle
      </button>
    </div>
  );
};

// Multi-Select for Installers (Tags/Chips)
interface MultiSelectProps {
  label: string;
  icon: React.ReactNode;
  values: string[];
  onChange: (vals: string[]) => void;
  options: string[];
  placeholder?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ label, icon, values, onChange, options, placeholder }) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAdd = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleRemove = (val: string) => {
    onChange(values.filter(v => v !== val));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && values.length > 0) {
      handleRemove(values[values.length - 1]);
    }
  };

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(inputValue.toLowerCase()) && !values.includes(opt)
  );

  return (
    <div className="" ref={wrapperRef}>
      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">{label}</label>
      <div 
        className="relative min-h-[42px] bg-white border border-gray-300 rounded-md focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 flex flex-wrap items-center gap-1.5 p-1.5 cursor-text transition-all"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="text-gray-400 pointer-events-none pl-1">
          {icon}
        </div>
        
        {values.map(val => (
          <span key={val} className="bg-blue-50 text-blue-700 text-xs font-medium px-2 py-1 rounded-md flex items-center gap-1 border border-blue-100 shadow-sm animate-in zoom-in-95 duration-200">
            {val}
            <button type="button" onClick={(e) => { e.stopPropagation(); handleRemove(val); }} className="hover:text-blue-900 focus:outline-none p-0.5 hover:bg-blue-100 rounded-full">
              <X size={12} />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={values.length === 0 ? placeholder : ''}
          className="bg-transparent outline-none flex-1 min-w-[80px] text-sm py-1"
        />

        {inputValue && (
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); handleAdd(inputValue); }}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded p-1 transition-colors"
            title="Lisa nimekirja"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {isOpen && (filteredOptions.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1">
          <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase bg-gray-50 border-b border-gray-100">
            Viimati kasutatud
          </div>
          {filteredOptions.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-gray-700 border-b border-gray-50 last:border-0 transition-colors"
              onClick={() => {
                handleAdd(opt);
                setIsOpen(false);
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Single Select (kept for Vehicle and Bolt Installer)
interface CreatableSelectProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
}

const CreatableSelect: React.FC<CreatableSelectProps> = ({ label, icon, value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(value.toLowerCase()) && opt !== value
  );

  return (
    <div className="" ref={wrapperRef}>
      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">{label}</label>
      <div className="relative flex items-center">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {icon}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-8 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all shadow-sm"
        />
        {value && !options.includes(value) && (
           <div className="absolute right-2 top-1/2 -translate-y-1/2">
             <Plus size={14} className="text-blue-500 animate-pulse" />
           </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1">
           {filteredOptions.length > 0 ? (
            <>
              <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase bg-gray-50 border-b border-gray-100">
                Soovitused
              </div>
              {filteredOptions.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-gray-700 border-b border-gray-50 last:border-0 transition-colors"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                >
                  {opt}
                </button>
              ))}
            </>
          ) : (
             value && (
              <div className="px-3 py-2 text-sm text-blue-600 bg-blue-50 font-medium">
                Lisa uus: "{value}"
              </div>
             )
          )}
        </div>
      )}
    </div>
  );
};

// --- STATISTICS COMPONENTS ---

const StatBar = ({ label, value, total, colorClass, icon: Icon, onClick }: any) => {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div 
      className={`mb-3 last:mb-0 ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      onClick={onClick}
      title={onClick ? "Kliki, et näha mudelis" : undefined}
    >
      <div className="flex justify-between items-center text-xs mb-1">
        <div className="flex items-center gap-1.5 text-gray-600 font-medium">
          {Icon && <Icon size={12} />}
          {label}
        </div>
        <div className="font-bold text-gray-800">{value} / {total} <span className="text-gray-400 font-normal ml-1">({percent}%)</span></div>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
};

const MiniBarChart = ({ data, colorClass, onBarClick }: { data: { label: string, value: number }[], colorClass: string, onBarClick?: (label: string) => void }) => {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className="flex items-end h-24 gap-1.5 mt-2">
      {data.map((d, i) => (
        <div 
          key={i} 
          onClick={() => onBarClick && onBarClick(d.label)}
          className={`flex-1 flex flex-col justify-end group relative ${onBarClick ? 'cursor-pointer' : ''}`}
        >
          <div 
            className={`w-full rounded-t-sm min-h-[4px] transition-all duration-500 hover:opacity-80 ${colorClass}`} 
            style={{ height: `${(d.value / maxVal) * 100}%` }}
          ></div>
          <div className="text-[9px] text-gray-400 text-center mt-1 truncate w-full" title={d.label}>
             {toEstonianDate(d.label).split('.')[0]}.{toEstonianDate(d.label).split('.')[1]}
          </div>
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none z-10 whitespace-nowrap">
            {toEstonianDate(d.label)}: {d.value} tk
            {onBarClick && <div className="text-[9px] opacity-70 mt-0.5">Kliki, et valida</div>}
          </div>
        </div>
      ))}
    </div>
  );
};

const LeaderboardRow = ({ rank, name, value, max, colorClass, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`flex items-center gap-2 text-xs py-1.5 border-b border-gray-50 last:border-0 ${onClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
    title={onClick ? "Kliki, et valida mudelis" : undefined}
  >
    <div className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${rank <= 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
      {rank}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex justify-between mb-0.5">
        <span className="truncate font-medium text-gray-700">{name}</span>
        <span className="font-bold text-gray-800">{value}</span>
      </div>
      <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${(value / max) * 100}%` }}></div>
      </div>
    </div>
  </div>
);

// --- PART HISTORY LOG MODAL (SIDEBAR OVERLAY) ---
const PartHistoryModal = ({ part, onClose }: { part: AssemblyPart, onClose: () => void }) => {
  return (
    <div className="absolute inset-0 z-[70] bg-white flex flex-col animate-in slide-in-from-right duration-200">
      <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50 flex-none">
        <div>
          <h3 className="text-sm font-bold text-gray-800">{part.name}</h3>
          <p className="text-xs text-gray-500">{part.castUnitPos} | {part.guid}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded text-gray-500"><X size={18} /></button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {part.logs && part.logs.length > 0 ? (
          [...part.logs].reverse().map((log, i) => {
            const dateObj = new Date(log.timestamp);
            return (
              <div key={i} className="flex gap-3 text-xs">
                <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-1"></div>
                    <div className="w-px h-full bg-gray-200 my-0.5"></div>
                </div>
                <div className="pb-2">
                  <p className="font-semibold text-gray-700">{log.action}</p>
                  <div className="flex gap-2 text-gray-400 text-[10px] mt-0.5">
                    <span>{dateObj.toLocaleDateString('et-EE')} {dateObj.toLocaleTimeString('et-EE', {hour:'2-digit', minute:'2-digit'})}</span>
                    <span>•</span>
                    <span>{log.user}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center text-gray-400 italic text-xs py-4">Ajalugu puudub</div>
        )}
      </div>
    </div>
  );
};


// --- EDIT GROUP MODAL (SIDEBAR OVERLAY) ---
interface EditGroupModalProps {
  mode: AppMode;
  parts: AssemblyPart[];
  suggestions: any;
  selectedParts: AssemblyPart[]; // Currently selected in viewer, potential candidates to ADD
  onSave: (idsToUpdate: string[], data: any) => void;
  onRemoveFromGroup: (idsToRemove: string[]) => void;
  onClose: () => void;
  getPartLabel: (p: AssemblyPart) => string;
  onSetSelection: (ids: string[]) => void;
}

const EditGroupModal: React.FC<EditGroupModalProps> = ({ 
  mode, parts, suggestions, selectedParts, onSave, onRemoveFromGroup, onClose, getPartLabel, onSetSelection 
}) => {
  const initialData = mode === 'installation' ? parts[0].installation : (mode === 'delivery' ? parts[0].delivery : parts[0].bolting);
  
  // Single Edit State
  const [singleEditPart, setSingleEditPart] = useState<AssemblyPart | null>(null);

  // Group Form State
  const [date, setDate] = useState(initialData?.date || getTodayIso());
  const [installers, setInstallers] = useState<string[]>(
    // @ts-ignore
    initialData?.installers || (initialData?.installer ? [initialData.installer] : []) || []
  );
  // @ts-ignore
  const [method, setMethod] = useState<string>(initialData?.method || 'Kraana');
  // @ts-ignore
  const [vehicle, setVehicle] = useState<string>(initialData?.vehicle || '');
  // @ts-ignore
  const [arrivalTime, setArrivalTime] = useState(initialData?.arrivalTime || '09:00');
  // @ts-ignore
  const [unloadingTime, setUnloadingTime] = useState(initialData?.unloadingTime || '10:00');
  
  // List Management State
  const [idsToRemove, setIdsToRemove] = useState<Set<string>>(new Set());
  
  // Calculate potential parts to add (Selected parts that are NOT already in this group)
  const groupIds = new Set(parts.map(p => p.id));
  const potentialAdds = selectedParts.filter(p => !groupIds.has(p.id));
  const [idsToAdd, setIdsToAdd] = useState<Set<string>>(new Set());

  // Special Single Installer for Bolts
  const singleInstaller = installers[0] || '';
  const setSingleInstaller = (val: string) => setInstallers([val]);

  // SINGLE EDIT LOCAL STATE
  const [sDate, setSDate] = useState('');
  const [sInstallers, setSInstallers] = useState<string[]>([]);
  const [sMethod, setSMethod] = useState('');
  const [sVehicle, setSVehicle] = useState('');
  const [sSingleInstaller, setSSingleInstaller] = useState('');
  const [sArrivalTime, setSArrivalTime] = useState('');
  const [sUnloadingTime, setSUnloadingTime] = useState('');

  // Init Single Edit
  useEffect(() => {
    if (singleEditPart) {
      const d = mode === 'installation' ? singleEditPart.installation : (mode === 'delivery' ? singleEditPart.delivery : singleEditPart.bolting);
      // @ts-ignore
      setSDate(d?.date || getTodayIso());
      // @ts-ignore
      setSInstallers(d?.installers || (d?.installer ? [d.installer] : []) || []);
      // @ts-ignore
      setSMethod(d?.method || 'Kraana');
      // @ts-ignore
      setSVehicle(d?.vehicle || '');
      // @ts-ignore
      setSSingleInstaller(d?.installer || '');
      // @ts-ignore
      setSArrivalTime(d?.arrivalTime || '09:00');
      // @ts-ignore
      setSUnloadingTime(d?.unloadingTime || '10:00');
      
      // Also highlight just this part
      onSetSelection([singleEditPart.id]);
    }
  }, [singleEditPart, mode, onSetSelection]);


  const handleSave = () => {
    // 1. Process Removals
    if (idsToRemove.size > 0) {
      onRemoveFromGroup(Array.from(idsToRemove));
    }

    // 2. Prepare Payload for Updates (Existing - Removed + Added)
    const finalIds = [
      ...parts.filter(p => !idsToRemove.has(p.id)).map(p => p.id),
      ...Array.from(idsToAdd)
    ];

    if (finalIds.length === 0) {
      onClose();
      return;
    }

    let payload: any = { date };
    if (mode === 'installation') {
      payload = { ...payload, installerNames: installers, method };
    } else if (mode === 'delivery') {
      payload = { ...payload, vehicle, arrivalTime, unloadingTime };
    } else if (mode === 'bolts') {
      payload = { ...payload, installerName: singleInstaller };
    }
    
    onSave(finalIds, payload);
  };

  const handleSaveSingle = () => {
    if (!singleEditPart) return;
    
    let payload: any = { date: sDate };
    if (mode === 'installation') {
      payload = { ...payload, installerNames: sInstallers, method: sMethod };
    } else if (mode === 'delivery') {
      payload = { ...payload, vehicle: sVehicle, arrivalTime: sArrivalTime, unloadingTime: sUnloadingTime };
    } else if (mode === 'bolts') {
      payload = { ...payload, installerName: sSingleInstaller };
    }
    
    onSave([singleEditPart.id], payload);
    setSingleEditPart(null); // Return to list (which might be smaller now as this item might move)
  };

  const toggleRemoval = (id: string) => {
    const newSet = new Set(idsToRemove);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setIdsToRemove(newSet);
  };

  const toggleAdd = (id: string) => {
    const newSet = new Set(idsToAdd);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setIdsToAdd(newSet);
  };

  // If Editing Single Part
  if (singleEditPart) {
     return (
       <div className="absolute inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-right duration-200">
         <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50 flex-none">
            <div className="flex items-center gap-2">
              <button onClick={() => setSingleEditPart(null)} className="p-1 hover:bg-gray-200 rounded text-gray-500">
                <ArrowLeft size={16} />
              </button>
              <div>
                <h3 className="text-sm font-bold text-gray-800">Muuda detaili: {getPartLabel(singleEditPart)}</h3>
                <p className="text-xs text-gray-500">Muudad ainult ühte detaili.</p>
              </div>
            </div>
            <button onClick={onClose}><X size={16} className="text-gray-400 hover:text-gray-600" /></button>
          </div>
          
          <div className="p-5 flex-1 overflow-y-auto">
            <div className="space-y-4 bg-white rounded-md">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Kuupäev</label>
                <input type="date" value={sDate} onChange={e => setSDate(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-md text-sm" />
              </div>

              {mode === 'installation' && (
                <>
                  <MultiSelect 
                    label="Paigaldajad" icon={<User size={14} />} values={sInstallers} onChange={setSInstallers} options={suggestions.installers} placeholder="Lisa nimi..."
                  />
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Paigaldus Viis</label>
                    <select value={sMethod} onChange={e => setSMethod(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-md text-sm">
                      {INSTALL_METHODS.map(m => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                    </select>
                  </div>
                </>
              )}

              {mode === 'delivery' && (
                <>
                  <CreatableSelect label="Auto Nr" icon={<Truck size={14} />} value={sVehicle} onChange={setSVehicle} options={suggestions.vehicles} />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Saabumine</label>
                      <input type="time" value={sArrivalTime} onChange={e => setSArrivalTime(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-md text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Lõpp</label>
                      <input type="time" value={sUnloadingTime} onChange={e => setSUnloadingTime(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-md text-sm" />
                    </div>
                  </div>
                </>
              )}

              {mode === 'bolts' && (
                <CreatableSelect label="Pingutaja" icon={<User size={14} />} value={sSingleInstaller} onChange={setSSingleInstaller} options={suggestions.installers} />
              )}
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50">
             <button onClick={handleSaveSingle} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold shadow-sm transition-colors">
              Salvesta muudatus
             </button>
          </div>
       </div>
     )
  }

  // Normal Group Edit
  return (
    <div className="absolute inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50 flex-none">
          <div className="flex items-center gap-2">
             <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded text-gray-500" title="Tühista">
                <ArrowLeft size={16} />
             </button>
             <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
               <Pencil size={14} className="text-blue-600" /> Muuda grupi andmeid
             </h3>
          </div>
          <button onClick={onClose}><X size={16} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Data Fields */}
          <div className="space-y-3 bg-gray-50 p-3 rounded-md border border-gray-100">
             <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Kuupäev</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-md text-sm" />
              </div>

              {mode === 'installation' && (
                <>
                  <MultiSelect 
                    label="Paigaldajad" icon={<User size={14} />} values={installers} onChange={setInstallers} options={suggestions.installers} placeholder="Lisa nimi..."
                  />
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Paigaldus Viis</label>
                    <select value={method} onChange={e => setMethod(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-md text-sm">
                      {INSTALL_METHODS.map(m => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                    </select>
                  </div>
                </>
              )}

              {mode === 'delivery' && (
                <>
                  <CreatableSelect label="Auto Nr" icon={<Truck size={14} />} value={vehicle} onChange={setVehicle} options={suggestions.vehicles} />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Saabumine</label>
                      <input type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-md text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Lõpp</label>
                      <input type="time" value={unloadingTime} onChange={e => setUnloadingTime(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-md text-sm" />
                    </div>
                  </div>
                </>
              )}

              {mode === 'bolts' && (
                <CreatableSelect label="Pingutaja" icon={<User size={14} />} value={singleInstaller} onChange={setSingleInstaller} options={suggestions.installers} />
              )}
          </div>
          
          {/* Parts Management */}
          <div>
            <h4 className="text-xs font-bold text-gray-600 mb-2 uppercase border-b border-gray-100 pb-1">Detailid ({parts.length - idsToRemove.size + idsToAdd.size})</h4>
            
            <div className="space-y-1">
              {/* Existing Parts */}
              {parts.map(p => {
                 const isRemoved = idsToRemove.has(p.id);
                 return (
                   <div key={p.id} className={`flex items-center justify-between text-xs p-1.5 rounded ${isRemoved ? 'bg-red-50 opacity-60' : 'hover:bg-blue-50/50'}`}>
                      <span 
                        onClick={() => onSetSelection([p.id])}
                        className={`font-medium cursor-pointer ${isRemoved ? 'line-through text-gray-400' : 'text-gray-700 hover:text-blue-600 hover:underline'}`}
                        title="Kliki, et näha mudelis"
                      >
                          {getPartLabel(p)}
                      </span>
                      <div className="flex gap-1">
                        {!isRemoved && (
                          <button 
                            onClick={() => setSingleEditPart(p)}
                            className="p-1 rounded text-gray-300 hover:text-blue-600 hover:bg-blue-50"
                            title="Muuda ainult seda detaili"
                          >
                            <Pencil size={12}/>
                          </button>
                        )}
                        <button 
                          onClick={() => toggleRemoval(p.id)}
                          className={`p-1 rounded transition-colors ${isRemoved ? 'text-gray-500 hover:bg-gray-200' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'}`}
                          title={isRemoved ? "Taasta" : "Eemalda grupist"}
                        >
                           {isRemoved ? <RefreshCcw size={12}/> : <Trash2 size={12}/>}
                        </button>
                      </div>
                   </div>
                 );
              })}

              {/* Potential Adds */}
              {potentialAdds.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-100">
                  <div className="text-[10px] font-bold text-blue-500 mb-1 uppercase">Lisa hetkel valitud detailid</div>
                  {potentialAdds.map(p => {
                     const isAdded = idsToAdd.has(p.id);
                     return (
                       <div key={p.id} className={`flex items-center justify-between text-xs p-1.5 rounded border border-transparent ${isAdded ? 'bg-blue-50 border-blue-100' : 'hover:bg-gray-50'}`}>
                          <span className="font-medium text-gray-700">{getPartLabel(p)}</span>
                          <button 
                            onClick={() => toggleAdd(p.id)}
                            className={`p-1 rounded transition-colors ${isAdded ? 'text-blue-600' : 'text-gray-300 hover:text-blue-500'}`}
                          >
                             {isAdded ? <CheckCircle size={14}/> : <Plus size={14}/>}
                          </button>
                       </div>
                     );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button onClick={handleSave} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold shadow-sm transition-colors">
            Salvesta muudatused
          </button>
        </div>
    </div>
  );
};

// --- VISUAL CALENDAR MODAL (SIDEBAR OVERLAY) ---
const CalendarModal = ({ allParts, onClose }: { allParts: AssemblyPart[], onClose: () => void }) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const monthData = useMemo(() => {
    const startDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() || 7; // 1 (Mon) - 7 (Sun)
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const padding = startDay - 1;
    
    const days = [];
    for(let i=0; i<padding; i++) days.push(null);
    for(let i=1; i<=daysInMonth; i++) days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));

    return days;
  }, [currentMonth]);

  const activityMap = useMemo(() => {
    const map: Record<string, { install: number, delivery: number, bolts: number }> = {};
    allParts.forEach(p => {
      if(p.installation) {
        const d = p.installation.date;
        if(!map[d]) map[d] = { install:0, delivery:0, bolts:0 };
        map[d].install++;
      }
      if(p.delivery) {
        const d = p.delivery.date;
        if(!map[d]) map[d] = { install:0, delivery:0, bolts:0 };
        map[d].delivery++;
      }
      if(p.bolting) {
        const d = p.bolting.date;
        if(!map[d]) map[d] = { install:0, delivery:0, bolts:0 };
        map[d].bolts++;
      }
    });
    return map;
  }, [allParts]);

  const handlePrev = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNext = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  return (
    <div className="absolute inset-0 z-[60] bg-white flex flex-col p-4 animate-in slide-in-from-right duration-200">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-lg font-bold text-gray-800 capitalize flex items-center gap-2">
            <Calendar className="text-blue-600" />
            {currentMonth.toLocaleString('et-EE', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-2 items-center">
             <button onClick={handlePrev} className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="rotate-180" size={20}/></button>
             <button onClick={handleNext} className="p-1 hover:bg-gray-100 rounded"><ChevronRight size={20}/></button>
             <div className="w-px h-6 bg-gray-200 mx-1"></div>
             <button onClick={onClose} className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded"><X size={20}/></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['E', 'T', 'K', 'N', 'R', 'L', 'P'].map(d => <div key={d} className="text-xs font-bold text-gray-400">{d}</div>)}
        </div>
        
        <div className="grid grid-cols-7 gap-1 auto-rows-fr">
          {monthData.map((d, i) => {
            if(!d) return <div key={`empty-${i}`} className="aspect-square"></div>;
            const iso = d.toISOString().split('T')[0];
            const act = activityMap[iso];
            return (
              <div key={iso} className="aspect-square border border-gray-100 rounded-lg flex flex-col items-center justify-center relative group hover:border-blue-300 transition-colors bg-gray-50/50">
                <span className={`text-xs font-medium ${act ? 'text-gray-800' : 'text-gray-400'}`}>{d.getDate()}</span>
                <div className="flex gap-0.5 mt-1">
                  {act?.install > 0 && <div className="w-1.5 h-1.5 rounded-full bg-green-500" title={`${act.install} paigaldust`}></div>}
                  {act?.delivery > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title={`${act.delivery} tarnet`}></div>}
                  {act?.bolts > 0 && <div className="w-1.5 h-1.5 rounded-full bg-orange-500" title={`${act.bolts} polti`}></div>}
                </div>
                {act && (
                   <div className="absolute bottom-full mb-2 z-10 bg-gray-800 text-white text-[10px] p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                      {act.install > 0 && <div>Paigaldatud: {act.install}</div>}
                      {act.delivery > 0 && <div>Tarnitud: {act.delivery}</div>}
                      {act.bolts > 0 && <div>Poldid: {act.bolts}</div>}
                   </div>
                )}
              </div>
            );
          })}
        </div>
    </div>
  );
};

// --- MAIN SIDEBAR COMPONENT ---

interface SidebarProps {
  selectedParts: AssemblyPart[];
  allParts: AssemblyPart[];
  mode: AppMode;
  assemblySelectionEnabled: boolean;
  onModeChange: (mode: AppMode) => void;
  onSaveInstallation: (data: InstallationRecord) => void;
  onSaveDelivery: (data: DeliveryRecord) => void;
  onSaveBolting: (data: BoltingRecord) => void;
  onClearSelection: () => void;
  onRemovePart: (id: string) => void;
  onSetSelection: (ids: string[]) => void;
  onBulkUpdate: (ids: string[], mode: AppMode, data: any) => void;
  onDeleteData: (ids: string[], mode: AppMode) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  selectedParts, 
  allParts,
  mode,
  assemblySelectionEnabled,
  onModeChange,
  onSaveInstallation,
  onSaveDelivery,
  onSaveBolting,
  onClearSelection,
  onRemovePart,
  onSetSelection,
  onBulkUpdate,
  onDeleteData
}) => {
  // Form State
  const [installers, setInstallers] = useState<string[]>([DEFAULT_INSTALLER]);
  const [vehicle, setVehicle] = useState(DEFAULT_VEHICLE);
  const [singleInstaller, setSingleInstaller] = useState(DEFAULT_INSTALLER); // For Bolts
  const [date, setDate] = useState(getTodayIso());
  
  // Installation Method State
  const [installMethod, setInstallMethod] = useState<string>('Kraana');
  const [customMethod, setCustomMethod] = useState<string>('');

  // Delivery Times
  const [arrivalTime, setArrivalTime] = useState('09:00');
  const [unloadingTime, setUnloadingTime] = useState('10:00');
  
  // History State
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  
  // Error & Modal State
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);
  const [logPart, setLogPart] = useState<AssemblyPart | null>(null);
  
  // Editing State
  const [editingGroup, setEditingGroup] = useState<{ parts: AssemblyPart[] } | null>(null);
  
  // Calendar View State
  const [showCalendar, setShowCalendar] = useState(false);

  // Settings State
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [installDisplayField, setInstallDisplayField] = useState<DisplayField>('castUnitPos');
  const [deliveryDisplayField, setDeliveryDisplayField] = useState<DisplayField>('castUnitPos');
  const [boltingDisplayField, setBoltingDisplayField] = useState<DisplayField>('castUnitPos');

  // List Visualization State (Lazy Loading)
  const [visibleItems, setVisibleItems] = useState(50);

  // --- EFFECTS ---

  // When Mode changes, reset some states and ALWAYS default date to Today
  useEffect(() => {
    setExpandedDate(null);
    onSetSelection([]); // clear selection
    setError(null);
    setDate(getTodayIso()); // Force date to today
  }, [mode]);

  useEffect(() => {
    setError(null);
    setVisibleItems(50); // Reset visible items when selection changes
  }, [selectedParts]);

  // --- HELPERS ---

  const getPartLabel = (part: AssemblyPart) => {
    let field = installDisplayField;
    if (mode === 'delivery') field = deliveryDisplayField;
    if (mode === 'bolts') field = boltingDisplayField;

    switch (field) {
      case 'guid': return part.guid;
      case 'castUnitPos': return part.castUnitPos || part.name; // Fallback to name if mark missing
      case 'name': return part.name;
      default: return part.name;
    }
  };

  // Check if current mode is blocked by Assembly Selection state
  const isModeBlocked = useMemo(() => {
    if (mode === 'installation' || mode === 'delivery') {
      return !assemblySelectionEnabled; // Installation and Delivery require ON
    }
    if (mode === 'bolts') {
      return assemblySelectionEnabled; // Bolts requires OFF
    }
    return false;
  }, [mode, assemblySelectionEnabled]);

  // Handle auto-calculating unloading time
  const handleArrivalTimeChange = (newTime: string) => {
    setArrivalTime(newTime);
    const suggestedEnd = addHours(newTime, 1);
    if (unloadingTime < newTime || true) {
       setUnloadingTime(suggestedEnd);
    }
  };

  // --- DERIVED DATA ---

  const suggestions = useMemo(() => {
    const installerSet = new Set<string>();
    const vehicleSet = new Set<string>();

    allParts.forEach(p => {
      if (p.installation?.installers) {
        p.installation.installers.forEach(i => installerSet.add(i));
      }
      if (p.bolting?.installer) {
        installerSet.add(p.bolting.installer);
      }
      if (p.delivery?.vehicle) vehicleSet.add(p.delivery.vehicle);
    });

    installerSet.add(DEFAULT_INSTALLER);
    vehicleSet.add(DEFAULT_VEHICLE);

    return {
      installers: Array.from(installerSet).sort(),
      vehicles: Array.from(vehicleSet).sort()
    };
  }, [allParts]);

  // --- STATISTICS CALCULATION ---
  const detailedStats = useMemo(() => {
    const total = allParts.length;
    let installed = 0;
    let delivered = 0;
    let bolted = 0;

    const installDates: Record<string, number> = {};
    const installWorkers: Record<string, number> = {};
    
    const deliveryDates: Record<string, number> = {};
    const deliveryVehicles: Record<string, number> = {};

    const boltingWorkers: Record<string, number> = {};

    allParts.forEach(p => {
      // Installation
      if (p.installation) {
        installed++;
        installDates[p.installation.date] = (installDates[p.installation.date] || 0) + 1;
        p.installation.installers.forEach(name => {
          installWorkers[name] = (installWorkers[name] || 0) + 1;
        });
      }
      // Delivery
      if (p.delivery) {
        delivered++;
        deliveryDates[p.delivery.date] = (deliveryDates[p.delivery.date] || 0) + 1;
        deliveryVehicles[p.delivery.vehicle] = (deliveryVehicles[p.delivery.vehicle] || 0) + 1;
      }
      // Bolting
      if (p.bolting) {
        bolted++;
        boltingWorkers[p.bolting.installer] = (boltingWorkers[p.bolting.installer] || 0) + 1;
      }
    });

    // Helper to sort and slice
    const sortMap = (map: Record<string, number>) => Object.entries(map).map(([k, v]) => ({ label: k, value: v })).sort((a, b) => b.value - a.value);
    const sortDates = (map: Record<string, number>) => Object.entries(map).map(([k, v]) => ({ label: k, value: v })).sort((a, b) => a.label.localeCompare(b.label));

    // Last 7 active days for charts
    const last7InstallDays = sortDates(installDates).slice(-7);
    const last7DeliveryDays = sortDates(deliveryDates).slice(-7);

    return {
      total,
      counts: { installed, delivered, bolted },
      topInstallers: sortMap(installWorkers).slice(0, 5),
      topVehicles: sortMap(deliveryVehicles).slice(0, 5),
      topBolters: sortMap(boltingWorkers).slice(0, 5),
      installActivity: last7InstallDays,
      deliveryActivity: last7DeliveryDays
    };
  }, [allParts]);


  // --- HISTORY GROUPING ---

  const groupedHistory = useMemo(() => {
    const dateMap: Record<string, { parts: AssemblyPart[]; deliveryGroups: Record<string, AssemblyPart[]> }> = {};
    
    allParts.forEach(p => {
      let d = '';
      if (mode === 'installation' && p.installation) d = p.installation.date;
      if (mode === 'delivery' && p.delivery) d = p.delivery.date;
      if (mode === 'bolts' && p.bolting) d = p.bolting.date;

      if (d) {
        if (!dateMap[d]) dateMap[d] = { parts: [], deliveryGroups: {} };
        dateMap[d].parts.push(p);

        if (mode === 'delivery' && p.delivery) {
          const v = p.delivery.vehicle || 'Määramata';
          if (!dateMap[d].deliveryGroups[v]) dateMap[d].deliveryGroups[v] = [];
          dateMap[d].deliveryGroups[v].push(p);
        }
      }
    });

    const monthGroups: Record<string, { monthLabel: string; dates: any[] }> = {};

    Object.keys(dateMap).forEach(isoDate => {
      const { parts, deliveryGroups } = dateMap[isoDate];
      const [y, m] = isoDate.split('-').map(Number);
      const monthKey = `${y}-${m.toString().padStart(2, '0')}`;
      
      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = {
          monthLabel: formatMonthLabel(y, m - 1),
          dates: []
        };
      }

      const deliveryGroupsArray = Object.entries(deliveryGroups).map(([vehicle, pArr]) => ({
        vehicle,
        parts: pArr
      })).sort((a, b) => a.vehicle.localeCompare(b.vehicle));

      monthGroups[monthKey].dates.push({
        iso: isoDate,
        label: formatDateLabel(isoDate),
        parts,
        deliveryGroups: deliveryGroupsArray
      });
    });

    const sortedMonthKeys = Object.keys(monthGroups).sort((a, b) => b.localeCompare(a));

    return sortedMonthKeys.map(key => {
      monthGroups[key].dates.sort((a, b) => b.iso.localeCompare(a.iso));
      return {
        key,
        ...monthGroups[key]
      };
    });
  }, [allParts, mode]);

  // --- HANDLERS (SAVE EXECUTION) ---

  const executeSaveInstallation = () => {
    let finalMethod = installMethod;
    if (installMethod === 'MUU') {
       if (!customMethod.trim()) return; // Should be checked in validation
       finalMethod = customMethod.trim();
    }
    onSaveInstallation({ installerNames: installers, date: date, method: finalMethod });
    setError(null);
  };

  const executeSaveDelivery = () => {
    onSaveDelivery({ vehicle: vehicle, date: date, arrivalTime, unloadingTime });
    setError(null);
  };

  const executeSaveBolting = () => {
    onSaveBolting({ installerName: singleInstaller, date: date });
    setError(null);
  };

  // --- HANDLERS (EDITING) ---

  const handleEditGroup = (e: React.MouseEvent, parts: AssemblyPart[]) => {
    e.stopPropagation();
    setEditingGroup({ parts });
  };

  const saveBulkEdit = (ids: string[], newData: any) => {
    onBulkUpdate(ids, mode, newData);
    setEditingGroup(null);
  };
  
  const handleRemoveDataFromGroup = (idsToRemove: string[]) => {
    onDeleteData(idsToRemove, mode);
  }


  // --- HANDLERS (FORM SUBMIT & VALIDATION) ---

  const handleInstallSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isModeBlocked) return;
    if (selectedParts.length === 0) return;
    
    // 1. Validation for Missing Fields (Blocking Error)
    if (installers.length === 0) {
      setError(<div className="text-xs font-medium">Vali vähemalt üks paigaldaja.</div>);
      return;
    }
    if (installMethod === 'MUU' && !customMethod.trim()) {
      setError(<div className="text-xs font-medium">Palun täpsusta muu paigaldusviis.</div>);
      return;
    }

    // 2. Validation for Duplicates (Warning with Overwrite Checkbox)
    const duplicates = selectedParts.filter(p => p.installation);
    if (duplicates.length > 0) {
      setError(
        <OverwriteConfirmation 
          duplicates={duplicates} 
          onConfirm={executeSaveInstallation} 
          getPartLabel={getPartLabel}
          mode="installation"
        />
      );
      return;
    }

    // 3. No Issues
    executeSaveInstallation();
  };

  const handleDeliverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isModeBlocked) return; 
    if (selectedParts.length === 0) return;

    // 1. Validation for Missing/Wrong Fields
    if (unloadingTime < arrivalTime) {
      setError(<div className="text-xs font-medium">Mahalaadimise lõpp ei tohi olla enne saabumist.</div>);
      return;
    }

    // 2. Validation for Duplicates
    const duplicates = selectedParts.filter(p => p.delivery);
    if (duplicates.length > 0) {
      setError(
        <OverwriteConfirmation 
          duplicates={duplicates} 
          onConfirm={executeSaveDelivery} 
          getPartLabel={getPartLabel}
          mode="delivery"
        />
      );
      return;
    }

    executeSaveDelivery();
  };

  const handleBoltingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isModeBlocked) return;
    if (selectedParts.length === 0) return;

    // 1. Validation
    if (!singleInstaller) {
      setError(<div className="text-xs font-medium">Vali pingutaja nimi.</div>);
      return;
    }

    // 2. Duplicates
    const duplicates = selectedParts.filter(p => p.bolting);
    if (duplicates.length > 0) {
      setError(
         <OverwriteConfirmation 
          duplicates={duplicates} 
          onConfirm={executeSaveBolting} 
          getPartLabel={getPartLabel}
          mode="bolts"
        />
      );
      return;
    }

    executeSaveBolting();
  };

  // --- SMART SELECTION HANDLERS ---
  const handleSmartSelection = (e: React.MouseEvent, targetIds: string[]) => {
    e.stopPropagation();
    
    const currentSelectedIds = new Set(selectedParts.map(p => p.id));
    const targetSet = new Set(targetIds);

    if (e.ctrlKey || e.metaKey) {
      // Toggle Behavior
      const allPresent = targetIds.every(id => currentSelectedIds.has(id));
      
      if (allPresent) {
        // Remove
        targetIds.forEach(id => currentSelectedIds.delete(id));
      } else {
        // Add (or re-add)
        targetIds.forEach(id => currentSelectedIds.add(id));
      }
      onSetSelection(Array.from(currentSelectedIds));

    } else if (e.shiftKey) {
      // Additive (Range-like) Behavior
      targetIds.forEach(id => currentSelectedIds.add(id));
      onSetSelection(Array.from(currentSelectedIds));
    } else {
      // Standard Behavior (Replace)
      const isExactMatch = currentSelectedIds.size === targetIds.length && targetIds.every(id => currentSelectedIds.has(id));
      if (isExactMatch) {
         onSetSelection([]); // Toggle off for convenience
      } else {
         onSetSelection(targetIds);
      }
    }
  };

  const handleToggleMonth = (e: React.MouseEvent, monthKey: string, partsInMonth: AssemblyPart[]) => {
    e.stopPropagation();
    
    // Expand/Collapse visual state
    const newSet = new Set(expandedMonths);
    if (newSet.has(monthKey) && !e.ctrlKey && !e.shiftKey) {
      // Standard toggle behavior if just clicking
      newSet.delete(monthKey);
      onSetSelection([]); 
    } else {
      newSet.add(monthKey);
      // Determine selection based on modifiers
      handleSmartSelection(e, partsInMonth.map(p => p.id));
    }
    setExpandedMonths(newSet);
  };

  const handleToggleHistoryDate = (e: React.MouseEvent, dateIso: string, partsInDate: AssemblyPart[]) => {
    e.stopPropagation();
    
    if (expandedDate === dateIso && !e.ctrlKey && !e.shiftKey) {
      setExpandedDate(null);
      onSetSelection([]);
    } else {
      setExpandedDate(dateIso);
      handleSmartSelection(e, partsInDate.map(p => p.id));
    }
  };

  const handleSelectVehicleGroup = (e: React.MouseEvent, parts: AssemblyPart[]) => {
    handleSmartSelection(e, parts.map(p => p.id));
  };
  
  // Select ALL currently visible history items
  const handleSelectAllHistory = () => {
    const allHistoryParts = groupedHistory.flatMap(m => m.dates.flatMap(d => d.parts));
    const allIds = allHistoryParts.map(p => p.id);
    
    if (allIds.length === 0) return;

    // Check if we effectively have all of them selected already
    const currentSelectedIds = new Set(selectedParts.map(p => p.id));
    const areAllSelected = allIds.every(id => currentSelectedIds.has(id));

    if (areAllSelected) {
      onSetSelection([]); // Clear selection
    } else {
      onSetSelection(allIds); // Select all
    }
  };

  // --- STATS INTERACTION HANDLERS ---
  const handleSelectByStatType = (type: 'install' | 'delivery' | 'bolts') => {
    const ids = allParts.filter(p => {
      if (type === 'install') return !!p.installation;
      if (type === 'delivery') return !!p.delivery;
      if (type === 'bolts') return !!p.bolting;
      return false;
    }).map(p => p.id);
    onSetSelection(ids);
  };

  const handleSelectByDate = (date: string, type: 'install' | 'delivery') => {
    const ids = allParts.filter(p => {
      if (type === 'install') return p.installation?.date === date;
      if (type === 'delivery') return p.delivery?.date === date;
      return false;
    }).map(p => p.id);
    onSetSelection(ids);
  };

  const handleSelectByWorker = (name: string, type: 'install' | 'bolts') => {
    const ids = allParts.filter(p => {
      if (type === 'install') return p.installation?.installers.includes(name);
      if (type === 'bolts') return p.bolting?.installer === name;
      return false;
    }).map(p => p.id);
    onSetSelection(ids);
  }

  const handleSelectByVehicle = (name: string) => {
    const ids = allParts.filter(p => p.delivery?.vehicle === name).map(p => p.id);
    onSetSelection(ids);
  }

  // Slice for lazy rendering
  const displayedSelectedParts = selectedParts.slice(0, visibleItems);
  const remainingSelectedParts = selectedParts.length - visibleItems;

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200 w-96 shadow-xl z-20 relative">
      
      {/* HEADER */}
      <div className="p-5 border-b border-gray-100 bg-slate-50 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Box className="text-blue-600" />
            CONSIVA TC manager v2.1
          </h1>
          <p className="text-xs text-slate-500 mt-1">Trimble Connect Laiendus</p>
        </div>
        <button 
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          title="Seaded"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* SETTINGS OVERLAY (SIDEBAR) */}
      {settingsOpen && (
        <div className="absolute inset-0 z-[60] bg-white p-5 animate-in slide-in-from-top duration-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-gray-700">Seaded</h3>
            <button onClick={() => setSettingsOpen(false)}><X size={18} className="text-gray-400" /></button>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Paigalduse veerg</label>
              <select value={installDisplayField} onChange={(e) => setInstallDisplayField(e.target.value as DisplayField)} className="w-full text-xs p-2.5 border border-gray-300 rounded bg-gray-50">
                <option value="castUnitPos">Tähis (Mark)</option>
                <option value="name">Nimi</option>
                <option value="guid">GUID</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Tarne veerg</label>
              <select value={deliveryDisplayField} onChange={(e) => setDeliveryDisplayField(e.target.value as DisplayField)} className="w-full text-xs p-2.5 border border-gray-300 rounded bg-gray-50">
                <option value="castUnitPos">Tähis (Mark)</option>
                <option value="name">Nimi</option>
                <option value="guid">GUID</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Poltide veerg</label>
              <select value={boltingDisplayField} onChange={(e) => setBoltingDisplayField(e.target.value as DisplayField)} className="w-full text-xs p-2.5 border border-gray-300 rounded bg-gray-50">
                <option value="castUnitPos">Tähis (Mark)</option>
                <option value="name">Nimi</option>
                <option value="guid">GUID</option>
              </select>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-100">
             <button onClick={() => setSettingsOpen(false)} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-sm font-semibold">
               Sulge
             </button>
          </div>
        </div>
      )}

      {/* EDIT GROUP MODAL */}
      {editingGroup && (
        <EditGroupModal 
          mode={mode} 
          parts={editingGroup.parts} 
          suggestions={suggestions} 
          selectedParts={selectedParts}
          onSave={saveBulkEdit} 
          onRemoveFromGroup={handleRemoveDataFromGroup}
          onClose={() => setEditingGroup(null)} 
          getPartLabel={getPartLabel}
          onSetSelection={onSetSelection}
        />
      )}
      
      {/* PART HISTORY MODAL */}
      {logPart && (
        <PartHistoryModal part={logPart} onClose={() => setLogPart(null)} />
      )}
      
      {/* CALENDAR MODAL */}
      {showCalendar && (
        <CalendarModal allParts={allParts} onClose={() => setShowCalendar(false)} />
      )}

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-gray-200">
        <button onClick={() => onModeChange('installation')} className={`flex-1 py-3 text-xs font-medium flex justify-center items-center gap-1 border-b-2 transition-colors ${mode === 'installation' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
          <Hammer size={14} /> Paigaldus
        </button>
        <button onClick={() => onModeChange('bolts')} className={`flex-1 py-3 text-xs font-medium flex justify-center items-center gap-1 border-b-2 transition-colors ${mode === 'bolts' ? 'border-orange-500 text-orange-600 bg-orange-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
          <Wrench size={14} /> Poldid
        </button>
        <button onClick={() => onModeChange('delivery')} className={`flex-1 py-3 text-xs font-medium flex justify-center items-center gap-1 border-b-2 transition-colors ${mode === 'delivery' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
          <Truck size={14} /> Tarne
        </button>
        <button onClick={() => onModeChange('statistics')} className={`flex-1 py-3 text-xs font-medium flex justify-center items-center gap-1 border-b-2 transition-colors ${mode === 'statistics' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
          <BarChart3 size={14} /> Statistika
        </button>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto bg-white relative">

        {/* VALIDATION BLOCKING BANNER */}
        {isModeBlocked && (
          <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="text-red-600" size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Tegevus peatatud!</h3>
            <p className="text-sm text-gray-600 mb-4 max-w-xs">
              {mode === 'bolts' 
                ? 'Poltide märkimiseks peab "Assembly Selection" olema VÄLJA lülitatud.'
                : 'Selle tegevuse jaoks peab "Assembly Selection" olema SISSE lülitatud.'}
            </p>
            <div className="bg-slate-100 px-4 py-2 rounded border border-slate-200 text-xs font-mono text-slate-600">
              Muuda Trimble Connect seadeid
            </div>
          </div>
        )}
        
        {/* STATISTICS VIEW */}
        {mode === 'statistics' && (
          <div className="p-5 space-y-6 pb-10">
            {/* General Progress Section */}
            <div>
              <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <PieChart size={16} className="text-blue-600" /> Üldine Progress
              </h2>
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 space-y-4">
                 <StatBar 
                    label="Tarnitud" 
                    value={detailedStats.counts.delivered} 
                    total={detailedStats.total} 
                    colorClass="bg-blue-500" 
                    icon={Truck}
                    onClick={() => handleSelectByStatType('delivery')}
                 />
                 <StatBar 
                    label="Paigaldatud" 
                    value={detailedStats.counts.installed} 
                    total={detailedStats.total} 
                    colorClass="bg-green-600" 
                    icon={Hammer}
                    onClick={() => handleSelectByStatType('install')}
                 />
                 <StatBar 
                    label="Poldid pingutatud" 
                    value={detailedStats.counts.bolted} 
                    total={detailedStats.total} 
                    colorClass="bg-orange-500" 
                    icon={Wrench}
                    onClick={() => handleSelectByStatType('bolts')}
                 />
              </div>
            </div>

            {/* Installation Stats */}
            <div>
              <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Hammer size={16} className="text-green-600" /> Paigaldus
              </h2>
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
                {detailedStats.installActivity.length > 0 ? (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Päevane aktiivsus (7 päeva)</p>
                    <MiniBarChart 
                      data={detailedStats.installActivity} 
                      colorClass="bg-green-400" 
                      onBarClick={(date) => handleSelectByDate(date, 'install')}
                    />
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 italic mb-4">Aktiivsus puudub</div>
                )}
                
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Paigaldajate Edetabel</p>
                  {detailedStats.topInstallers.length > 0 ? (
                    detailedStats.topInstallers.map((worker, i) => (
                      <LeaderboardRow 
                        key={worker.label} 
                        rank={i + 1} 
                        name={worker.label} 
                        value={worker.value} 
                        max={detailedStats.topInstallers[0].value}
                        colorClass="bg-green-500" 
                        onClick={() => handleSelectByWorker(worker.label, 'install')}
                      />
                    ))
                  ) : (
                    <div className="text-xs text-gray-400 italic">Andmed puuduvad</div>
                  )}
                </div>
              </div>
            </div>

            {/* Delivery Stats */}
            <div>
              <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Truck size={16} className="text-blue-600" /> Tarne ja Transport
              </h2>
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
                 {detailedStats.deliveryActivity.length > 0 ? (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Saabumised (7 päeva)</p>
                    <MiniBarChart 
                      data={detailedStats.deliveryActivity} 
                      colorClass="bg-blue-400" 
                      onBarClick={(date) => handleSelectByDate(date, 'delivery')}
                    />
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 italic mb-4">Aktiivsus puudub</div>
                )}

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Top Veokid / Autod</p>
                  {detailedStats.topVehicles.length > 0 ? (
                    detailedStats.topVehicles.map((v, i) => (
                      <LeaderboardRow 
                        key={v.label} 
                        rank={i + 1} 
                        name={v.label} 
                        value={v.value} 
                        max={detailedStats.topVehicles[0].value}
                        colorClass="bg-blue-500" 
                        onClick={() => handleSelectByVehicle(v.label)}
                      />
                    ))
                  ) : (
                    <div className="text-xs text-gray-400 italic">Andmed puuduvad</div>
                  )}
                </div>
              </div>
            </div>

             {/* Bolting Stats */}
             <div>
              <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Wrench size={16} className="text-orange-600" /> Poldid
              </h2>
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Pingutajate Edetabel</p>
                  {detailedStats.topBolters.length > 0 ? (
                    detailedStats.topBolters.map((worker, i) => (
                      <LeaderboardRow 
                        key={worker.label} 
                        rank={i + 1} 
                        name={worker.label} 
                        value={worker.value} 
                        max={detailedStats.topBolters[0].value}
                        colorClass="bg-orange-500" 
                        onClick={() => handleSelectByWorker(worker.label, 'bolts')}
                      />
                    ))
                  ) : (
                    <div className="text-xs text-gray-400 italic">Andmed puuduvad</div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* OPERATION VIEWS (Install, Delivery, Bolts) */}
        {(mode === 'installation' || mode === 'delivery' || mode === 'bolts') && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto">
              
              {/* Active Selection List */}
              <div className="flex-none border-b border-gray-100 shadow-sm z-10">
                <div className="px-4 py-3 flex justify-between items-end bg-white">
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Valitud detailid ({selectedParts.length})
                  </h2>
                  {selectedParts.length > 0 && (
                    <button onClick={onClearSelection} className="text-xs text-red-500 hover:text-red-700 font-medium underline decoration-dotted">
                      Tühjenda valik
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto px-2 pb-2">
                  {selectedParts.length === 0 ? (
                    <div className="h-16 flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-200 rounded bg-gray-50/30 m-2">
                      <MousePointer2 size={16} className="mb-1 opacity-50" />
                      <span className="text-[10px]">Vali mudelilt</span>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50 border rounded border-gray-100">
                      {displayedSelectedParts.map(part => {
                        let statusText = 'Ootel';
                        let statusSubText = '';
                        let hasConflict = false;
                        let icon = null;
                        
                        if (mode === 'installation' && part.installation) {
                          statusText = 'Paigaldatud';
                          statusSubText = `${toEstonianDate(part.installation.date)} (${part.installation.installers.join(', ')})`;
                          hasConflict = true;
                          const MethodIcon = METHOD_ICONS[part.installation.method || 'MUU'];
                          if(MethodIcon) icon = MethodIcon;
                        } else if (mode === 'delivery' && part.delivery) {
                          statusText = 'Kohal';
                          statusSubText = `${toEstonianDate(part.delivery.date)} ${part.delivery.arrivalTime ? '@' + part.delivery.arrivalTime : ''} (${part.delivery.vehicle})`;
                          hasConflict = true;
                        } else if (mode === 'bolts' && part.bolting) {
                          statusText = 'Pingutatud';
                          statusSubText = `${toEstonianDate(part.bolting.date)} (${part.bolting.installer})`;
                          hasConflict = true;
                        }

                        return (
                          <div key={part.id} className={`group flex items-center justify-between py-1 px-2 text-xs transition-colors border-b border-gray-50 last:border-0 hover:bg-gray-50 ${hasConflict ? 'bg-orange-50/50' : ''}`}>
                            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                              <button onClick={() => setLogPart(part)} className="text-gray-400 hover:text-blue-500">
                                <Info size={14} />
                              </button>
                              <span className="font-semibold text-slate-700 whitespace-nowrap flex items-center gap-1">
                                {icon && <span className="text-gray-400" title="Paigaldusviis">{icon}</span>}
                                {getPartLabel(part)}
                              </span>
                              {hasConflict && (
                                <span className="text-[10px] text-orange-600 truncate opacity-80" title={statusSubText}>
                                  {statusText} {statusSubText}
                                </span>
                              )}
                            </div>
                            
                            <button onClick={() => setItemToRemove(part.id)} className="text-gray-300 hover:text-red-500 p-0.5 rounded hover:bg-white flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                      
                      {remainingSelectedParts > 0 && (
                        <div className="py-2 px-2 text-center bg-gray-50/50">
                           <p className="text-[10px] text-gray-400 mb-1">Kuvatud {visibleItems} / {selectedParts.length} detaili</p>
                           <button 
                             onClick={() => setVisibleItems(prev => prev + 50)}
                             className="text-xs text-blue-600 hover:underline font-medium"
                           >
                             Näita rohkem
                           </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* History Section */}
              <div className="bg-slate-50 min-h-[200px] border-t border-gray-100">
                <div className="p-4 pb-2 flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                      <History size={14} /> 
                      {mode === 'installation' ? 'Paigalduse Ajalugu' : (mode === 'bolts' ? 'Poltide Ajalugu' : 'Tarne Ajalugu')}
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Ava kuupäev, et näha ja märkida detaile.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleSelectAllHistory}
                      className="flex items-center gap-1 text-[10px] bg-white border border-gray-200 shadow-sm px-2 py-1 rounded hover:bg-gray-50 text-gray-600"
                      title="Vali kõik kuvatavad detailid"
                    >
                      <CheckSquare size={12} /> Vali kõik
                    </button>
                    <button 
                      onClick={() => setShowCalendar(true)}
                      className="flex items-center gap-1 text-[10px] bg-white border border-gray-200 shadow-sm px-2 py-1 rounded hover:bg-gray-50 text-gray-600"
                    >
                      <Calendar size={12} /> Kalender
                    </button>
                  </div>
                </div>

                <div className="space-y-2 px-3 pb-10">
                  {groupedHistory.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 italic text-xs">
                      Ajalugu puudub
                    </div>
                  ) : (
                    groupedHistory.map(monthGroup => {
                      const isMonthExpanded = expandedMonths.has(monthGroup.key);
                      // Collect all parts for this month for selection
                      const partsInMonth = monthGroup.dates.flatMap(d => d.parts);

                      return (
                        <div key={monthGroup.key} className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
                          {/* Month Header - Selects all parts in month when clicked */}
                          <button 
                            onClick={(e) => handleToggleMonth(e, monthGroup.key, partsInMonth)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-slate-100 hover:bg-slate-200 transition-colors"
                          >
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                              {isMonthExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              <span>{monthGroup.monthLabel}</span>
                            </div>
                          </button>
                          
                          {/* Days List */}
                          {isMonthExpanded && (
                            <div className="divide-y divide-gray-100">
                              {monthGroup.dates.map(dateGroup => {
                                const isDateExpanded = expandedDate === dateGroup.iso;
                                return (
                                  <div key={dateGroup.iso} className="bg-white">
                                    <div className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors
                                        ${isDateExpanded ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                                    >
                                      <button 
                                        onClick={(e) => handleToggleHistoryDate(e, dateGroup.iso, dateGroup.parts)}
                                        className="flex-1 flex items-center gap-2 pl-4 text-left"
                                      >
                                        <CalendarDays size={12} className="opacity-50" />
                                        <span>{dateGroup.label}</span>
                                      </button>
                                      <div className="flex items-center gap-2">
                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] text-gray-500 border border-gray-200">
                                          {dateGroup.parts.length}
                                        </span>
                                        {/* Edit Button for Day Group (Installation / Bolting) */}
                                        {mode !== 'delivery' && (
                                          <button 
                                            onClick={(e) => handleEditGroup(e, dateGroup.parts)}
                                            className="p-1 hover:bg-blue-200 rounded text-blue-600" title="Muuda andmeid"
                                          >
                                            <Pencil size={12} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Detailed View */}
                                    {isDateExpanded && (
                                      <div className="border-t border-blue-100 bg-blue-50/30 pl-8">
                                        {mode === 'delivery' ? (
                                          /* DELIVERY MODE: Group by Vehicle */
                                          dateGroup.deliveryGroups.map((grp: { vehicle: string; parts: AssemblyPart[] }) => (
                                            <div key={grp.vehicle}>
                                              {/* Vehicle Header */}
                                              <div 
                                                onClick={(e) => handleSelectVehicleGroup(e, grp.parts)}
                                                className="bg-blue-100/50 px-3 py-1.5 text-[11px] font-bold text-slate-600 border-y border-blue-200 flex justify-between items-center cursor-pointer hover:bg-blue-200/50 transition-colors"
                                                title="Kliki, et valida ainult selle veose detailid"
                                              >
                                                <div className="flex items-center gap-2">
                                                  <Truck size={12} className="text-blue-500" />
                                                  <span>{grp.vehicle}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  {/* Show times if consistent, otherwise just count */}
                                                  {grp.parts[0]?.delivery?.arrivalTime && (
                                                    <span className="text-[10px] text-gray-500 font-mono">
                                                      {grp.parts[0].delivery.arrivalTime} - {grp.parts[0].delivery.unloadingTime}
                                                    </span>
                                                  )}
                                                  <span className="text-gray-500 font-normal">{grp.parts.length} tk</span>
                                                  <button 
                                                    onClick={(e) => handleEditGroup(e, grp.parts)}
                                                    className="p-1 hover:bg-blue-300 rounded text-blue-700" title="Muuda selle veose andmeid"
                                                  >
                                                    <Pencil size={12} />
                                                  </button>
                                                </div>
                                              </div>
                                              
                                              {/* Parts List for Vehicle */}
                                              <table className="w-full text-xs text-left mb-1">
                                                <tbody className="divide-y divide-blue-100/50">
                                                  {grp.parts.map((p: AssemblyPart) => (
                                                    <tr key={p.id} className="hover:bg-white/60">
                                                      <td className="p-1.5 pl-6 font-medium text-gray-700">{getPartLabel(p)}</td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          ))
                                        ) : (
                                          /* INSTALLATION AND BOLTS MODE: Simple Table */
                                          <table className="w-full text-xs text-left">
                                            <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-400">
                                              <tr>
                                                <th className="p-1.5 pl-3 font-medium">Detail ({mode === 'bolts' ? boltingDisplayField : installDisplayField})</th>
                                                <th className="p-1.5 font-medium">{mode === 'bolts' ? 'Pingutaja' : 'Paigaldaja'}</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {dateGroup.parts.map((p: AssemblyPart) => (
                                                <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-white/60">
                                                  <td className="p-1.5 pl-3 font-medium text-gray-700 flex items-center gap-1">
                                                    {mode === 'installation' && p.installation?.method && METHOD_ICONS[p.installation.method] && (
                                                       <span className="text-gray-400 scale-75">{METHOD_ICONS[p.installation.method]}</span>
                                                    )}
                                                    {getPartLabel(p)}
                                                  </td>
                                                  <td className="p-1.5 text-gray-500">
                                                    {mode === 'bolts' 
                                                      ? p.bolting?.installer 
                                                      : p.installation?.installers.join(', ')}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Fixed Bottom Form */}
            <div className="p-5 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
              {error && (
                <div className={`mb-4 border p-3 rounded-md flex gap-2 animate-in fade-in slide-in-from-bottom-2 ${
                  // Check if this is a "Overwrite" warning based on content (simple heuristic)
                  String(error).includes('Jah, kirjuta üle') || React.isValidElement(error) 
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-900' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="flex-shrink-0 mt-0.5">
                    {/* Render different icon if warning vs error */}
                     <AlertCircle size={18} className={React.isValidElement(error) ? 'text-yellow-600' : 'text-red-600'} />
                  </div>
                  <div className="flex-1">
                    {error}
                  </div>
                </div>
              )}

              {mode === 'installation' && (
                <form onSubmit={handleInstallSubmit} className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <MultiSelect 
                        label="Paigaldajad"
                        icon={<User size={14} />}
                        values={installers}
                        onChange={setInstallers}
                        options={suggestions.installers}
                        placeholder="Lisa nimi..."
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Kuupäev</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                      />
                    </div>
                  </div>
                  
                  {/* Installation Method Selection */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Paigaldus Viis</label>
                    <div className="flex gap-1">
                      {INSTALL_METHODS.map(method => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setInstallMethod(method)}
                          title={METHOD_LABELS[method]}
                          className={`flex-1 py-1.5 text-xs font-medium rounded border transition-colors flex items-center justify-center gap-1.5 ${
                            installMethod === method
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {METHOD_ICONS[method]}
                        </button>
                      ))}
                    </div>
                    {/* Custom Method Input */}
                    {installMethod === 'MUU' && (
                      <div className="mt-2 animate-in slide-in-from-top-1">
                        <input
                          type="text"
                          value={customMethod}
                          onChange={(e) => setCustomMethod(e.target.value)}
                          placeholder="Kirjuta paigaldusviis..."
                          className="w-full px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          autoFocus
                        />
                      </div>
                    )}
                  </div>

                  <button type="submit" disabled={selectedParts.length === 0} className={`w-full flex items-center justify-center gap-2 py-2 rounded-md text-sm font-semibold transition-all shadow-sm ${selectedParts.length > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                    <Save size={16} /> Salvesta
                  </button>
                </form>
              )}

              {mode === 'bolts' && (
                <form onSubmit={handleBoltingSubmit} className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <CreatableSelect 
                        label="Pingutaja"
                        icon={<User size={14} />}
                        value={singleInstaller}
                        onChange={setSingleInstaller}
                        options={suggestions.installers}
                        placeholder="Vali nimi..."
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Kuupäev</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={selectedParts.length === 0} className={`w-full flex items-center justify-center gap-2 py-2 rounded-md text-sm font-semibold transition-all shadow-sm ${selectedParts.length > 0 ? 'bg-orange-500 hover:bg-orange-600 text-white cursor-pointer active:scale-95' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                    <Save size={16} /> Salvesta Pingutamine
                  </button>
                </form>
              )}

              {mode === 'delivery' && (
                <form onSubmit={handleDeliverySubmit} className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <CreatableSelect 
                        label="Auto Nr"
                        icon={<Truck size={14} />}
                        value={vehicle}
                        onChange={setVehicle}
                        options={suggestions.vehicles}
                        placeholder="Vali või kirjuta..."
                      />
                    </div>
                     <div className="w-32">
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Kuupäev</label>
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" required />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                       <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Saabumine</label>
                       <div className="relative">
                         <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                            <Clock size={14} />
                         </div>
                         <input 
                           type="time" 
                           value={arrivalTime} 
                           onChange={(e) => handleArrivalTimeChange(e.target.value)} 
                           className="w-full pl-8 pr-2 py-1.5 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                           required 
                         />
                       </div>
                    </div>
                    <div className="flex-1">
                       <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Lõpp</label>
                       <div className="relative">
                         <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                            <Clock size={14} />
                         </div>
                         <input 
                           type="time" 
                           value={unloadingTime} 
                           onChange={(e) => setUnloadingTime(e.target.value)} 
                           className="w-full pl-8 pr-2 py-1.5 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                           required 
                         />
                       </div>
                    </div>
                  </div>
                  <button type="submit" disabled={selectedParts.length === 0} className={`w-full flex items-center justify-center gap-2 py-2 rounded-md text-sm font-semibold transition-all shadow-sm ${selectedParts.length > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                    <Save size={16} /> Salvesta
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {itemToRemove && (
        <div className="absolute inset-0 z-[100] bg-white/95 backdrop-blur flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
             <Trash2 className="text-red-500" size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Eemalda detail?</h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">Kas oled kindel, et soovid valitud detaili nimekirjast eemaldada?</p>
          <div className="flex gap-3 w-full">
            <button onClick={() => setItemToRemove(null)} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-md font-medium transition-colors">Loobu</button>
            <button onClick={() => { if(itemToRemove) { onRemovePart(itemToRemove); setItemToRemove(null); }}} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium shadow-sm transition-colors">Eemalda</button>
          </div>
        </div>
      )}
    </div>
  );
};