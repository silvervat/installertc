# 🔧 GitHub Actions Troubleshooting

## ❌ Levinud vead ja lahendused

---

### 1. "Dependencies lock file is not found"

**Viga:**
```
Dependencies lock file is not found in /home/runner/work/...
Supported file patterns: package-lock.json,npm-shrinkwrap.json,yarn.lock
```

**Põhjus:** 
`package-lock.json` fail puudub repositooriumis.

**Lahendus A - Kui faili pole ZIP'is:**

```bash
# 1. Genereeri package-lock.json
npm install

# 2. Lisa ja commit
git add package-lock.json
git commit -m "Add package-lock.json"
git push
```

**Lahendus B - Kui see juhtub uuesti:**

Workflow on juba parandatud ja kasutab fallback'i:
```yaml
- name: Install dependencies
  run: |
    if [ -f package-lock.json ]; then
      npm ci
    else
      npm install
    fi
```

---

### 2. "Missing Supabase environment variables"

**Viga:**
```
Error: Missing Supabase environment variables. Check your .env.local file.
```

**Põhjus:**
GitHub Secrets pole seadistatud või on valede nimedega.

**Lahendus:**

1. Mine: **Settings** → **Secrets and variables** → **Actions**
2. Kontrolli, et on olemas:
   - `VITE_SUPABASE_URL` (TÄPSELT see nimi!)
   - `VITE_SUPABASE_ANON_KEY` (TÄPSELT see nimi!)
3. Väärtused peavad olema:
   - URL: `https://xxxxx.supabase.co`
   - KEY: `eyJhbGc...` (pikk token)
4. Käivita workflow uuesti (Actions → Re-run jobs)

---

### 3. "npm ERR! code ELIFECYCLE"

**Viga:**
```
npm ERR! code ELIFECYCLE
npm ERR! errno 1
npm ERR! assembly-installer@1.0.0 build: `vite build`
```

**Põhjus:**
TypeScript või build errorid.

**Lahendus:**

```bash
# 1. Proovi locally
npm install
npm run build

# 2. Vaata erroreid
# Kui TypeScript errorid, siis:
npm run typecheck

# 3. Paranda errorid ja push
git add .
git commit -m "Fix build errors"
git push
```

---

### 4. "Failed to deploy to GitHub Pages"

**Viga:**
```
Error: Action failed with "The process '/usr/bin/git' failed with exit code 1"
```

**Põhjus:**
GitHub Pages pole enabled või branch puudub.

**Lahendus:**

1. **Settings** → **Pages**
2. Kontrolli:
   - Source: "Deploy from a branch"
   - Branch: `gh-pages` / root
3. Kui `gh-pages` branch'i pole:
   - Workflow loob selle automaatselt esimesel korral
   - Oota 1-2 minutit
   - Refresh lehte
4. **Save** Settings → Pages

---

### 5. "Repository not found" või "Permission denied"

**Viga:**
```
remote: Repository not found.
fatal: repository 'https://github.com/...' not found
```

**Põhjus:**
Git remote vale või puuduvad õigused.

**Lahendus:**

```bash
# 1. Kontrolli remote
git remote -v

# 2. Kui vale, siis muuda:
git remote set-url origin https://github.com/SINU-USERNAME/assembly-installer.git

# 3. Kui vajab autentimist:
git config --global credential.helper store
git push
# Sisesta GitHub username ja personal access token
```

---

### 6. "manifest.json not found"

**Viga:**
```
cp: cannot stat 'manifest.json': No such file or directory
```

**Põhjus:**
`manifest.json` fail puudub projektis.

**Lahendus:**

```bash
# Kontrolli, kas fail on olemas
ls -la manifest.json

# Kui puudub, siis kopeeri ZIP'ist uuesti või loo:
# (manifest.json sisu on ZIP'is)

git add manifest.json
git commit -m "Add manifest.json"
git push
```

---

### 7. Workflow ei käivitu

**Põhjus:**
Actions on disabled või workflow fail on vales kohas.

