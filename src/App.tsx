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
// 🔬 DIAGNOSTIC SYSTEM v2.5 - Full Extraction
// ============================================
const APP_VERSION = 'v2.5';

// ============================================
// 📦 HELPER FUNCTIONS
// ============================================

/**
 * Get selected objects from the viewer
 * Returns array of { modelId, objects[] }
 */
const getSelectedObjects = async (api: WorkspaceAPI.WorkspaceAPI): Promise<Array<{
  modelId: string;
  objects: any[];
}>> => {
  try {
    const viewer = api.viewer;
    const objectsData = await viewer.getObjects({ selected: true });

    if (!objectsData || !Array.isArray(objectsData)) {
      return [];
    }

    return objectsData
      .filter((m: any) => m?.modelId && Array.isArray(m?.objects) && m.objects.length > 0)
      .map((m: any) => ({
        modelId: String(m.modelId),
        objects: m.objects
      }));
  } catch (err) {
    console.error('❌ getSelectedObjects failed:', err);
    return [];
  }
};

/**
 * Flatten object properties into a simple key-value structure
 * Extracts GUID and all Tekla/IFC properties
 * Handles multiple property formats from Trimble Connect API
 */
const flattenProps = async (
  obj: any,
  modelId: string,
  api: WorkspaceAPI.WorkspaceAPI
): Promise<{
  objectId: string;
  guid: string;
  properties: Record<string, any>;
}> => {
  const result: Record<string, any> = {};
  const runtimeId = obj?.id || obj?.objectRuntimeId;
  const objectId = String(runtimeId);

  // Extract GUID from various sources
  let guid = '';

  // Try to get from object directly
  if (obj?.guid) guid = obj.guid;
  if (obj?.GUID) guid = obj.GUID;
  if (obj?.GlobalId) guid = obj.GlobalId;
  if (obj?.guidIfc) guid = obj.guidIfc;

  // Process properties if they exist
  const props = obj?.properties || [];

  // Helper to recursively flatten nested objects
  const flattenObject = (obj: any, prefix: string = '') => {
    if (!obj || typeof obj !== 'object') return;

    Object.entries(obj).forEach(([key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively flatten nested objects
        flattenObject(value, fullKey);

        // Also check for GUID in nested objects
        if ((value as any).guidIfc) {
          if (!guid) guid = String((value as any).guidIfc);
          result.GUID_IFC = (value as any).guidIfc;
        }
        if ((value as any).GUID_MS || (value as any).guidMs) {
          result.GUID_MS = (value as any).GUID_MS || (value as any).guidMs;
        }
      } else {
        result[fullKey] = value;

        // Also store without prefix for easier access
        if (!result[key]) {
          result[key] = value;
        }
      }

      // Check for GUID fields
      if (key === 'GUID' || key === 'GlobalId' || key === 'guidIfc' || key === 'IFC GUID') {
        if (!guid && value) guid = String(value);
        result.GUID_IFC = value;
      }
      if (key === 'GUID_MS' || key === 'MS_GUID' || key === 'guidMs') {
        result.GUID_MS = value;
      }
    });
  };

  if (Array.isArray(props)) {
    // Properties come as array of property sets
    for (const propSet of props) {
      const setName = propSet?.name || propSet?.propertySetName || '';
      const properties = propSet?.properties || propSet?.data || [];

      if (Array.isArray(properties)) {
        for (const prop of properties) {
          const propName = prop?.name || prop?.propertyName || '';
          const propValue = prop?.value ?? prop?.propertyValue ?? prop?.data ?? '';

          if (propName) {
            // Create key with property set prefix if available
            const key = setName ? `${setName}.${propName}` : propName;
            result[key] = propValue;

            // Also store without prefix for easier access
            if (!result[propName]) {
              result[propName] = propValue;
            }

            // Check for GUID fields
            if (propName === 'GUID' || propName === 'GlobalId' || propName === 'guidIfc') {
              if (!guid && propValue) guid = String(propValue);
              result.GUID_IFC = propValue;
            }
            if (propName === 'GUID_MS' || propName === 'MS_GUID' || propName === 'guidMs') {
              result.GUID_MS = propValue;
            }
          }
        }
      } else if (typeof properties === 'object') {
        // Properties come as object within property set
        flattenObject(properties, setName);
      }

      // Also flatten the propSet itself if it has direct properties
      if (typeof propSet === 'object') {
        flattenObject(propSet, setName);
      }
    }
  } else if (typeof props === 'object') {
    // Properties come as object directly
    flattenObject(props, '');
  }

  // Also check object itself for additional properties
  if (obj && typeof obj === 'object') {
    // Check ReferenceObject for GUID
    if (obj.ReferenceObject) {
      if (obj.ReferenceObject.guidIfc && !guid) {
        guid = obj.ReferenceObject.guidIfc;
        result.GUID_IFC = obj.ReferenceObject.guidIfc;
      }
      if (obj.ReferenceObject.GUID_MS || obj.ReferenceObject.guidMs) {
        result.GUID_MS = obj.ReferenceObject.GUID_MS || obj.ReferenceObject.guidMs;
      }
    }

    // Check Product for name/type
    if (obj.Product) {
      result.ProductName = obj.Product.Product_Name || obj.Product.name;
      result.ProductDescription = obj.Product.Product_Description || obj.Product.description;
      result.ProductType = obj.Product.Product_Object_Type || obj.Product.type;
    }
  }

  // Fallback GUID from result or generate from runtime ID
  if (!guid) {
    guid = result.GUID || result.GUID_IFC || result.GlobalId || result.guidIfc ||
           result['IFC GUID'] || `runtime-${modelId}-${objectId}`;
  }

  console.log(`   🔍 flattenProps result for ${objectId}: GUID=${guid}, keys=${Object.keys(result).length}`);

  return {
    objectId,
    guid,
    properties: result
  };
};

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
    const user = await api.user.getUser();
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

  // 8. DataTable API
  console.group('%c📊 8. DATATABLE API', 'color: #14b8a6; font-weight: bold;');
  try {
    const dataTableApi = (api as any).dataTable;
    if (dataTableApi) {
      console.log('DataTable API available:', Object.keys(dataTableApi));

      // Try to get config
      try {
        const config = await dataTableApi.getDataTableConfig?.();
        console.log('DataTable config:', JSON.stringify(config, null, 2));
      } catch (e) {
        console.log('getDataTableConfig: ❌ Not available or error');
      }

      // Try to get selected rows
      try {
        const selectedRows = await dataTableApi.getSelectedRowsData?.();
        console.log('Selected rows data:', JSON.stringify(selectedRows, null, 2));
      } catch (e) {
        console.log('getSelectedRowsData: ❌ Not available or error');
      }

      // List all methods
      for (const method of Object.keys(dataTableApi)) {
        console.log(`  - dataTable.${method}: ${typeof dataTableApi[method]}`);
      }
    } else {
      console.log('DataTable API not available');
    }
  } catch (err) {
    console.error('❌ DataTable API error:', err);
  }
  console.groupEnd();

  // 9. Environment
  console.group('%c🌍 9. ENVIRONMENT', 'color: #f97316; font-weight: bold;');
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
          const user = await connected.user.getUser();
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

  // Handle selection changes from viewer - FULL EXTRACTION v2.5
  const handleSelectionChange = useCallback(async (selection: any[]) => {
    if (!api || !projectId || !projectName) {
      console.log('⏭️ Skipping selection change - not ready');
      return;
    }

    if (!selection || selection.length === 0) {
      console.log('🔄 Selection cleared');
      setParts([]);
      return;
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🎯 FULL EXTRACTION - Metadata + Tekla + Properties');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Selected: ${selection.length} objects`);

    try {
      const viewer = api.viewer;

      // ═══════════════════════════════════════════════════════════
      // STEP 1: Get Project and Models info
      // ═══════════════════════════════════════════════════════════
      console.log('\n📁 STEP 1: Loading project and model metadata...');

      // Get project info
      const project = await api.project.getProject();
      const projectNameFull = project?.name || projectName || 'Unknown Project';
      console.log(`   Project: ${projectNameFull} (${projectId})`);

      // Get all models
      const allModels = await viewer.getModels();
      const modelNameMap = new Map<string, string>();

      allModels?.forEach((m: any) => {
        if (m?.id && m?.name) {
          modelNameMap.set(String(m.id), String(m.name));
          console.log(`   Model: ${m.name} (${m.id})`);
        }
      });

      // ═══════════════════════════════════════════════════════════
      // STEP 2: Get selected objects
      // ═══════════════════════════════════════════════════════════
      console.log('\n📦 STEP 2: Getting selected objects...');
      const selectedWithBasic = await getSelectedObjects(api);

      if (!selectedWithBasic.length) {
        console.warn('⚠️ No objects selected');
        setParts([]);
        return;
      }

      console.log(`✅ Found ${selectedWithBasic.length} model(s) with selected objects`);

      // ═══════════════════════════════════════════════════════════
      // STEP 3: Load full properties for each object
      // ═══════════════════════════════════════════════════════════
      console.log('\n📋 STEP 3: Loading full properties with metadata...');

      const propertiesCollection: Array<{
        objectId: string;
        guid: string;
        properties: Record<string, any>;
      }> = [];

      for (const { modelId: currentModelId, objects } of selectedWithBasic) {
        const currentModelName = modelNameMap.get(currentModelId) || modelName || 'Unknown Model';

        console.log(`\n   📦 Model: ${currentModelName} (${currentModelId})`);
        console.log(`   Objects count: ${objects.length}`);

        // Extract runtime IDs
        const objectRuntimeIds = objects
          .map((o: any) => Number(o?.id))
          .filter((n: number) => Number.isFinite(n));

        // Load FULL properties (including hidden)
        let fullObjects = objects;

        try {
          console.log(`   ⏳ Loading properties with getObjectProperties...`);

          const fullProperties = await viewer.getObjectProperties(
            currentModelId,
            objectRuntimeIds,
            { includeHidden: true }
          );

          console.log(`   ✅ Got ${fullProperties?.length || 0} property sets`);

          // DEBUG: Log raw structure
          console.log('   📦 RAW fullProperties:', JSON.stringify(fullProperties, null, 2));

          // Merge properties into objects
          fullObjects = objects.map((obj: any, idx: number) => {
            const propData = fullProperties?.[idx];
            console.log(`   📦 Object ${idx} propData:`, JSON.stringify(propData, null, 2));
            return {
              ...obj,
              properties: propData?.properties || propData || obj.properties,
            };
          });

        } catch (e: any) {
          console.error(`   ❌ getObjectProperties failed:`, e.message);

          // Try alternative method
          try {
            console.log(`   ⏳ Trying alternative: getObjectProperties with array...`);
            for (let i = 0; i < objects.length; i++) {
              const obj = objects[i];
              const runtimeId = obj?.id || obj?.objectRuntimeId;
              try {
                const props = await viewer.getObjectProperties([runtimeId]);
                if (props && props.length > 0) {
                  fullObjects[i] = { ...obj, properties: props[0]?.properties || props };
                }
              } catch (innerErr) {
                // Continue with next object
              }
            }
          } catch (altErr) {
            console.warn(`   ⚠️ Alternative method also failed`);
          }
        }

        // Flatten each object's properties + ADD METADATA
        console.log(`   🔄 Flattening ${fullObjects.length} objects...`);

        for (const obj of fullObjects) {
          try {
            const flattened = await flattenProps(obj, currentModelId, api);

            // ═══════════════════════════════════════════════════════════
            // ADD METADATA FIELDS
            // ═══════════════════════════════════════════════════════════
            flattened.properties.FileName = currentModelName;
            flattened.properties.ModelId = currentModelId;
            flattened.properties.Project = projectNameFull;

            // Type from object
            flattened.properties.Type = obj?.type
              || flattened.properties.Type
              || flattened.properties['Tekla_Assembly.Cast_unit_type']
              || 'Unknown';

            // Name from object
            flattened.properties.Name = obj?.name
              || flattened.properties.Name
              || flattened.properties['Tekla_Assembly.Cast_unit_Mark']
              || '';

            console.log(`   ✅ Object ${flattened.objectId}:`);
            console.log(`      GUID: ${flattened.guid}`);
            console.log(`      FileName: ${flattened.properties.FileName}`);
            console.log(`      Type: ${flattened.properties.Type}`);
            console.log(`      Mark: ${flattened.properties['Tekla_Assembly.Cast_unit_Mark'] || flattened.properties.Mark || 'N/A'}`);

            propertiesCollection.push(flattened);

          } catch (err: any) {
            console.error(`   ❌ Failed to flatten object ${obj?.id}:`, err.message);
          }
        }
      }

      console.log(`\n✅ Total properties collected: ${propertiesCollection.length}`);

      // ═══════════════════════════════════════════════════════════
      // STEP 4: Verify all required fields
      // ═══════════════════════════════════════════════════════════
      console.log('\n🔍 STEP 4: Verifying required fields...');

      propertiesCollection.forEach((item, idx) => {
        const props = item.properties;

        console.log(`\n   Object ${idx + 1}/${propertiesCollection.length}:`);
        console.log(`      ✓ GUID: ${item.guid || '❌ MISSING'}`);
        console.log(`      ✓ FileName: ${props.FileName || '❌ MISSING'}`);
        console.log(`      ✓ ModelId: ${props.ModelId || '❌ MISSING'}`);
        console.log(`      ✓ Project: ${props.Project || '❌ MISSING'}`);
        console.log(`      ✓ Type: ${props.Type || '(empty)'}`);
        console.log(`      ✓ Name: ${props.Name || '(empty)'}`);

        // Check Tekla fields
        const teklaFields = [
          'Tekla_Assembly.Cast_unit_Mark',
          'Tekla_Assembly.Assembly',
          'Tekla_Assembly.Cast_unit_weight',
          'Tekla_Assembly.Cast_unit_position_code'
        ];

        const foundTekla = teklaFields.filter(f => props[f]);
        if (foundTekla.length > 0) {
          console.log(`      🏗️ Tekla fields: ${foundTekla.length}/${teklaFields.length} found`);
        }
      });

      // ═══════════════════════════════════════════════════════════
      // STEP 5: Sync to Supabase
      // ═══════════════════════════════════════════════════════════
      console.log('\n💾 STEP 5: Syncing to Supabase...');

      if (propertiesCollection.length === 0) {
        throw new Error('No properties could be loaded');
      }

      await AssemblyAPI.syncParts(
        projectId,
        projectName,
        modelId || 'default-model',
        modelName || 'Unknown Model',
        propertiesCollection
      );

      console.log('✅ Synced to Supabase');

      // ═══════════════════════════════════════════════════════════
      // STEP 6: Load from Supabase
      // ═══════════════════════════════════════════════════════════
      console.log('\n📥 STEP 6: Loading from Supabase...');

      const guids = propertiesCollection.map(p => p.guid);
      const loadedParts = await AssemblyAPI.getPartsByGuids(projectId, guids);

      console.log(`✅ Loaded ${loadedParts.length} parts from database`);

      // Map to UI format
      setParts(loadedParts.map(p => ({
        id: p.object_id,
        guid: p.guid,
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

      console.log('═══════════════════════════════════════════════════════════\n');

    } catch (err: any) {
      console.error('❌ Error:', err);
      alert('Viga andmete laadimisel: ' + err.message);
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
