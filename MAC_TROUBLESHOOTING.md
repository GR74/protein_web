# Mac Troubleshooting Guide

## Issue 1: Frontend Import Error - `@/lib/utils` Not Found

### Error Message
```
Failed to resolve import "@/lib/utils" from "src/components/ui/toast.tsx". Does the file exist?
```

### Cause
The `src/lib/utils.ts` file might be missing from the Mac copy, or the path alias isn't resolving correctly.

### Solution

**Step 1: Verify the file exists**
```bash
cd protein-weaver/src
ls -la lib/utils.ts
```

If the file doesn't exist, create it:

```bash
mkdir -p src/lib
```

**Step 2: Create `src/lib/utils.ts`**
Create the file with this content:

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 3: Verify dependencies**
Make sure you have the required packages:

```bash
cd protein-weaver
npm install clsx tailwind-merge
```

**Step 4: Restart the dev server**
```bash
# Stop the current server (Ctrl+C)
npm run dev
```

### Quick Fix Script
If you want to create the file automatically:

```bash
cd protein-weaver/src
mkdir -p lib
cat > lib/utils.ts << 'EOF'
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
EOF
```

Then restart the dev server.

---

## Issue 2: PyMOL Visualization Not Working

### Problem
PyMOL doesn't launch when clicking the visualization button.

### Solution

The code has been updated to automatically detect Mac and use the correct PyMOL command. However, you may need to configure the PyMOL path.

### Step 1: Find Your PyMOL Installation

Run these commands to find PyMOL:

```bash
# Check if pymol is in PATH
which pymol

# Check common Mac locations
ls -la /Applications/PyMOL*.app/Contents/MacOS/PyMOL
ls -la /Applications/PyMOLX11Hybrid.app/Contents/MacOS/PyMOL

# If installed via Homebrew
brew list pymol
```

### Step 2: Test PyMOL Command

Try running PyMOL manually:

```bash
# Option 1: If in PATH
pymol -c

# Option 2: If in Applications folder
/Applications/PyMOL.app/Contents/MacOS/PyMOL -c

# Option 3: Alternative bundle
/Applications/PyMOLX11Hybrid.app/Contents/MacOS/PyMOL -c
```

The `-c` flag runs PyMOL in command-line mode.

### Step 3: Update pipeline.py (if needed)

The code now automatically tries multiple PyMOL paths. If none work, you can manually set it:

**File: `backend/pipeline.py`**

Find the `visualize_best_model` function (around line 212) and update the PyMOL command section:

```python
if system == "Darwin":  # macOS
    # Replace with your actual PyMOL path
    pymol_path = "/Applications/PyMOL.app/Contents/MacOS/PyMOL"  # UPDATE THIS
    subprocess.run([pymol_path, "-c", str(pml_path)], check=False)
```

### Step 4: Verify PyMOL Works

After updating, test the visualization:
1. Complete a docking run
2. Click "Visualize" button
3. PyMOL should launch automatically

---

## Complete File Structure Check

Verify you have all required files:

```bash
cd protein-weaver
find src -type f -name "*.ts" -o -name "*.tsx" | head -20
```

**Critical files that must exist:**
- ✅ `src/lib/utils.ts` - Utility functions
- ✅ `src/components/ui/*` - All UI components
- ✅ `src/pages/DockingPage.tsx` - Main docking page
- ✅ `src/pages/Dashboard.tsx` - Dashboard page

---

## Full Setup Checklist for Mac

- [ ] **Backend paths updated** (see MAC_SETUP.md)
  - [ ] Rosetta paths
  - [ ] Work directory
  - [ ] Docking config paths
  
- [ ] **Frontend setup complete**
  - [ ] `npm install` completed
  - [ ] `src/lib/utils.ts` exists
  - [ ] All dependencies installed

- [ ] **PyMOL configured**
  - [ ] PyMOL installed
  - [ ] PyMOL path verified
  - [ ] Tested manually: `pymol -c`

- [ ] **Dev servers running**
  - [ ] Backend: `uvicorn main:app --reload --port 5001`
  - [ ] Frontend: `npm run dev`

---

## Common Errors and Fixes

### Error: "Cannot find module 'clsx'"
```bash
cd protein-weaver
npm install clsx tailwind-merge
```

### Error: "Cannot resolve '@/lib/utils'"
1. Verify `src/lib/utils.ts` exists
2. Check `vite.config.ts` has the alias configured
3. Restart the dev server

### Error: "PyMOL: command not found"
- Install PyMOL: `brew install pymol` or download from pymol.org
- Or update the path in `pipeline.py` to the full application path

### Error: Port already in use
```bash
# Find process using port 8080
lsof -i :8080

# Kill it
kill -9 <PID>

# Or use a different port
npm run dev -- --port 8081
```

---

## Still Having Issues?

1. **Check the terminal output** - Look for specific error messages
2. **Verify file paths** - Use `ls -la` to check files exist
3. **Check file permissions** - Make sure files are readable
4. **Restart everything** - Stop all servers and restart fresh

If problems persist, share:
- The exact error message
- Output of `npm run dev`
- Output of `uvicorn main:app --reload`
- Your Mac OS version: `sw_vers`

