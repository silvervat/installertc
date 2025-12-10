/**
 * Alternative methods to get GUID from Trimble Connect objects
 *
 * Problem: API.viewer.getObjectProperties() doesn't always return GUID
 * Solution: Try alternative API methods and extraction techniques
 */

import type { WorkspaceAPI } from 'trimble-connect-workspace-api';

export interface GUIDSearchResult {
  found: boolean;
  guid?: string;
  source?: string;
  additionalData?: Record<string, any>;
}

export interface ComprehensiveGUIDResult {
  modelId: string;
  objectId: string;
  guidsFound: Array<{
    guid: string;
    source: string;
    type: 'IFC' | 'MS' | 'Unknown';
  }>;
  apiMethodsAvailable: string[];
  rawData: Record<string, any>;
}

/**
 * Method 1: Try getPsetDefinitions (if available)
 * Some versions of TC API have getPsetDefinitions which may contain GUIDs
 */
export async function getGUIDFromPset(
  api: WorkspaceAPI,
  modelId: string,
  objectId: string
): Promise<GUIDSearchResult> {
  try {
    const viewer = api.viewer as any;

    if (typeof viewer.getPsetDefinitions === 'function') {
      const psets = await viewer.getPsetDefinitions(modelId);
      console.log('📋 Pset definitions:', psets);

      // Search for GUID in psets
      if (psets && Array.isArray(psets)) {
        for (const pset of psets) {
          if (pset?.guid || pset?.GlobalId || pset?.GUID) {
            return {
              found: true,
              guid: pset.guid || pset.GlobalId || pset.GUID,
              source: 'getPsetDefinitions',
              additionalData: pset
            };
          }
        }
      }

      return { found: false, additionalData: { psets } };
    }
  } catch (err) {
    console.log('⚠️ getPsetDefinitions not available:', (err as Error).message);
  }
  return { found: false };
}

/**
 * Method 2: Try getEntities (newer API)
 * Entities might have GlobalId directly attached
 */
export async function getGUIDFromEntities(
  api: WorkspaceAPI,
  modelId: string,
  objectIds: string[]
): Promise<GUIDSearchResult> {
  try {
    const viewer = api.viewer as any;

    if (typeof viewer.getEntities === 'function') {
      const entities = await viewer.getEntities(modelId, objectIds);
      console.log('📦 Entities:', entities);

      if (entities && Array.isArray(entities)) {
        for (const entity of entities) {
          // Check various GUID field names
          const guidFields = ['guid', 'GUID', 'GlobalId', 'globalId', 'guidIfc', 'ifcGuid'];
          for (const field of guidFields) {
            if (entity[field]) {
              return {
                found: true,
                guid: String(entity[field]),
                source: `getEntities.${field}`,
                additionalData: entity
              };
            }
          }
        }
      }

      return { found: false, additionalData: { entities } };
    }
  } catch (err) {
    console.log('⚠️ getEntities not available:', (err as Error).message);
  }
  return { found: false };
}

/**
 * Method 3: Check model file metadata
 * Model might have additional properties about objects
 */
export async function getGUIDFromModel(
  api: WorkspaceAPI,
  modelId: string
): Promise<GUIDSearchResult> {
  try {
    const viewer = api.viewer;
    const models = await viewer.getModels();
    const model = models.find((m: any) => m.id === modelId);

    if (model) {
      console.log('🏗️ Model info:', model);

      // Check if model has metadata with GUIDs
      const modelData = model as any;
      if (modelData.metadata?.guids || modelData.guidMapping) {
        return {
          found: true,
          source: 'model.metadata',
          additionalData: modelData.metadata || modelData.guidMapping
        };
      }

      return { found: false, additionalData: { model } };
    }
  } catch (err) {
    console.log('⚠️ getModels error:', (err as Error).message);
  }
  return { found: false };
}

/**
 * Method 4: Try to get from object hierarchy
 * Parent objects might have GUID information
 */
export async function getGUIDFromHierarchy(
  api: WorkspaceAPI,
  modelId: string,
  objectId: string
): Promise<GUIDSearchResult> {
  try {
    const viewer = api.viewer as any;
    const result: Record<string, any> = {};

    if (typeof viewer.getHierarchyParents === 'function') {
      const parents = await viewer.getHierarchyParents(modelId, [objectId]);
      console.log('👨‍👩‍👧‍👦 Parents:', parents);
      result.parents = parents;

      // Check parents for GUID
      if (parents && Array.isArray(parents)) {
        for (const parent of parents) {
          if (parent?.guid || parent?.GlobalId || parent?.GUID) {
            return {
              found: true,
              guid: parent.guid || parent.GlobalId || parent.GUID,
              source: 'hierarchy.parent',
              additionalData: parent
            };
          }
        }
      }
    }

    if (typeof viewer.getHierarchyChildren === 'function') {
      const children = await viewer.getHierarchyChildren(modelId, [objectId]);
      console.log('👶 Children:', children);
      result.children = children;
    }

    return { found: false, additionalData: result };
  } catch (err) {
    console.log('⚠️ Hierarchy methods error:', (err as Error).message);
  }
  return { found: false };
}

