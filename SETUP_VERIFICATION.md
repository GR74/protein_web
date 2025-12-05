# Setup Verification Checklist

Use this guide to verify everything is set up correctly before running the application.

## Quick Verification Script

Run this script to check your setup:

```bash
#!/bin/bash

echo "=== ProteinWeb Setup Verification ==="
echo ""

# Check Python
echo "✓ Checking Python..."
python3 --version || echo "✗ Python not found"

# Check Node.js
echo "✓ Checking Node.js..."
node --version || echo "✗ Node.js not found"

# Check if lib/utils.ts exists
echo "✓ Checking frontend lib/utils.ts..."
if [ -f "protein-weaver/src/lib/utils.ts" ]; then
    echo "  ✓ File exists"
else
    echo "  ✗ MISSING: protein-weaver/src/lib/utils.ts"
    echo "    Create this file (see MAC_TROUBLESHOOTING.md)"
fi

# Check PyMOL
echo "✓ Checking PyMOL..."
if command -v pymol &> /dev/null; then
    echo "  ✓ PyMOL found in PATH"
    pymol -c -Q <<< quit 2>&1 | head -1
elif [ -f "/Applications/PyMOL.app/Contents/MacOS/PyMOL" ]; then
    echo "  ✓ PyMOL found in Applications"
else
    echo "  ⚠ PyMOL not found - visualization may not work"
fi

# Check backend requirements
echo "✓ Checking backend dependencies..."
if [ -f "backend/requirements.txt" ]; then
    echo "  ✓ requirements.txt exists"
else
    echo "  ✗ MISSING: backend/requirements.txt"
fi

# Check frontend node_modules
echo "✓ Checking frontend dependencies..."
if [ -d "protein-weaver/node_modules" ]; then
    echo "  ✓ node_modules exists"
else
    echo "  ⚠ node_modules missing - run 'npm install' in protein-weaver/"
fi

echo ""
echo "=== Verification Complete ==="
```

Save this as `verify_setup.sh`, make it executable, and run:
```bash
chmod +x verify_setup.sh
./verify_setup.sh
```

## Manual Checklist

### 1. File Structure
- [ ] `backend/` folder exists with `main.py` and `pipeline.py`
- [ ] `protein-weaver/` folder exists
- [ ] `protein-weaver/src/lib/utils.ts` exists
- [ ] `protein-weaver/src/components/ui/` folder exists

### 2. Backend Configuration
- [ ] All paths updated in `backend/pipeline.py` (see MAC_SETUP.md)
- [ ] `WORKDIR` set in `backend/main.py`
- [ ] Rosetta paths updated to `.macclangrelease`

### 3. Frontend Configuration
- [ ] `src/lib/utils.ts` created with `cn()` function
- [ ] Dependencies installed: `npm install` in `protein-weaver/`
- [ ] API URL correct in `src/services/api.ts`

### 4. External Dependencies
- [ ] Rosetta installed and accessible
- [ ] PyMOL installed (check with `which pymol` or find in Applications)
- [ ] Python packages installed: `pip install -r requirements.txt`

### 5. Ready to Run
- [ ] Backend can start: `cd backend && uvicorn main:app --reload`
- [ ] Frontend can start: `cd protein-weaver && npm run dev`
- [ ] Browser can connect to frontend (usually `http://localhost:8080`)

## Common Missing Files

If you're missing files, here's what to check:

### Missing `src/lib/utils.ts`
**Symptom**: Import error `Failed to resolve import "@/lib/utils"`

**Fix**: Create `protein-weaver/src/lib/utils.ts`:
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Then install dependencies:
```bash
cd protein-weaver
npm install clsx tailwind-merge
```

### Missing UI Components
**Symptom**: Errors about missing components from `@/components/ui/*`

**Fix**: All UI components should be in `protein-weaver/src/components/ui/`. If missing, they should have been included in the repository. Verify the folder structure matches the repository.

### Missing Node Modules
**Symptom**: Module not found errors

**Fix**:
```bash
cd protein-weaver
rm -rf node_modules package-lock.json
npm install
```

## Test Commands

Run these to test each part:

```bash
# Test Python backend
cd backend
python3 -c "import fastapi; print('FastAPI OK')"

# Test Node.js frontend
cd protein-weaver
npm run build  # This will show any missing files/dependencies

# Test PyMOL
pymol -c -Q <<< quit  # Should exit without error
```

If all tests pass, you're ready to run the application!

