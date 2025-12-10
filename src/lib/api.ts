import { supabase, type DbPartWithRelations } from './supabase';

export class AssemblyAPI {
  /**
   * Sync parts from Trimble Connect to Supabase
   * Creates or updates parts based on object properties
   * Includes GUID, Tekla data, metadata (FileName, Type, Project)
   */
  static async syncParts(
    projectId: string,
    projectName: string,
    modelId: string,
    modelName: string,
    parts: Array<{
      objectId: string;
      guid: string;
      properties: Record<string, any>;
    }>
  ): Promise<void> {
    if (!parts || parts.length === 0) return;

    const partsToUpsert = parts.map(p => {
      const props = p.properties;

      // Extract all Tekla Assembly fields into a JSONB object
      const teklaData: Record<string, any> = {
        position_code: props['Tekla_Assembly.Cast_unit_position_code'] || null,
        rebar_weight: this.parseNumber(props['Tekla_Assembly.Cast_unit_rebar_weight']),
        bottom_elevation: this.parseNumber(props['Tekla_Assembly.Cast_unit_bottom_elevation']),
        top_elevation: this.parseNumber(props['Tekla_Assembly.Cast_unit_top_elevation']),
        cast_unit_type: props['Tekla_Assembly.Cast_unit_type'] || null
      };

      // Only include tekla_data if at least one field has value
      const hasTeklaData = Object.values(teklaData).some(v => v !== null);

      return {
        // PRIMARY KEY - use GUID for uniqueness
        guid: p.guid,
        project_id: projectId,

        // METADATA (from model/project)
        project_name: props.Project || projectName,
        model_id: props.ModelId || modelId,
        model_name: props.FileName || modelName,
        file_name: props.FileName || modelName,
        object_id: p.objectId,

        // BASIC PROPERTIES - check Tekla fields first
        mark: props['Tekla_Assembly.Cast_unit_Mark']
          || props.Mark
          || props.Name
          || 'N/A',

        name: props.Name
          || props['Tekla_Assembly.Cast_unit_Mark']
          || null,

        type: props.Type
          || props['Tekla_Assembly.Cast_unit_type']
          || 'Unknown',

        assembly: props['Tekla_Assembly.Assembly']
          || props.Assembly
          || props['Assembly Code']
          || null,

        weight: this.parseNumber(
          props['Tekla_Assembly.Cast_unit_weight']
          || props.Weight
        ),

        phase: props.Phase || props['Assembly Phase'] || null,
        profile: props.Profile || props.Section || null,
        material: props.Material || props.Grade || null,
        length: this.parseNumber(props.Length),

        // TEKLA-SPECIFIC DATA (only if present)
        tekla_data: hasTeklaData ? teklaData : null,

        updated_at: new Date().toISOString()
      };
    });

    console.log('📊 Sample part to sync:', {
      guid: partsToUpsert[0]?.guid,
      project: partsToUpsert[0]?.project_name,
      fileName: partsToUpsert[0]?.file_name,
      modelId: partsToUpsert[0]?.model_id,
      mark: partsToUpsert[0]?.mark,
      type: partsToUpsert[0]?.type,
      teklaData: partsToUpsert[0]?.tekla_data
    });

    const { error } = await supabase
      .from('assembly_parts')
      .upsert(partsToUpsert, {
        onConflict: 'guid'
      });

    if (error) {
      console.error('Error syncing parts:', error);
      throw new Error(`Failed to sync parts: ${error.message}`);
    }

    console.log(`✅ Synced ${parts.length} parts with full metadata (Project: ${projectName}, Model: ${modelName})`);
  }

  /**
   * Get parts by GUIDs (for loading after sync)
   */
  static async getPartsByGuids(
    projectId: string,
    guids: string[]
  ): Promise<DbPartWithRelations[]> {
    if (!guids || guids.length === 0) return [];

    const { data, error } = await supabase
      .from('assembly_parts')
      .select(`
        *,
        installation:installations(*),
        delivery:deliveries(*),
        bolting:boltings(*),
        logs:part_logs(*)
      `)
      .eq('project_id', projectId)
      .in('guid', guids)
      .order('mark', { ascending: true });

    if (error) {
      console.error('Error fetching parts by GUIDs:', error);
      throw new Error(`Failed to fetch parts: ${error.message}`);
    }

    return (data || []) as DbPartWithRelations[];
  }

