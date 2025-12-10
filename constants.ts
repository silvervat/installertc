
import { AssemblyPart } from './types';

// Simulating model objects retrieved from Trimble Connect
export const MOCK_MODEL_PARTS: AssemblyPart[] = [
  { 
    id: '1', guid: 'ifc-guid-101', name: 'Steel Beam', castUnitPos: 'B-101', isSelected: false, position: { x: 20, y: 30 },
    installation: { installers: ['Jaan Tamm', 'Peeter Paju'], date: '2023-10-01', method: 'Kraana' },
    delivery: { vehicle: '123 ABC', date: '2023-09-28', arrivalTime: '08:00', unloadingTime: '09:00' },
    bolting: { installer: 'Jaan Tamm', date: '2023-10-02' },
    logs: [
      { timestamp: '2023-09-28T08:00:00Z', action: 'Tarnitud (123 ABC)', user: 'Süsteem' },
      { timestamp: '2023-10-01T10:00:00Z', action: 'Paigaldatud (Kraana)', user: 'Süsteem' },
      { timestamp: '2023-10-02T14:00:00Z', action: 'Poldid pingutatud', user: 'Süsteem' }
    ]
  },
  { 
    id: '2', guid: 'ifc-guid-202', name: 'Concrete Column', castUnitPos: 'C-202', isSelected: false, position: { x: 50, y: 30 },
    installation: { installers: ['Jaan Tamm'], date: '2023-10-01', method: 'Upitaja' },
    logs: [
      { timestamp: '2023-10-01T11:30:00Z', action: 'Paigaldatud (Upitaja)', user: 'Süsteem' }
    ]
  },
  { id: '3', guid: 'ifc-guid-102', name: 'Steel Beam', castUnitPos: 'B-102', isSelected: false, position: { x: 80, y: 30 },
    delivery: { vehicle: '456 XYZ', date: '2023-09-28', arrivalTime: '14:30', unloadingTime: '15:30' },
    logs: [
      { timestamp: '2023-09-28T14:30:00Z', action: 'Tarnitud (456 XYZ)', user: 'Süsteem' }
    ]
  },
  { id: '4', guid: 'ifc-guid-055', name: 'Connection Plate', castUnitPos: 'PL-55', isSelected: false, position: { x: 35, y: 60 }, logs: [] },
  { id: '5', guid: 'ifc-guid-056', name: 'Connection Plate', castUnitPos: 'PL-56', isSelected: false, position: { x: 65, y: 60 }, logs: [] },
  { id: '6', guid: 'ifc-guid-001', name: 'Wind Brace', castUnitPos: 'WB-01', isSelected: false, position: { x: 20, y: 80 }, logs: [] },
  { id: '7', guid: 'ifc-guid-002', name: 'Wind Brace', castUnitPos: 'WB-02', isSelected: false, position: { x: 80, y: 80 }, logs: [] },
];

export const DEFAULT_INSTALLER = "Silver Vat";
export const DEFAULT_VEHICLE = "123 ABC";