/**
 * Method 5: Try getObjectTree (some APIs have this)
 */
export async function getGUIDFromObjectTree(
  api: WorkspaceAPI,
  modelId: string,
  objectId: string
): Promise<GUIDSearchResult> {
  try {
    const viewer = api.viewer as any;

    if (typeof viewer.getObjectTree === 'function') {
      const tree = await viewer.getObjectTree(modelId);
      console.log('🌳 Object tree:', tree);

      // Search tree for object with matching ID
      const findInTree = (node: any): any => {
        if (!node) return null;
        if (node.id === objectId || node.objectRuntimeId === objectId) {
          return node;
        }
        if (node.children && Array.isArray(node.children)) {
          for (const child of node.children) {
            const found = findInTree(child);
            if (found) return found;
          }
        }
        return null;
      };

      const foundNode = findInTree(tree);
      if (foundNode?.guid || foundNode?.GlobalId) {
        return {
          found: true,
          guid: foundNode.guid || foundNode.GlobalId,
          source: 'objectTree',
          additionalData: foundNode
        };
      }

      return { found: false, additionalData: { tree } };
    }
  } catch (err) {
    console.log('⚠️ getObjectTree not available:', (err as Error).message);
  }
  return { found: false };
}

/**
 * Method 6: Deep search in getObjectProperties result
 * Thoroughly search all nested properties for GUID-like values
 */
export async function deepSearchPropertiesForGUID(
  api: WorkspaceAPI,
  modelId: string,
  objectId: string
): Promise<GUIDSearchResult> {
  try {
    const viewer = api.viewer as any;
    const props = await viewer.getObjectProperties(modelId, [objectId], { includeHidden: true });

    if (!props || !props[0]) {
      return { found: false };
    }

    const guidsFound: Array<{ path: string; value: string; type: string }> = [];

    // Recursively search for GUID patterns
    const searchForGUID = (obj: any, path: string = '') => {
      if (!obj || typeof obj !== 'object') return;

      Object.entries(obj).forEach(([key, value]) => {
        const currentPath = path ? `${path}.${key}` : key;

        // Check if key suggests it's a GUID
        const isGUIDKey = /guid|globalid|ifcguid/i.test(key);

        if (typeof value === 'string') {
          // Check for IFC GUID pattern (22 chars, base64-like)
          const isIFCGUID = /^[0-9A-Za-z_$]{22}$/.test(value);
          // Check for MS GUID pattern (8-4-4-4-12)
          const isMSGUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);

          if (isGUIDKey || isIFCGUID || isMSGUID) {
            guidsFound.push({
              path: currentPath,
              value: value,
              type: isMSGUID ? 'MS' : (isIFCGUID ? 'IFC' : 'Unknown')
            });
          }
        } else if (typeof value === 'object' && value !== null) {
          searchForGUID(value, currentPath);
        }
      });
    };

    searchForGUID(props[0]);

    if (guidsFound.length > 0) {
      // Prefer IFC GUID, then MS GUID
      const ifcGuid = guidsFound.find(g => g.type === 'IFC');
      const msGuid = guidsFound.find(g => g.type === 'MS');
      const preferred = ifcGuid || msGuid || guidsFound[0];

      return {
        found: true,
        guid: preferred.value,
        source: `deepSearch.${preferred.path}`,
        additionalData: { allGuidsFound: guidsFound, rawProps: props[0] }
      };
    }

    return { found: false, additionalData: { rawProps: props[0] } };
  } catch (err) {
    console.log('⚠️ Deep search error:', (err as Error).message);
  }
  return { found: false };
}

/**
 * Get list of all available viewer API methods
 */
export function getAvailableViewerMethods(api: WorkspaceAPI): string[] {
  const viewer = api.viewer as any;
  return Object.keys(viewer).filter(k => typeof viewer[k] === 'function').sort();
}

/**
 * Comprehensive GUID search using all available methods
 * Tries multiple extraction techniques and returns all found GUIDs
 */
