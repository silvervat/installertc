
export interface InstallationData {
  installers: string[]; // Changed from single string
  date: string;
  method: string; // e.g. 'Kraana', 'Upitaja', 'Käsitsi', 'Muu: ...'
}

export interface DeliveryData {
  vehicle: string; // Auto nr
  date: string;
  arrivalTime: string; // HH:mm
  unloadingTime: string; // HH:mm
}

export interface BoltingData {
  installer: string; // Only one worker allowed for bolts
  date: string;
}

export interface PartLogEntry {
  timestamp: string; // ISO DateTime
  action: string; // Description of action
  user: string; // User who performed it
}

export interface AssemblyPart {
  id: string; // Internal ID
  guid: string; // Global Unique Identifier
  name: string; // Name (e.g. "BEAM")
  castUnitPos: string; // Cast Unit Position / Mark (e.g. "B-101")
  
  position: { x: number; y: number }; // Used for the mock viewer
  
  // Selection state
  isSelected: boolean;

  // Status data
  installation?: InstallationData;
  delivery?: DeliveryData;
  bolting?: BoltingData;
  
  // Audit Trail
  logs: PartLogEntry[];
}

export type AppMode = 'installation' | 'delivery' | 'statistics' | 'bolts';
export type DisplayField = 'name' | 'guid' | 'castUnitPos';

export interface InstallationRecord {
  installerNames: string[]; // Changed from single string
  date: string;
  method: string;
}

export interface DeliveryRecord {
  vehicle: string;
  date: string;
  arrivalTime: string;
  unloadingTime: string;
}

export interface BoltingRecord {
  installerName: string;
  date: string;
}
