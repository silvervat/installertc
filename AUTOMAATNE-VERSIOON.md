# 🎊 ASSEMBLY INSTALLER - TÄIESTI AUTOMAATNE VERSIOON

## ⚡ PEAMINE MUUDATUS

**EI OLE VAJA SISESTADA MINGEID TRIMBLE CONNECT API ANDMEID!**

Kõik info tuleb automaatselt Trimble Connect Workspace API-st:
- ✅ Kasutaja nimi
- ✅ Projekti ID + **PROJEKTI NIMI** (kausta nimi)
- ✅ Mudeli ID + **MUDELI NIMI** (faili nimi)
- ✅ Objektide info ja properties

---

## 🚀 KUIDAS TÖÖTAB

### 1. Extension ühendub Trimble Connectiga

```typescript
const api = await WorkspaceAPI.connect(window.parent, ...);
// ✅ Automaatne ühendus, ei vaja API võtmeid!
```

### 2. Loeb kasutaja info

```typescript
const user = await api.user.getUserDetails();
// userName = "Silver Vatsel" (automaatselt!)
```

### 3. Loeb projekti info

```typescript
const project = await api.project.getProject();
// projectId = "abc-123"
// projectName = "Arlanda Terminal 5" ← KAUSTA NIMI TRIMBLIS
```

### 4. Loeb mudeli info

```typescript
const models = await api.viewer.getModels();
// modelId = "model-456"
// modelName = "Steel Frame.ifc" ← FAILI NIMI
```

### 5. Loeb objektide info

```typescript
const objects = await api.viewer.getObjects({ selected: true });
const props = await api.viewer.getObjectProperties([...]);
// Kõik properties automaatselt!
```

### 6. Salvestab Supabase'i

```typescript
await AssemblyAPI.syncParts(
  projectId,
  projectName,    // ← SALVESTAB PROJEKTI NIME!
  modelId,
  modelName,      // ← SALVESTAB MUDELI NIME!
  properties
);
```

---

## 📊 ANDMEBAAS

### assembly_parts tabel

```sql
CREATE TABLE assembly_parts (
  id UUID PRIMARY KEY,
  project_id TEXT,
  project_name TEXT,      -- ← PROJEKTI NIMI (kausta nimi)
  model_id TEXT,
  model_name TEXT,        -- ← MUDELI NIMI (faili nimi)
  object_id TEXT,
  mark TEXT,
  assembly TEXT,
  name TEXT,
  ...
);
```

### Näide andmetest

| project_name | model_name | mark | assembly |
|-------------|------------|------|----------|
| Arlanda Terminal 5 | Steel Frame Phase 1.ifc | BM-1 | ASM-001 |
| Arlanda Terminal 5 | Steel Frame Phase 1.ifc | COL-2 | ASM-001 |
| Nordec Factory | Main Structure.ifc | BM-10 | ASM-002 |

---

## 🎯 TRIMBLE CONNECT LISAMINE

**LIHTNE VIIS - EI VAJA DEVELOPER CONSOLE'i:**

1. Ava Trimble Connect Web
2. Vali projekt
3. **Extensions** menüü (vasakul)
4. **Add custom extension**
5. Sisesta URL:
   ```
   https://[username].github.io/assembly-installer/manifest.json
   ```
6. **Add extension**
7. ✅ Valmis!

---

## 📦 MANIFEST.JSON

Täpselt nagu Assembly Exporteris:

```json
{
  "manifestVersion": 2,
  "id": "assembly-installer",
  "version": "1.0.0",
  "productName": "Assembly Installer",
  "supportedPlatforms": ["web"],
  "extensions": [{
    "type": "panel",
    "name": "Assembly Installer",
    "main": "index.html",
    "permissions": [
      "viewer.read",
      "viewer.write",
      "project.read",
      "model.read",
      "user.read"
    ]
  }]
}
```

---

## ✨ VÕTMEOMADUSED

### Trimble Connect API annab automaatselt:

| Info | API meetod | Kasutus |
|------|------------|---------|
| Kasutaja | `api.user.getUserDetails()` | Logide jaoks |
| Projekt ID | `api.project.getProject().id` | Unique identifier |
| **Projekt NIMI** | `api.project.getProject().name` | **Kausta nimi!** |
| Mudel ID | `api.viewer.getModels()[0].id` | Unique identifier |
| **Mudel NIMI** | `api.viewer.getModels()[0].name` | **Faili nimi!** |
| Selection | `viewer.selectionChanged` event | Auto-trigger |
| Properties | `api.viewer.getObjectProperties()` | Kõik atribuudid |
| Colorize | `api.viewer.setObjectColors()` | 3D värvimine |

### Ei vaja:

❌ Access token'eid  
❌ API key'sid  
❌ Developer Console registreerimist  
❌ Käsitsi ID sisestamist  
❌ Projekti/mudeli valimist UI's  

---

## 🔄 TÖÖVOOG

```
1. Extension laeb Trimble Connectis
   ↓
2. WorkspaceAPI.connect(window.parent)
   ↓
3. Auto-tuvastab:
   - Kasutaja: "Silver Vatsel"
   - Projekt: "Arlanda Terminal 5"
   - Mudel: "Steel Frame.ifc"
   ↓
4. Kasutaja valib objekte 3D vaates
   ↓
5. viewer.selectionChanged event
   ↓
6. Loeb objektide properties
   ↓
7. Salvestab Supabase'i:
   - project_name ✅
   - model_name ✅
   - Kõik properties ✅
   ↓
8. Kasutaja täidab paigaldus/tarne/polditud info
   ↓
9. Salvesta → Supabase UPDATE
   ↓
10. Värvi objektid 3D vaates
```

---

## 📄 FAILIDE NIMEKIRI

**Muudetud failid:**

1. **src/App.tsx** - Loeb automaatselt projekti ja mudeli nimed
2. **src/lib/api.ts** - syncParts() võtab project_name ja model_name
3. **src/lib/supabase.ts** - DbAssemblyPart type'is on project_name ja model_name
4. **supabase-schema.sql** - assembly_parts tabelis on project_name ja model_name veerud

**Uued dokumendid:**

- QUICKSTART-UPDATED.md - Uuendatud juhend
- AUTOMAATNE-VERSIOON.md - See dokument

---

## 🎊 KOKKUVÕTE

### Enne:

```typescript
// Kasutaja pidi sisestama:
const projectId = "???";  // Kust leida?
const modelId = "???";    // Mis see on?
```

### Nüüd:

```typescript
// API annab kõik automaatselt:
const project = await api.project.getProject();
// projectId = "abc-123"
// projectName = "Arlanda Terminal 5" ✅

const models = await api.viewer.getModels();
// modelId = "model-456"  
// modelName = "Steel Frame.ifc" ✅
```

---

## ✅ TULEMUSED SUPABASE'is

```sql
SELECT 
  project_name,           -- "Arlanda Terminal 5"
  model_name,             -- "Steel Frame Phase 1.ifc"
  COUNT(*) as parts,
  COUNT(CASE WHEN installations.id IS NOT NULL THEN 1 END) as installed
FROM assembly_parts
LEFT JOIN installations ON assembly_parts.id = installations.part_id
GROUP BY project_name, model_name;
```

---

**Täpselt nagu Assembly Exporter töötab! 🎉**

Ei mingeid API võtmeid, ei mingeid käsitsi sisestusi - lihtsalt lisa URL ja extension töötab!
