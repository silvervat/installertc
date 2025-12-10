# 🚀 KIIRJUHEND - Assembly Installer

## ✅ Samm 1: Supabase seadistus (5 min)

1. **Loo Supabase projekt:** https://supabase.com → New Project
2. **Kopeeri credentials:**
   - Project Settings → API
   - Kopeeri: `Project URL` ja `anon public key`
3. **Loo tabelid:**
   - SQL Editor → New Query
   - Kopeeri ja käivita `supabase-schema.sql`
   - ✅ Peaksid nägema: 5 tabelit + 1 view

---

## ✅ Samm 2: Lokaalne arendus (5 min)

```bash
# 1. Klooni repo
cd assembly-installer-ready

# 2. Installi
npm install

# 3. Seadista .env
cp .env.local.example .env.local
# Redigeeri .env.local ja lisa oma Supabase credentials

# 4. Käivita
npm run dev
# → Avab http://localhost:5173
```

**NB!** Lokaalses keskkonnas ei ühenda Trimble Connectiga, aga näed UI-d.

---

## ✅ Samm 3: GitHub deployment (10 min)

### 3.1 Vii GitHubi

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/SINU-USERNAME/assembly-installer.git
git push -u origin main
```

### 3.2 Seadista GitHub Pages

1. GitHub repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **gh-pages** / root
4. **Save**

### 3.3 Lisa Secrets

1. **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** (lisa 2 secret'i):
   - `VITE_SUPABASE_URL` = `https://xxxxx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGc...`

### 3.4 Käivita workflow

1. **Actions** tab
2. Peaks automaatselt käivituma, kui mitte siis:
   - **Deploy Assembly Installer to GitHub Pages**
   - **Run workflow**
3. Oota ~2-3 minutit
4. ✅ Extension valmis:
   ```
   https://SINU-USERNAME.github.io/assembly-installer/
   ```

---

## ✅ Samm 4: Trimble Connect lisamine (5 min)

### 4.1 Registreeri extension

1. Ava Trimble Connect Web
2. Vali projekt
3. **Extensions** menüü (vasakul)
4. **Add custom extension**
5. Sisesta URL:
   ```
   https://SINU-USERNAME.github.io/assembly-installer/manifest.json
   ```
6. **Add extension**

**NB!** EI OLE VAJA DEVELOPER CONSOLE'i - lihtsalt lisa URL otse Trimble Connectis!

### 4.2 Aktiveeri extension

1. Extension peaks ilmuma Extensions nimekirja
2. Lülita sisse (Enable)
3. Avab sidebar paremale

---

## ✅ Samm 5: Kasutamine

### 🎯 Automaatne töövoog:

1. **Vali 3D vaates objekte** 
   - Extension tuvastab automaatselt:
     - ✅ Kasutaja nimi (Trimble Connect user)
     - ✅ Projekti ID ja NIMI (kausta nimi)
     - ✅ Mudeli ID ja NIMI (faili nimi)
     - ✅ Objektide properties

2. **Sidebar laeb automaatselt andmed**
   - Ei vaja mingeid API võtmeid!
   - Kõik tuleb Trimble Connect API-st

3. **Täida info:**
   - Installation tab: paigaldajad, kuupäev, meetod
   - Delivery tab: sõiduk, ajad
   - Bolts tab: paigaldaja, kuupäev

4. **Salvesta** → Andmed lähevad Supabase'i
   - Salvestab projekti nime (kausta nimi Trimblis)
   - Salvestab mudeli nime (faili nimi)
   - Värvi objektid 3D vaates

5. **Vaata statistikat** → Statistics tab
6. **Vaata ajalugu** → History tab

---

## 🎉 AUTOMAATNE INFO TUVASTAMINE

Extension loeb automaatselt Trimble Connect API-st:

| Info | Kust tuleb | Kuhu salvestub |
|------|------------|----------------|
| **Kasutaja nimi** | `api.user.getUserDetails()` | `created_by` väli |
| **Projekti ID** | `api.project.getProject().id` | `project_id` |
| **Projekti nimi** | `api.project.getProject().name` | `project_name` ✨ |
| **Mudeli ID** | `api.viewer.getModels()[0].id` | `model_id` |
| **Mudeli nimi** | `api.viewer.getModels()[0].name` | `model_name` ✨ |
| **Objektide info** | `api.viewer.getObjects()` | `assembly_parts` tabel |
| **Objektide properties** | `api.viewer.getObjectProperties()` | Properties veerud |