  /**
   * Get parts with their installation/delivery/bolting data
   */
  static async getParts(
    projectId: string,
    modelId: string,
    objectIds: string[]
  ): Promise<DbPartWithRelations[]> {
    if (!objectIds || objectIds.length === 0) return [];

    const { data, error } = await supabase
      .from('assembly_parts')
      .select(`
        *,
        installation:installations(*),
        delivery:deliveries(*),
        bolting:boltings(*),
        logs:part_logs(*)
      `)
      .eq('project_id', projectId)
      .eq('model_id', modelId)
      .in('object_id', objectIds)
      .order('mark', { ascending: true });

    if (error) {
      console.error('Error fetching parts:', error);
      throw new Error(`Failed to fetch parts: ${error.message}`);
    }

    return (data || []) as DbPartWithRelations[];
  }

  /**
   * Save installation data for multiple parts
   */
  static async saveInstallation(
    partIds: string[],
    data: {
      installers: string[];
      date: string;
      method: string;
    },
    userName: string
  ): Promise<void> {
    if (!partIds || partIds.length === 0) {
      throw new Error('No parts selected');
    }

    // Validate data
    if (!data.installers || data.installers.length === 0) {
      throw new Error('At least one installer is required');
    }
    if (!data.date) {
      throw new Error('Installation date is required');
    }
    if (!data.method) {
      throw new Error('Installation method is required');
    }

    // Insert installations
    const installations = partIds.map(partId => ({
      part_id: partId,
      installers: data.installers,
      date: data.date,
      method: data.method,
      created_by: userName
    }));

    const { error: instError } = await supabase
      .from('installations')
      .upsert(installations, { onConflict: 'part_id' });

    if (instError) {
      console.error('Error saving installations:', instError);
      throw new Error(`Failed to save installations: ${instError.message}`);
    }

    // Create logs
    const logs = partIds.map(partId => ({
      part_id: partId,
      action: `Paigaldatud: ${data.method} (${data.installers.join(', ')})`,
      user_name: userName
    }));

    const { error: logError } = await supabase
      .from('part_logs')
      .insert(logs);

    if (logError) {
      console.error('Error creating logs:', logError);
      // Don't throw here, logs are not critical
    }

    console.log(`✅ Saved installation for ${partIds.length} parts`);
  }

  /**
   * Save delivery data for multiple parts
   */
  static async saveDelivery(
    partIds: string[],
    data: {
      vehicle: string;
      date: string;
      arrivalTime?: string;
      unloadingTime?: string;
    },
    userName: string
  ): Promise<void> {
    if (!partIds || partIds.length === 0) {
      throw new Error('No parts selected');
    }

    if (!data.vehicle) {
      throw new Error('Vehicle is required');
    }
    if (!data.date) {
      throw new Error('Delivery date is required');
    }

    const deliveries = partIds.map(partId => ({
      part_id: partId,
      vehicle: data.vehicle,
      date: data.date,
      arrival_time: data.arrivalTime || null,
      unloading_time: data.unloadingTime || null,
      created_by: userName
    }));

    const { error: delError } = await supabase
      .from('deliveries')
      .upsert(deliveries, { onConflict: 'part_id' });

    if (delError) {
      console.error('Error saving deliveries:', delError);
      throw new Error(`Failed to save deliveries: ${delError.message}`);
    }

    const logs = partIds.map(partId => ({
      part_id: partId,
      action: `Tarnitud: ${data.vehicle}`,
      user_name: userName
    }));

    const { error: logError } = await supabase
      .from('part_logs')
      .insert(logs);

    if (logError) {
      console.error('Error creating logs:', logError);
    }

    console.log(`✅ Saved delivery for ${partIds.length} parts`);
  }

