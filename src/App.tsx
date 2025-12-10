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

// ============================================
// 🔬 DIAGNOSTIC SYSTEM v2.3
// ============================================
const APP_VERSION = 'v2.3';

const runDiagnostics = async (api: WorkspaceAPI.WorkspaceAPI) => {
  console.log('%c╔══════════════════════════════════════════════════════════════╗', 'color: #3b82f6; font-weight: bold;');
  console.log('%c║     🔬 RIVEST TC MANAGER - DIAGNOSTIC REPORT ' + APP_VERSION + '          ║', 'color: #3b82f6; font-weight: bold;');
  console.log('%c╚══════════════════════════════════════════════════════════════╝', 'color: #3b82f6; font-weight: bold;');
  console.log('%c⏰ Timestamp: ' + new Date().toISOString(), 'color: #6b7280;');
  console.log('');

  // 1. API Object Structure
  console.group('%c📦 1. API OBJECT STRUCTURE', 'color: #10b981; font-weight: bold;');
  console.log('API object keys:', Object.keys(api));
  console.log('API.viewer methods:', api.viewer ? Object.keys(api.viewer) : 'N/A');
  console.log('API.user methods:', api.user ? Object.keys(api.user) : 'N/A');
  console.log('API.project methods:', api.project ? Object.keys(api.project) : 'N/A');
  console.log('Full API object:', api);
  console.groupEnd();

  // 2. User Info
  console.group('%c👤 2. USER INFO', 'color: #f59e0b; font-weight: bold;');
  try {
    const user = await api.user.getUserDetails();
    console.log('User details:', JSON.stringify(user, null, 2));
    console.table({
      'User ID': user.id || 'N/A',
      'Name': user.name || 'N/A',
      'Email': user.email || 'N/A',
      'Status': '✅ OK'
    });
  } catch (err) {
    console.error('❌ Failed to get user:', err);
  }
  console.groupEnd();

  // 3. Project Info
  console.group('%c📁 3. PROJECT INFO', 'color: #8b5cf6; font-weight: bold;');
  try {
    const project = await api.project.getProject();
    console.log('Project details:', JSON.stringify(project, null, 2));
    console.table({
      'Project ID': project.id || 'N/A',
      'Name': project.name || 'N/A',
      'Description': project.description || 'N/A',
      'Status': '✅ OK'
    });
  } catch (err) {
    console.error('❌ Failed to get project:', err);
  }
  console.groupEnd();

  // 4. Models Info
  console.group('%c🏗️ 4. MODELS INFO', 'color: #ec4899; font-weight: bold;');
  try {
    const models = await api.viewer.getModels();
    console.log('Models count:', models?.length || 0);
    console.log('Models raw:', JSON.stringify(models, null, 2));
    if (models && models.length > 0) {
      models.forEach((model: any, idx: number) => {
        console.log(`Model ${idx + 1}:`, {
          id: model.id,
          name: model.name,
          type: model.type,
          url: model.url
        });
      });
    }
  } catch (err) {
    console.error('❌ Failed to get models:', err);
  }
  console.groupEnd();

  // 5. Current Selection
  console.group('%c🎯 5. CURRENT SELECTION', 'color: #ef4444; font-weight: bold;');
  try {
    const selection = await api.viewer.getSelection();
    console.log('Selection count:', selection?.length || 0);
    console.log('Selection IDs:', selection);

    if (selection && selection.length > 0) {
      // Get objects for selection
      const objects = await api.viewer.getObjects({ selected: true });
      console.log('Selected objects raw:', JSON.stringify(objects, null, 2));

      // Get properties for first object
      if (objects && objects.length > 0) {
        const firstModelObjects = objects[0]?.objects || [];
        if (firstModelObjects.length > 0) {
          const firstObj = firstModelObjects[0];
          console.log('First object:', firstObj);

          try {
            const props = await api.viewer.getObjectProperties([firstObj.objectRuntimeId]);
            console.log('First object properties:', JSON.stringify(props, null, 2));
          } catch (propErr) {
            console.warn('Could not get properties:', propErr);
          }
        }
      }
    } else {
      console.log('ℹ️ No objects selected');
    }
  } catch (err) {
    console.error('❌ Failed to get selection:', err);
  }
  console.groupEnd();

  // 6. Viewer State
  console.group('%c🖥️ 6. VIEWER STATE', 'color: #06b6d4; font-weight: bold;');
  try {
    // Test various viewer methods
    const viewerMethods = [
      'getCamera',
      'getViewpoint',
      'getClippingPlanes',
      'getVisibility'
    ];

    for (const method of viewerMethods) {
      try {
        if (typeof (api.viewer as any)[method] === 'function') {
          const result = await (api.viewer as any)[method]();
          console.log(`viewer.${method}():`, result);
        }
      } catch (e) {
        console.log(`viewer.${method}(): ❌ Not available or error`);
      }
    }
  } catch (err) {
    console.error('❌ Viewer state error:', err);
  }
  console.groupEnd();

  // 7. Extension Info
  console.group('%c🧩 7. EXTENSION INFO', 'color: #84cc16; font-weight: bold;');
  try {
    if (api.extension) {
      console.log('Extension object:', api.extension);
      console.log('Extension methods:', Object.keys(api.extension));
    } else {
      console.log('Extension object not available');
    }
  } catch (err) {
    console.error('❌ Extension info error:', err);
  }
  console.groupEnd();

  // 8. Environment
  console.group('%c🌍 8. ENVIRONMENT', 'color: #f97316; font-weight: bold;');
  console.table({
    'Window location': window.location.href,
    'Parent origin': document.referrer || 'N/A',
    'User Agent': navigator.userAgent.substring(0, 50) + '...',
    'Language': navigator.language,
    'Online': navigator.onLine ? '✅ Yes' : '❌ No'
  });
  console.groupEnd();

  console.log('%c╔══════════════════════════════════════════════════════════════╗', 'color: #3b82f6; font-weight: bold;');
  console.log('%c║              🔬 DIAGNOSTIC COMPLETE                          ║', 'color: #3b82f6; font-weight: bold;');
  console.log('%c╚══════════════════════════════════════════════════════════════╝', 'color: #3b82f6; font-weight: bold;');

  // Return summary
  return {
    timestamp: new Date().toISOString(),
    version: APP_VERSION
  };
};

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

        // Run diagnostics after connection
        await runDiagnostics(connected);
        
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

      // DEBUG: Log available viewer methods
      console.group('🔬 DEBUG: Available viewer methods');
      console.log('viewer keys:', Object.keys(viewer));
      console.log('viewer.getObjects:', typeof viewer.getObjects);
      console.log('viewer.getObjectProperties:', typeof viewer.getObjectProperties);
      console.log('viewer.getObjectInfo:', typeof (viewer as any).getObjectInfo);
      console.log('viewer.getSelectedObjects:', typeof (viewer as any).getSelectedObjects);
      console.groupEnd();

      // Try getObjects with properties parameter
      console.group('🔬 DEBUG: Trying different getObjects calls');

      // Method A: selected: true
      const objectsData = await viewer.getObjects({ selected: true });
      console.log('A) getObjects({ selected: true }):', JSON.stringify(objectsData, null, 2));

      // Method B: selected: true, properties: true
      try {
        const objectsWithProps = await viewer.getObjects({ selected: true, properties: true } as any);
        console.log('B) getObjects({ selected: true, properties: true }):', JSON.stringify(objectsWithProps, null, 2));
      } catch (e) {
        console.warn('B) Failed:', e);
      }

      // Method C: Try getSelectedObjects if available
      try {
        if (typeof (viewer as any).getSelectedObjects === 'function') {
          const selectedObjs = await (viewer as any).getSelectedObjects();
          console.log('C) getSelectedObjects():', JSON.stringify(selectedObjs, null, 2));
        }
      } catch (e) {
        console.warn('C) Failed:', e);
      }

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
          // API returns { id: number } - use id as runtime id
          const runtimeId = obj.id || obj.objectRuntimeId;
          const objectId = obj.objectId || String(runtimeId);

          console.group(`📦 Object: ${objectId} (runtimeId: ${runtimeId})`);
          console.log('Object data:', JSON.stringify(obj, null, 2));

          // Try multiple methods to get properties
          let props: any[] = [];

          // Method 1: getObjectProperties with runtime id
          try {
            console.log('🔍 Trying getObjectProperties([' + runtimeId + '])...');
            props = await viewer.getObjectProperties([runtimeId]);
            console.log('Method 1 result:', JSON.stringify(props, null, 2));
          } catch (e) {
            console.warn('Method 1 failed:', e);
          }

          // Method 2: getObjectPropertySets if Method 1 failed
          if (!props || props.length === 0) {
            try {
              console.log('🔍 Trying getObjectPropertySets([' + runtimeId + '])...');
              const propSets = await (viewer as any).getObjectPropertySets([runtimeId]);
              console.log('Method 2 result:', JSON.stringify(propSets, null, 2));
              if (propSets && propSets.length > 0) {
                // Flatten property sets into single object
                const flatProps: Record<string, any> = {};
                for (const pset of propSets) {
                  if (pset.properties) {
                    for (const prop of pset.properties) {
                      flatProps[prop.name] = prop.value;
                    }
                  }
                }
                props = [flatProps];
              }
            } catch (e) {
              console.warn('Method 2 failed:', e);
            }
          }

          // Method 3: Try with model context
          if (!props || props.length === 0) {
            try {
              console.log('🔍 Trying getObjectProperties with model context...');
              props = await viewer.getObjectProperties([{ modelId, objectRuntimeId: runtimeId }]);
              console.log('Method 3 result:', JSON.stringify(props, null, 2));
            } catch (e) {
              console.warn('Method 3 failed:', e);
            }
          }

          console.log('Final properties:', JSON.stringify(props, null, 2));
          console.groupEnd();

          if (props && props.length > 0) {
            properties.push({
              objectId: objectId,
              properties: props[0] || {}
            });
          } else {
            // Still add the object with empty properties so we can track it
            properties.push({
              objectId: objectId,
              properties: { _runtimeId: runtimeId, _modelId: modelId }
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
