# Quick Fix Guide for Mac User

## Two Issues Fixed

### ✅ Issue 1: Missing `src/lib/utils.ts` File

**Problem**: Frontend shows error: `Failed to resolve import "@/lib/utils"`

**Quick Fix**:
1. Create the missing file:
   ```bash
   cd protein-weaver/src
   mkdir -p lib
   ```

2. Create `lib/utils.ts` with this content:
   ```typescript
   import { clsx, type ClassValue } from "clsx";
   import { twMerge } from "tailwind-merge";

   export function cn(...inputs: ClassValue[]) {
     return twMerge(clsx(inputs));
   }
   ```

3. Install missing dependencies:
   ```bash
   cd protein-weaver
   npm install clsx tailwind-merge
   ```

4. Restart the dev server:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

**Done!** The import error should be fixed.

---

### ✅ Issue 2: PyMOL Visualization Not Working

**Problem**: PyMOL doesn't launch when clicking visualize button

**What Changed**: 
The code now automatically detects Mac and tries multiple PyMOL locations:
1. `pymol` (if in PATH)
2. `/Applications/PyMOL.app/Contents/MacOS/PyMOL`
3. `/Applications/PyMOLX11Hybrid.app/Contents/MacOS/PyMOL`

**No changes needed** - it should work automatically!

**If it still doesn't work**:
1. Find your PyMOL location:
   ```bash
   which pymol
   # OR
   ls /Applications/PyMOL*.app/Contents/MacOS/PyMOL
   ```

2. Test PyMOL works:
   ```bash
   pymol -c -Q <<< quit
   ```

3. If needed, update `backend/pipeline.py` around line 270 with your PyMOL path.

---

## One-Time Setup

After pulling the latest code, run:

```bash
# 1. Create missing lib/utils.ts (if not already done)
mkdir -p protein-weaver/src/lib
cat > protein-weaver/src/lib/utils.ts << 'EOF'
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
EOF

# 2. Install frontend dependencies
cd protein-weaver
npm install

# 3. Verify setup
cd ..
ls -la protein-weaver/src/lib/utils.ts  # Should show the file
```

---

## Verification

After fixes, verify:

```bash
# Check lib/utils.ts exists
ls -la protein-weaver/src/lib/utils.ts

# Check PyMOL (on Mac)
which pymol || ls /Applications/PyMOL*.app

# Start servers
# Terminal 1:
cd backend
uvicorn main:app --reload --port 5001

# Terminal 2:
cd protein-weaver
npm run dev
```

---

## Summary

1. **Missing file**: Create `protein-weaver/src/lib/utils.ts` (content provided above)
2. **PyMOL**: Code now auto-detects Mac - should work automatically
3. **Dependencies**: Run `npm install` in `protein-weaver/` folder

Everything else should work! See `MAC_TROUBLESHOOTING.md` for more details.