export async function findGUID_AllMethods(api: WorkspaceAPI): Promise<ComprehensiveGUIDResult | null> {
  console.log('🔬 Testing all GUID extraction methods...\n');

  const selection = await api.viewer.getSelection();
  if (!selection || selection.length === 0) {
    console.log('❌ No selection - please select an object first');
    return null;
  }

  const sel = selection[0] as any;
  const modelId = sel.modelId || sel;

  // Get object IDs
  const objects = await api.viewer.getObjects({ selected: true });
  if (!objects || objects.length === 0) {
    console.log('❌ No objects in selection');
    return null;
  }

  const firstModelObjects = (objects[0] as any)?.objects || [];
  if (firstModelObjects.length === 0) {
    console.log('❌ No objects found in first model');
    return null;
  }

  const objectId = String(firstModelObjects[0]?.id || firstModelObjects[0]?.objectRuntimeId);

  console.log(`Testing with modelId: ${modelId}, objectId: ${objectId}\n`);

  const result: ComprehensiveGUIDResult = {
    modelId: String(modelId),
    objectId,
    guidsFound: [],
    apiMethodsAvailable: getAvailableViewerMethods(api),
    rawData: {}
  };

  // Method 1: Standard properties with deep search
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Method 1: getObjectProperties (deep search)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const propsResult = await deepSearchPropertiesForGUID(api, modelId, objectId);
  if (propsResult.found && propsResult.guid) {
    result.guidsFound.push({
      guid: propsResult.guid,
      source: propsResult.source || 'properties',
      type: propsResult.guid.includes('-') ? 'MS' : 'IFC'
    });
    console.log(`✅ Found GUID: ${propsResult.guid} (source: ${propsResult.source})`);
  } else {
    console.log('❌ No GUID found in properties');
  }
  result.rawData.properties = propsResult.additionalData;

  // Method 2: Pset definitions
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Method 2: getPsetDefinitions');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const psetResult = await getGUIDFromPset(api, modelId, objectId);
  if (psetResult.found && psetResult.guid) {
    result.guidsFound.push({
      guid: psetResult.guid,
      source: 'psetDefinitions',
      type: psetResult.guid.includes('-') ? 'MS' : 'IFC'
    });
    console.log(`✅ Found GUID: ${psetResult.guid}`);
  }
  result.rawData.psets = psetResult.additionalData;

  // Method 3: Entities
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Method 3: getEntities');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const entitiesResult = await getGUIDFromEntities(api, modelId, [objectId]);
  if (entitiesResult.found && entitiesResult.guid) {
    result.guidsFound.push({
      guid: entitiesResult.guid,
      source: 'entities',
      type: entitiesResult.guid.includes('-') ? 'MS' : 'IFC'
    });
    console.log(`✅ Found GUID: ${entitiesResult.guid}`);
  }
  result.rawData.entities = entitiesResult.additionalData;

  // Method 4: Model info
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Method 4: Model metadata');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const modelResult = await getGUIDFromModel(api, modelId);
  result.rawData.model = modelResult.additionalData;

  // Method 5: Hierarchy
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Method 5: Hierarchy');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const hierarchyResult = await getGUIDFromHierarchy(api, modelId, objectId);
  if (hierarchyResult.found && hierarchyResult.guid) {
    result.guidsFound.push({
      guid: hierarchyResult.guid,
      source: 'hierarchy',
      type: hierarchyResult.guid.includes('-') ? 'MS' : 'IFC'
    });
    console.log(`✅ Found GUID: ${hierarchyResult.guid}`);
  }
  result.rawData.hierarchy = hierarchyResult.additionalData;

  // Method 6: Object tree
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Method 6: Object Tree');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const treeResult = await getGUIDFromObjectTree(api, modelId, objectId);
  if (treeResult.found && treeResult.guid) {
    result.guidsFound.push({
      guid: treeResult.guid,
      source: 'objectTree',
      type: treeResult.guid.includes('-') ? 'MS' : 'IFC'
    });
    console.log(`✅ Found GUID: ${treeResult.guid}`);
  }
  result.rawData.objectTree = treeResult.additionalData;

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Available API methods');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('API.viewer methods:', result.apiMethodsAvailable);

  console.log('\n✅ GUID search complete');
  console.log(`   Found ${result.guidsFound.length} GUID(s):`);
  result.guidsFound.forEach((g, i) => {
    console.log(`   ${i + 1}. ${g.guid} (${g.type}, source: ${g.source})`);
  });

  return result;
}

/**
 * Quick GUID extraction - tries most likely sources first
 * Returns the first GUID found, prioritizing IFC GUIDs
 */
export async function quickFindGUID(
  api: WorkspaceAPI,
  modelId: string,
  objectId: string
): Promise<string | null> {
  // 1. Try deep search in properties (most common)
  const propsResult = await deepSearchPropertiesForGUID(api, modelId, objectId);
  if (propsResult.found && propsResult.guid) {
    return propsResult.guid;
  }

  // 2. Try entities
  const entitiesResult = await getGUIDFromEntities(api, modelId, [objectId]);
  if (entitiesResult.found && entitiesResult.guid) {
    return entitiesResult.guid;
  }

  // 3. Try hierarchy (parent might have it)
  const hierarchyResult = await getGUIDFromHierarchy(api, modelId, objectId);
  if (hierarchyResult.found && hierarchyResult.guid) {
    return hierarchyResult.guid;
  }

  return null;
}

// Export for window access in browser console
if (typeof window !== 'undefined') {
  (window as any).guidUtils = {
    findGUID_AllMethods,
    quickFindGUID,
    getGUIDFromPset,
    getGUIDFromEntities,
    getGUIDFromModel,
    getGUIDFromHierarchy,
    getGUIDFromObjectTree,
    deepSearchPropertiesForGUID,
    getAvailableViewerMethods
  };
}