**Lahendus:**

1. **Settings** → **Actions** → **General**
2. Kontrolli: "Allow all actions and reusable workflows" on valitud
3. Kontrolli faili asukoht:
   ```
   .github/workflows/deploy.yml
   ```
4. Peab olema täpselt selles kaustas!

---

### 8. Build õnnestub, aga lehekülg ei laadi

**Põhjus:**
GitHub Pages URL vale või DNS propagation.

**Lahendus:**

1. Oota 5-10 minutit (DNS propagation)
2. Kontrolli URL:
   ```
   https://SINU-USERNAME.github.io/assembly-installer/
   ```
3. Ava incognito window'is (clear cache)
4. Kontrolli browser console (F12):
   - Kas on erroreid?
   - Kas failid laadivad?

---

### 9. Extension ei laadi Trimble Connectis

**Viga:**
Extension lisatud, aga sidebar tühi või error.

**Lahendus:**

1. Kontrolli manifest URL:
   ```
   https://SINU-USERNAME.github.io/assembly-installer/manifest.json
   ```
2. Ava see URL browseris - peaks näitama JSON'i
3. Kui 404:
   - Kontrolli GitHub Pages on enabled
   - Kontrolli deployment on successful
   - Oota mõni minut
4. Trimble Connectis:
   - Eemalda extension
   - Lisa uuesti
   - Refresh lehte

---

### 10. "GitHub token permissions"

**Viga:**
```
Error: The process '/usr/bin/git' failed with exit code 128
```

**Põhjus:**
Workflow'il pole õigusi gh-pages branchi luua.

**Lahendus:**

1. **Settings** → **Actions** → **General**
2. **Workflow permissions**
3. Vali: "Read and write permissions"
4. **Save**
5. Käivita workflow uuesti

---

## 🔍 Debug sammud

### 1. Vaata workflow logi

1. Mine **Actions** tab
2. Kliki failed workflow'le
3. Kliki job'ile "build-and-deploy"
4. Vaata iga stepi outputi
5. Punasega märgitud step on probleem

### 2. Kontrolli locally

```bash
# 1. Proovi buildi locally
npm install
npm run build

# 2. Kontrolli dist/ kausta
ls -la dist/

# 3. Peaks olema:
#    - index.html
#    - assets/
#    - manifest.json
```

### 3. Kontrolli faile

```bash
# Vajalikud failid:
- package.json ✓
- package-lock.json ✓
- manifest.json ✓
- .github/workflows/deploy.yml ✓
- src/App.tsx ✓
- vite.config.ts ✓
```

---

## 📋 Checklist enne push'i

- [ ] `package-lock.json` on olemas
- [ ] `manifest.json` on olemas
- [ ] `.github/workflows/deploy.yml` on olemas
- [ ] GitHub Secrets on seadistatud
- [ ] GitHub Pages on enabled
- [ ] Locally build töötab: `npm run build`
- [ ] TypeScript erroreid pole: `npm run typecheck`

---

## 🆘 Kui miski ei tööta

1. **Delete ja start fresh:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. **Kontrolli Supabase:**
   - supabase.com - projekt töötab?
   - SQL tables on loodud?
   - Credentials on õiged?

3. **Re-deploy:**
   ```bash
   git add .
   git commit -m "Fix: troubleshooting"
   git push --force origin main
   ```

4. **Workflow manuaalselt:**
   - Actions → Deploy Assembly Installer
   - Run workflow → Run workflow

---

## ✅ Kui kõik töötab

Peaksid nägema:

1. **Actions tab:** Roheline ✅
2. **GitHub Pages:** `https://[user].github.io/assembly-installer/`
3. **Browser:** "Ühendatakse Trimble Connectiga..."
4. **Trimble Connect:** Extension loaded sidebar'is

---

## 📞 Veel abi

Vaata:
- GitHub Actions logs (Actions tab)
- Browser console (F12)
- Supabase logs (Dashboard → Logs)
- INSTALL.md (deployment juhend)