  /**
   * Save bolting data for multiple parts
   */
  static async saveBolting(
    partIds: string[],
    data: {
      installer: string;
      date: string;
    },
    userName: string
  ): Promise<void> {
    if (!partIds || partIds.length === 0) {
      throw new Error('No parts selected');
    }

    if (!data.installer) {
      throw new Error('Installer is required');
    }
    if (!data.date) {
      throw new Error('Bolting date is required');
    }

    const boltings = partIds.map(partId => ({
      part_id: partId,
      installer: data.installer,
      date: data.date,
      created_by: userName
    }));

    const { error: boltError } = await supabase
      .from('boltings')
      .upsert(boltings, { onConflict: 'part_id' });

    if (boltError) {
      console.error('Error saving boltings:', boltError);
      throw new Error(`Failed to save boltings: ${boltError.message}`);
    }

    const logs = partIds.map(partId => ({
      part_id: partId,
      action: `Poldid pingutatud (${data.installer})`,
      user_name: userName
    }));

    const { error: logError } = await supabase
      .from('part_logs')
      .insert(logs);

    if (logError) {
      console.error('Error creating logs:', logError);
    }

    console.log(`✅ Saved bolting for ${partIds.length} parts`);
  }

  /**
   * Bulk update existing records
   */
  static async bulkUpdate(
    partIds: string[],
    mode: 'installation' | 'delivery' | 'bolts',
    data: any,
    userName: string
  ): Promise<void> {
    if (!partIds || partIds.length === 0) {
      throw new Error('No parts selected');
    }

    switch (mode) {
      case 'installation':
        await this.saveInstallation(partIds, data, userName);
        break;
      case 'delivery':
        await this.saveDelivery(partIds, data, userName);
        break;
      case 'bolts':
        await this.saveBolting(partIds, data, userName);
        break;
    }
  }

  /**
   * Delete data from parts
   */
  static async deleteData(
    partIds: string[],
    mode: 'installation' | 'delivery' | 'bolts',
    userName: string
  ): Promise<void> {
    if (!partIds || partIds.length === 0) {
      throw new Error('No parts selected');
    }

    let table: string;
    let action: string;

    switch (mode) {
      case 'installation':
        table = 'installations';
        action = 'Eemaldati paigaldusest';
        break;
      case 'delivery':
        table = 'deliveries';
        action = 'Eemaldati tarnest';
        break;
      case 'bolts':
        table = 'boltings';
        action = 'Eemaldati poltide nimekirjast';
        break;
      default:
        throw new Error('Invalid mode');
    }

    const { error: delError } = await supabase
      .from(table)
      .delete()
      .in('part_id', partIds);

    if (delError) {
      console.error(`Error deleting ${mode}:`, delError);
      throw new Error(`Failed to delete ${mode}: ${delError.message}`);
    }

    const logs = partIds.map(partId => ({
      part_id: partId,
      action,
      user_name: userName
    }));

    const { error: logError } = await supabase
      .from('part_logs')
      .insert(logs);

    if (logError) {
      console.error('Error creating logs:', logError);
    }

    console.log(`✅ Deleted ${mode} for ${partIds.length} parts`);
  }

  /**
   * Get statistics for a project
   */
  static async getStatistics(
    projectId: string,
    modelId: string
  ): Promise<{
    total: number;
    installed: number;
    delivered: number;
    bolted: number;
  }> {
    const { count: total } = await supabase
      .from('assembly_parts')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('model_id', modelId);

    const { count: installed } = await supabase
      .from('installations')
      .select('*, assembly_parts!inner(*)', { count: 'exact', head: true })
      .eq('assembly_parts.project_id', projectId)
      .eq('assembly_parts.model_id', modelId);

    const { count: delivered } = await supabase
      .from('deliveries')
      .select('*, assembly_parts!inner(*)', { count: 'exact', head: true })
      .eq('assembly_parts.project_id', projectId)
      .eq('assembly_parts.model_id', modelId);

    const { count: bolted } = await supabase
      .from('boltings')
      .select('*, assembly_parts!inner(*)', { count: 'exact', head: true })
      .eq('assembly_parts.project_id', projectId)
      .eq('assembly_parts.model_id', modelId);

    return {
      total: total || 0,
      installed: installed || 0,
      delivered: delivered || 0,
      bolted: bolted || 0
    };
  }

  // Helper function to parse numbers
  private static parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }
}
