import { useEffect, useState, useCallback, useRef } from 'react';
import * as WorkspaceAPI from 'trimble-connect-workspace-api';
import { Sidebar } from '../components/Sidebar';
import { AssemblyAPI } from './lib/api';
import type {
  AssemblyPart,
  InstallationRecord,
  DeliveryRecord,
  BoltingRecord,
  AppMode
} from '../types';

function App() {
  // Trimble Connect state
  const [api, setApi] = useState<WorkspaceAPI.WorkspaceAPI | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // App state
  const [parts, setParts] = useState<AssemblyPart[]>([]);
  const [mode, setMode] = useState<AppMode>('installation');
  const [userName, setUserName] = useState<string>('Kasutaja');
  const [projectId, setProjectId] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [modelId, setModelId] = useState<string>('');
  const [modelName, setModelName] = useState<string>('');
  const [assemblySelectionEnabled] = useState(true);

  // Ref to hold latest handleSelectionChange to avoid stale closure
  const handleSelectionChangeRef = useRef<((selection: string[]) => Promise<void>) | null>(null);

  // Connect to Trimble Connect - AUTOMAATNE, ei vaja mingeid API võtmeid!
  useEffect(() => {
    async function init() {
      try {
        const connected = await WorkspaceAPI.connect(
          window.parent,
          (event, data) => {
            console.log('📡 Workspace event:', event, data);
            
            if (event === 'extension.accessToken') {
              console.log('🔑 Access token received');
            }
            
            // Handle selection changes in viewer
            if (event === 'viewer.selectionChanged') {
              console.log('🎯 Selection changed:', data);
              // Use ref to get latest handler (avoids stale closure)
              if (handleSelectionChangeRef.current) {
                handleSelectionChangeRef.current(data.selection || []);
              }
            }
          },
          30000 // 30 second timeout
        );
        
        setApi(connected);
        console.log('✅ Connected to Trimble Connect');
        
        // Get user info - automaatne Trimble Connect API-st
        try {
          const user = await connected.user.getUserDetails();
          setUserName(user.name || user.email || 'Kasutaja');
          console.log('👤 User:', user.name || user.email);
        } catch (err) {
          console.warn('⚠️ Could not get user info:', err);
        }
        
        // Get project info - automaatne Trimble Connect API-st
        try {
          const project = await connected.project.getProject();
          setProjectId(project.id);
          setProjectName(project.name);
          console.log('📁 Project:', project.name, project.id);
        } catch (err) {
          console.warn('⚠️ Could not get project info:', err);
        }
        
        // Get active models - automaatne Trimble Connect API-st
        try {
          const models = await connected.viewer.getModels();
          if (models && models.length > 0) {
            const firstModel = models[0];
            setModelId(firstModel.id);
            setModelName(firstModel.name || 'Unknown Model');
            console.log('🏗️ Model:', firstModel.name, firstModel.id);
          }
        } catch (err) {
          console.warn('⚠️ Could not get model info:', err);
        }
        
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || 'Failed to connect to Trimble Connect');
        console.error('❌ Connection error:', err);
        setLoading(false);
      }
    }
    init();
  }, []);

  // Polling for selection changes (backup mechanism)
  const lastSelectionRef = useRef<string[]>([]);

  useEffect(() => {
    if (!api || loading) return;

    const pollSelection = async () => {
      try {
        const selection = await api.viewer.getSelection();
        const currentIds = selection || [];

        // Check if selection changed
        const lastIds = lastSelectionRef.current;
        const changed = currentIds.length !== lastIds.length ||
          currentIds.some((id, i) => id !== lastIds[i]);

        if (changed) {
          console.log('🔄 Polling detected selection change:', currentIds.length, 'objects');
          lastSelectionRef.current = currentIds;
          if (handleSelectionChangeRef.current) {
            handleSelectionChangeRef.current(currentIds);
          }
        }
      } catch (err) {
        // Ignore polling errors
      }
    };

    // Poll every 1 second
    const interval = setInterval(pollSelection, 1000);

    // Initial check
    pollSelection();

    return () => clearInterval(interval);
  }, [api, loading]);

  // Handle selection changes from viewer
  const handleSelectionChange = useCallback(async (selection: string[]) => {
    if (!api || !projectId || !projectName) {
      console.log('⏭️ Skipping selection change - not ready');
      return;
    }

    if (selection.length === 0) {
      console.log('🔄 Selection cleared');
      setParts([]);
      return;
    }

    console.log(`🔍 Loading ${selection.length} selected objects...`);
    console.log('📍 Selection IDs:', selection);

    try {
      // Get properties for selected objects - kasutab Trimble Connect API-t
      const viewer = api.viewer;
      const objectsData = await viewer.getObjects({ selected: true });

      // DEBUG: Log raw API response
      console.group('🔬 DEBUG: Trimble API Raw Response');
      console.log('viewer.getObjects({ selected: true }):', JSON.stringify(objectsData, null, 2));
      console.groupEnd();

      if (!objectsData || objectsData.length === 0) {
        console.warn('No object data found');
        return;
      }

      // Extract properties from each model
      const properties: Array<{ objectId: string; properties: Record<string, any> }> = [];

      for (const modelData of objectsData) {
        const modelId = modelData.modelId;
        const objects = modelData.objects || [];

        console.group(`🏗️ DEBUG: Model ${modelId}`);
        console.log('Model data:', JSON.stringify(modelData, null, 2));
        console.log('Objects count:', objects.length);

        for (const obj of objects) {
          const props = await viewer.getObjectProperties([obj.objectRuntimeId]);

          // DEBUG: Log each object's properties
          console.group(`📦 Object: ${obj.objectId}`);
          console.log('Object data:', JSON.stringify(obj, null, 2));
          console.log('Object properties:', JSON.stringify(props, null, 2));
          console.groupEnd();

          if (props && props.length > 0) {
            properties.push({
              objectId: obj.objectId,
              properties: props[0] || {}
            });
          }
        }
        console.groupEnd();
      }

      console.log('📋 Properties loaded:', properties.length);
      console.log('📋 All properties:', JSON.stringify(properties, null, 2));
      
      // Sync to Supabase with project name and model name
      await AssemblyAPI.syncParts(
        projectId, 
        projectName,
        modelId || 'default-model',
        modelName || 'Unknown Model',
        properties
      );
      
      // Load from Supabase with all related data
      const loadedParts = await AssemblyAPI.getParts(
        projectId, 
        modelId || 'default-model',
        selection
      );
      
      console.log('✅ Loaded parts from database:', loadedParts.length);
      
      // Map to local format
      setParts(loadedParts.map(p => ({
        id: p.object_id,
        mark: p.mark || 'N/A',
        assembly: p.assembly || '',
        name: p.name || '',
        weight: p.weight || 0,
        phase: p.phase || '',
        isSelected: true,
        installation: p.installation ? {
          installers: p.installation.installers,
          date: p.installation.date,
          method: p.installation.method
        } : undefined,
        delivery: p.delivery ? {
          vehicle: p.delivery.vehicle,
          date: p.delivery.date,
          arrivalTime: p.delivery.arrival_time,
          unloadingTime: p.delivery.unloading_time
        } : undefined,
        bolting: p.bolting ? {
          installer: p.bolting.installer,
          date: p.bolting.date
        } : undefined,
        logs: (p.logs || []).map(log => ({
          timestamp: log.timestamp,
          action: log.action,
          user: log.user_name
        }))
      })));
    } catch (err) {
      console.error('❌ Error loading parts:', err);
      alert('Viga andmete laadimisel: ' + (err as Error).message);
    }
  }, [api, projectId, projectName, modelId, modelName]);

  // Keep ref updated with latest handleSelectionChange
  useEffect(() => {
    handleSelectionChangeRef.current = handleSelectionChange;
  }, [handleSelectionChange]);

  // Colorize objects in 3D view
  const colorizeObjects = useCallback(async (
    objectIds: string[], 
    color: string
  ) => {
    if (!api) return;
    
    try {
      // Convert hex to RGB for Trimble Connect API
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      
      await api.viewer.setObjectColors(objectIds.map(id => ({
        objectId: id,
        color: { r, g, b, a: 1.0 }
      })));
      
      console.log(`🎨 Colorized ${objectIds.length} objects with ${color}`);
    } catch (err) {
      console.error('❌ Error colorizing objects:', err);
    }
  }, [api]);

  // Get database IDs for object IDs
  const getPartDbIds = useCallback(async (objectIds: string[]): Promise<string[]> => {
    const dbParts = await AssemblyAPI.getParts(projectId, modelId, objectIds);
    return dbParts.map(p => p.id);
  }, [projectId, modelId]);

  // Handle saving installation
  const handleSaveInstallation = useCallback(async (data: InstallationRecord) => {
    const selectedIds = parts.filter(p => p.isSelected).map(p => p.id);
    
    if (selectedIds.length === 0) {
      alert('Vali vähemalt üks objekt');
      return;
    }

    try {
      const partIds = await getPartDbIds(selectedIds);
      await AssemblyAPI.saveInstallation(partIds, data, userName);
      
      // Colorize in 3D view (green)
      await colorizeObjects(selectedIds, '#4ade80');
      
      // Reload parts to show updated data
      await handleSelectionChange(selectedIds);
      
      console.log('✅ Installation saved successfully');
    } catch (err) {
      console.error('❌ Error saving installation:', err);
      alert('Viga salvestamisel: ' + (err as Error).message);
    }
  }, [parts, userName, colorizeObjects, handleSelectionChange, getPartDbIds]);

  // Handle saving delivery
  const handleSaveDelivery = useCallback(async (data: DeliveryRecord) => {
    const selectedIds = parts.filter(p => p.isSelected).map(p => p.id);
    
    if (selectedIds.length === 0) {
      alert('Vali vähemalt üks objekt');
      return;
    }

    try {
      const partIds = await getPartDbIds(selectedIds);
      await AssemblyAPI.saveDelivery(partIds, data, userName);
      
      // Colorize in 3D view (blue)
      await colorizeObjects(selectedIds, '#60a5fa');
      
      await handleSelectionChange(selectedIds);
      
      console.log('✅ Delivery saved successfully');
    } catch (err) {
      console.error('❌ Error saving delivery:', err);
      alert('Viga salvestamisel: ' + (err as Error).message);
    }
  }, [parts, userName, colorizeObjects, handleSelectionChange, getPartDbIds]);

  // Handle saving bolting
  const handleSaveBolting = useCallback(async (data: BoltingRecord) => {
    const selectedIds = parts.filter(p => p.isSelected).map(p => p.id);
    
    if (selectedIds.length === 0) {
      alert('Vali vähemalt üks objekt');
      return;
    }

    try {
      const partIds = await getPartDbIds(selectedIds);
      await AssemblyAPI.saveBolting(partIds, data, userName);
      
      // Colorize in 3D view (orange)
      await colorizeObjects(selectedIds, '#fb923c');
      
      await handleSelectionChange(selectedIds);
      
      console.log('✅ Bolting saved successfully');
    } catch (err) {
      console.error('❌ Error saving bolting:', err);
      alert('Viga salvestamisel: ' + (err as Error).message);
    }
  }, [parts, userName, colorizeObjects, handleSelectionChange, getPartDbIds]);

  // Handle bulk update
  const handleBulkUpdate = useCallback(async (
    ids: string[], 
    updateMode: AppMode, 
    data: any
  ) => {
    try {
      const partIds = await getPartDbIds(ids);
      await AssemblyAPI.bulkUpdate(partIds, updateMode, data, userName);
      
      // Reload to show changes
      await handleSelectionChange(ids);
      
      console.log('✅ Bulk update successful');
    } catch (err) {
      console.error('❌ Error in bulk update:', err);
      alert('Viga uuendamisel: ' + (err as Error).message);
    }
  }, [userName, handleSelectionChange, getPartDbIds]);

  // Handle delete data
  const handleDeleteData = useCallback(async (
    ids: string[], 
    deleteMode: AppMode
  ) => {
    try {
      const partIds = await getPartDbIds(ids);
      await AssemblyAPI.deleteData(partIds, deleteMode, userName);
      
      // Reset colors in 3D view
      await api?.viewer.resetObjectColors(ids);
      
      // Reload to show changes
      await handleSelectionChange(ids);
      
      console.log('✅ Delete successful');
    } catch (err) {
      console.error('❌ Error deleting data:', err);
      alert('Viga kustutamisel: ' + (err as Error).message);
    }
  }, [api, userName, handleSelectionChange, getPartDbIds]);

  // Handle clear selection
  const handleClearSelection = useCallback(() => {
    if (api) {
      api.viewer.clearSelection();
    }
  }, [api]);

  // Handle remove part (deselect single part)
  const handleRemovePart = useCallback((id: string) => {
    const newSelection = parts
      .filter(p => p.isSelected && p.id !== id)
      .map(p => p.id);
    
    if (api) {
      api.viewer.setSelection(newSelection);
    }
  }, [api, parts]);

  // Handle set selection (select specific parts)
  const handleSetSelection = useCallback((ids: string[]) => {
    if (api) {
      api.viewer.setSelection(ids);
    }
  }, [api]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">Ühendatakse...</div>
          <div className="text-sm text-gray-500">Trimble Connect</div>
          <div className="mt-4 text-xs text-gray-400">
            Laadib Workspace API-t
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen p-4 bg-red-50">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-lg font-bold mb-3">
            ❌ Ühenduse viga
          </div>
          <div className="text-red-700 mb-4">{error}</div>
          <div className="text-sm text-red-600 opacity-75">
            Veendu, et laiendus on laaditud Trimble Connect Web rakenduses.
          </div>
          <div className="mt-4 text-xs text-gray-500">
            Manifest ID: assembly-installer
          </div>
        </div>
      </div>
    );
  }

  const selectedParts = parts.filter(p => p.isSelected);

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans bg-white">
      <Sidebar 
        selectedParts={selectedParts}
        allParts={parts}
        mode={mode}
        assemblySelectionEnabled={assemblySelectionEnabled}
        onModeChange={setMode}
        onSaveInstallation={handleSaveInstallation}
        onSaveDelivery={handleSaveDelivery}
        onSaveBolting={handleSaveBolting}
        onClearSelection={handleClearSelection}
        onRemovePart={handleRemovePart}
        onSetSelection={handleSetSelection}
        onBulkUpdate={handleBulkUpdate}
        onDeleteData={handleDeleteData}
      />
    </div>
  );
}

export default App;
