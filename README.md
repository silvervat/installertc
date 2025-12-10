# 🏗️ Assembly Installer - Trimble Connect Extension

Paigalduse, tarne ja polditud staatuse jälgimise rakendus Trimble Connect Web keskkonnas....

**✨ Täiesti automaatne - ei vaja API võtmeid!** Kõik projekti ja mudeli info tuleb Trimble Connect Workspace API-st.

---

## 🚀 Quick Start

### 1️⃣ Supabase (5 min)

```bash
1. supabase.com → New Project
2. Kopeeri URL + anon key
3. SQL Editor → käivita supabase-schema.sql
```

### 2️⃣ GitHub Setup (5 min)

```bash
# 1. Clone/fork this repo
git clone https://github.com/yourusername/assembly-installer.git

# 2. Add Supabase secrets
GitHub → Settings → Secrets and variables → Actions
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

# 3. Enable GitHub Pages
Settings → Pages → Source: "Deploy from a branch" → gh-pages
```

### 3️⃣ Deploy (1 push)

```bash
git push origin main
# → GitHub Actions käivitub
# → Extension valmis: https://[username].github.io/assembly-installer/
```

### 4️⃣ Lisa Trimble Connecti

```
1. Ava Trimble Connect Web
2. Vali projekt
3. Extensions → Add custom extension
4. URL: https://[username].github.io/assembly-installer/manifest.json
5. Enable extension
✅ Valmis!
```

---

## 💡 Peamised funktsioonid

- ✅ **Automaatne tuvastamine**: Projekti nimi, mudeli nimi, kasutaja
- 🚚 **Tarne jälgimine**: Sõiduk, kuupäev, ajad
- 🔩 **Paigaldus**: Paigaldajad, meetod, kuupäev
- 🔧 **Polditud staatus**: Paigaldaja, kuupäev
- 🎨 **3D värvimine**: Automaatne objektide värvimine
- 📊 **Statistika**: Reaalajas progressi jälgimine
- 📝 **Ajalugu**: Täielik audit trail
- 💾 **Supabase**: Püsiv andmebaas

---

## 🏗️ Arhitektuur

```
Trimble Connect Web
  ↓ (Workspace API - automaatne)
Assembly Installer (React)
  ↓ (salvestamine)
Supabase PostgreSQL
  ↓ (värvimine)
3D Viewer
```

---

## 📊 Andmebaas

5 põhitabelit:

1. **assembly_parts** - Objektide info (+ project_name, model_name)
2. **installations** - Paigaldusandmed
3. **deliveries** - Tarneandmed
4. **boltings** - Polditud staatus
5. **part_logs** - Audit trail

---

## 🔐 Turvalisus

- ✅ Row Level Security (RLS) kõigil tabelitel
- ✅ Supabase anon key (public access)
- ✅ Trimble Connect autentimine
- ✅ Kasutaja tracking (`created_by`)

---

## 🎯 Automaatne info

Extension loeb Trimble Connect API-st:

| Info | API | Salvestub |
|------|-----|-----------|
| Kasutaja | `api.user.getUserDetails()` | `created_by` |
| Projekt ID | `api.project.getProject().id` | `project_id` |
| **Projekt NIMI** | `api.project.getProject().name` | `project_name` ✨ |
| Mudel ID | `api.viewer.getModels()[0].id` | `model_id` |
| **Mudel NIMI** | `api.viewer.getModels()[0].name` | `model_name` ✨ |
| Properties | `api.viewer.getObjectProperties()` | Kõik veerud |

**Ei vaja mingeid API võtmeid sisestada!**

---

## 📚 Dokumentatsioon

- **QUICKSTART.md** - Samm-sammult juhend (25 min)
- **AUTOMAATNE-VERSIOON.md** - Tehnilised detailid
- **supabase-schema.sql** - Andmebaasi struktuur

---

## 🛠️ Development

```bash
# Install
npm install

# Setup environment
cp .env.local.example .env.local
# Lisa oma Supabase credentials

# Run locally
npm run dev

# Build
npm run build

# Preview
npm run preview
```

---

## 📦 Deployment

Automaatne GitHub Actions workflow:

1. Push `main` branchi
2. Workflow käivitub (`.github/workflows/deploy.yml`)
3. Build production versiooni
4. Deploy GitHub Pages'i (`gh-pages` branch)
5. Extension available: `https://[user].github.io/assembly-installer/`

---

## 🔧 Trimble Connect Setup

**Lihtne viis (EI VAJA Developer Console):**

1. Extensions menüü Trimble Connectis
2. Add custom extension
3. URL: `https://[username].github.io/assembly-installer/manifest.json`
4. Enable
5. ✅ Töötab!

---

## 📝 Kasutamine

1. **Vali objekte 3D vaates**
   - Extension laeb automaatselt info
   - Näitab projekti ja mudeli nime
   
2. **Täida andmed**
   - Installation: paigaldajad, meetod, kuupäev
   - Delivery: sõiduk, ajad
   - Bolts: paigaldaja, kuupäev

3. **Salvesta**
   - Värvimine 3D vaates
   - Andmed Supabase'i
   - Log entry luuakse

4. **Vaata statistikat**
   - History tab
   - Statistics tab

---

## 🌟 Eripära

### Vs. Assembly Exporter:

| Omadus | Exporter | Installer |
|--------|----------|-----------|
| Objektide lugemine | ✅ | ✅ |
| Export (Excel/CSV) | ✅ | ❌ |
| Paigalduse tracking | ❌ | ✅ |
| Tarne tracking | ❌ | ✅ |
| Polditud tracking | ❌ | ✅ |
| Andmebaas | ❌ | ✅ Supabase |
| History | ❌ | ✅ Audit log |

---

## 🐛 Troubleshooting

### Extension ei laadi

- Kontrolli GitHub Pages on enabled
- URL peab algama `https://`
- Kontrolli manifest.json on available
- Browser console (F12) erroreid

### Andmed ei salvesta

- Supabase RLS policies on õigesti?
- GitHub Secrets on seadistatud?
- Network tab (F12) - vaata päringuid
- Supabase logs (dashboard)

### Värvimine ei tööta

- manifest.json: `viewer.write` permission ✓
- Browser console erroreid?
- Trimble Connect API available?

---

## 📄 License

MIT License

---

## 👤 Author

**Silver Vatsel**
- Email: info@silvervat.ee
- GitHub: [@silvervat](https://github.com/silvervat)

---

## 🎉 Kokkuvõte

✅ Täiesti automaatne projekti/mudeli tuvastamine  
✅ Ei vaja API võtmeid  
✅ Lihtne lisamine Trimble Connecti  
✅ GitHub Pages deployment  
✅ Supabase andmebaas  
✅ Production-ready  

**Alusta: QUICKSTART.md** 🚀
