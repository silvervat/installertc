# 📦 GITHUB DEPLOYMENT JUHEND

## 🚀 1. VALMISTAMINE (2 min)

### Download ja unzip

1. Laadi alla `assembly-installer-github.zip`
2. Unzip kausta oma arvutis
3. Ava terminal/command prompt selles kaustas

---

## 🔧 2. SUPABASE SEADISTUS (5 min)

### Loo projekt

1. Mine: https://supabase.com
2. **New Project**
3. Anna nimi (nt. "assembly-installer")
4. Vali parool
5. Vali regioon (Europe näiteks)
6. **Create project**

### Kopeeri credentials

1. Mine: **Settings** → **API**
2. Kopeeri:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (pikk token)

### Loo andmebaas

1. Mine: **SQL Editor**
2. **New query**
3. Ava fail `supabase-schema.sql` (tekstiredaktoris)
4. Kopeeri KOGU sisu
5. Kleebi Supabase SQL Editorisse
6. **Run**
7. ✅ Peaksid nägema: "Success. No rows returned"
8. Mine **Table Editor** → vaata, et on 5 tabelit

---

## 📂 3. GITHUB SEADISTUS (10 min)

### Loo repo

**Variant A: Terminal**

```bash
# Selles kaustas (kus package.json on):

# 1. Init git
git init

# 2. Lisa kõik failid
git add .

# 3. Commit
git commit -m "Initial commit: Assembly Installer"

# 4. Loo GitHub repo
# Mine github.com → New repository
# Nimi: assembly-installer
# Public
# ÄRA lisa README, .gitignore, license (meil on juba!)

# 5. Lisa remote
git remote add origin https://github.com/SINU-USERNAME/assembly-installer.git

# 6. Push
git branch -M main
git push -u origin main
```

**Variant B: GitHub Desktop**

1. Ava GitHub Desktop
2. **File** → **Add local repository**
3. Vali see kaust
4. **Publish repository**
5. Nimi: `assembly-installer`
6. Public
7. Publish

### Seadista Secrets

1. Mine GitHub reposse
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret**
4. Lisa 2 secret'i:

**Secret 1:**
- Name: `VITE_SUPABASE_URL`
- Value: `https://xxxxx.supabase.co` (sinu Supabase URL)

**Secret 2:**
- Name: `VITE_SUPABASE_ANON_KEY`
- Value: `eyJhbGc...` (sinu anon public key)

5. **Add secret** mõlema jaoks

### Seadista GitHub Pages

1. **Settings** → **Pages**
2. **Source**: Deploy from a branch
3. **Branch**: `gh-pages` / `root`
4. **Save**

---

## ⚙️ 4. DEPLOYMENT (3 min)

### Käivita workflow

**Automaatne viis:**
- Workflow peaks kohe käivituma pärast push'i

**Manuaalne viis:**
1. Mine **Actions** tab
2. Vali **Deploy Assembly Installer to GitHub Pages**
3. **Run workflow** → **Run workflow**

### Oota build'i

1. Workflow käivitub (~2-3 minutit)
2. Näed progress'i Actions tab'is
3. Roheline ✅ = success
4. Punane ❌ = viga (vaata logs)

### Kontrolli deployment

1. **Settings** → **Pages**
2. Peaksid nägema:
   ```
   Your site is live at https://SINU-USERNAME.github.io/assembly-installer/
   ```
3. Kliki linkile → peaks avanema "Ühendatakse..." screen

---

## 🔗 5. TRIMBLE CONNECT LISAMINE (5 min)

### Lisa extension

1. Ava **Trimble Connect Web**: https://web.connect.trimble.com
2. Vali projekt
3. **Extensions** menüü (vasakul)
4. **Add custom extension**
5. Sisesta URL:
   ```
   https://SINU-USERNAME.github.io/assembly-installer/manifest.json
   ```
6. **Add extension**

### Aktiveeri

1. Extension peaks ilmuma nimekirja
2. Lülita sisse (toggle)
3. Extension avaneb paremale sidebar'is
4. ✅ Peaks ühenduma ja näitama "Ühendatud..."

---

## ✅ 6. TEST (2 min)

### Kontrolli ühendust

1. Vali 3D vaates mõned objektid
2. Extension peaks laadima need automaatselt
3. Peaks näitama:
   - Projekti nime
   - Mudeli nime
   - Valitud objektide listi

### Test salvestamist

1. Mine **Installation** tab'i
2. Täida:
   - Paigaldajad: "Test"
   - Kuupäev: täna
   - Meetod: "Kraana"
3. **Salvesta**
4. ✅ Peaks näitama success message
5. Mine Supabase → Table Editor → `assembly_parts`
6. Peaks nägema salvestatud ridu

---

## 🎉 VALMIS!

Extension töötab nüüd aadressil:
```
https://SINU-USERNAME.github.io/assembly-installer/
```

Trimble Connectis:
```
Extensions → Assembly Installer → Enabled ✅
```

---

## 🔄 UPDATES

Kui soovid koodis muudatusi teha:

```bash
# 1. Muuda faile
# 2. Commit
git add .
git commit -m "Update: kirjeldus"

# 3. Push
git push origin main

# → GitHub Actions käivitub automaatselt
# → Extension uueneb ~3 min pärast
```

---

## 🐛 TROUBLESHOOTING

### Workflow ebaõnnestub

**Viga: "Missing Supabase environment variables"**
- Kontrolli GitHub Secrets
- Nimed peavad olema täpselt: `VITE_SUPABASE_URL` ja `VITE_SUPABASE_ANON_KEY`
- Käivita workflow uuesti

**Viga: "Build failed"**
- Vaata Actions → workflow run → logs
- Tavaline põhjus: npm install error
- Proovi locally: `npm install && npm run build`

### GitHub Pages ei tööta

- Kontrolli Settings → Pages on enabled
- Kontrolli branch: `gh-pages` on olemas
- Oota 5-10 minutit (DNS propagation)
- Ava incognito window'is

### Extension ei laadi Trimble Connectis

- Kontrolli URL: peab algama `https://`
- Kontrolli manifest.json on available: `https://[username].github.io/assembly-installer/manifest.json`
- Browser console (F12) erroreid
- Proovi eemaldada ja lisada extension uuesti

### Andmed ei salvesta

- Supabase connection:
  - Kontrolli Table Editor'is kas tabelid on loodud
  - Käivita uuesti `supabase-schema.sql`
- RLS policies:
  - SQL Editor: `SELECT * FROM pg_policies;`
  - Peaks olema policies kõigil tabelitel
- Browser console:
  - F12 → Console → vaata erroreid
  - Network tab → vaata Supabase päringuid

---

## 📝 CHECKLIST

- [ ] Supabase projekt loodud
- [ ] SQL schema käivitatud (5 tabelit)
- [ ] GitHub repo loodud
- [ ] 2 Secrets lisatud (URL + KEY)
- [ ] GitHub Pages enabled (gh-pages branch)
- [ ] Workflow käivitatud (roheline ✅)
- [ ] Extension URL töötab (ava browseris)
- [ ] Trimble Connectis lisatud (manifest.json URL)
- [ ] Extension enabled
- [ ] Test: objektide valimine
- [ ] Test: salvestamine
- [ ] Supabase'is on andmeid

---

## 🎯 LÕPPTULEMUS

✅ Extension: `https://[user].github.io/assembly-installer/`  
✅ Trimble Connect: Extensions → Assembly Installer  
✅ Supabase: 5 tabelit + andmed  
✅ GitHub: Auto-deployment  

**Kõik töötab! 🎊**