**EI OLE VAJA SISESTADA MINGEID API VÕTMEID!** 🎊

---

## 📊 Andmebaasi struktuur

```sql
assembly_parts:
  - project_id: "abc-123-def"
  - project_name: "Arlanda Terminal 5"  ← KAUSTA NIMI
  - model_id: "model-456"
  - model_name: "Steel Frame.ifc"        ← FAILI NIMI
  - object_id: "obj-789"
  - mark: "BM-1"
  - assembly: "ASM-001"
  - ... (muud properties)
```

---

## 🔧 Troubleshooting

### Extension ei laadi Trimble Connectis

- ✅ Kontrolli URL-i: `https://USERNAME.github.io/assembly-installer/manifest.json`
- ✅ URL peab algama `https://`, mitte `http://`
- ✅ Kontrolli, et GitHub Pages on enabled
- ✅ Ava browser console (F12) → vaata erroreid

### "Missing Supabase environment variables"

- ✅ GitHub Secrets on õigesti seadistatud?
- ✅ Workflow käivitus uuesti pärast secrets lisamist?
- ✅ URL algab `https://` ja key algab `eyJ...`?

### Andmed ei salvestu

- ✅ Supabase RLS policies on õigesti?
   - Mine SQL Editor
   - Käivita: `SELECT * FROM pg_policies;`
   - Peaksid nägema policiesi kõigil tabelitel
- ✅ Browser console (F12) → Network tab → vaata päringuid
- ✅ Supabase Table Editor → vaata kas read salvestuvad

### Objektid ei värvi 3D vaates

- ✅ manifest.json permissions: `viewer.write` ✓
- ✅ Browser console erroreid?
- ✅ Proovimine manually: `api.viewer.setObjectColors(...)`

### Projekti/mudeli nime ei ole

- ✅ Vaata Supabase tabelis `project_name` ja `model_name` veerge
- ✅ Kui tühjad, siis Trimble Connect ei andnud neid
- ✅ Kontrolli console logist: `Project:` ja `Model:` read

---

## 💡 Tähtis info

### EI OLE VAJA:

❌ Trimble Connect API võtmeid  
❌ Developer Console registreerimist  
❌ Access token'eid  
❌ Project ID sisestamist  
❌ Model ID sisestamist  

### AUTOMAATNE:

✅ Trimble Connect ühendus (Workspace API)  
✅ Kasutaja autentimine  
✅ Projekti info (ID + NIMI)  
✅ Mudeli info (ID + NIMI)  
✅ Objektide info ja properties  
✅ 3D värvimine  

---

## 📝 Failide struktuur

```
assembly-installer-ready/
├── src/
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client
│   │   └── api.ts            # CRUD funktsioonid
│   ├── components/
│   │   └── Sidebar.tsx       # Peamine UI
│   └── App.tsx               # Trimble Connect integration
├── manifest.json             # Extension config
├── supabase-schema.sql       # Database (project_name + model_name!)
└── .env.local.example        # Environment variables
```

---

## 🎯 Näide Supabase andmetest

```sql
SELECT 
  project_name,           -- "Arlanda Terminal 5"
  model_name,             -- "Steel Frame Phase 1.ifc"
  mark,                   -- "BM-1"
  COUNT(*) as count
FROM assembly_parts
GROUP BY project_name, model_name, mark
ORDER BY project_name, model_name, mark;
```

---

## ❓ Abi

Kui midagi ei tööta:

1. **Browser console** (F12 → Console) - vaata erroreid
2. **Network tab** (F12 → Network) - vaata API päringuid
3. **Supabase logs** (Dashboard → Logs)
4. **GitHub Actions logs** (GitHub → Actions → workflow run)

---

✅ **Valmis!** Assembly Installer töötab nüüd ilma mingi käsitsi sisestamata Trimble Connect andmeteta!

Kõik projekti ja mudeli info tuleb automaatselt Trimble Connect Workspace API-st! 🎊
