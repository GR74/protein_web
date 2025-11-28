# Mac Setup Guide for ProteinWeb Lab Suite

This guide will help you set up ProteinWeb on macOS if you already have Rosetta installed.

## Prerequisites Check

Before starting, verify you have:
- ✅ **Rosetta** installed and working
- ✅ **Python 3.8+** (check with `python3 --version`)
- ✅ **Node.js 18+** (check with `node --version`)
- ✅ **PyMOL** installed (check with `which pymol` or `pymol --version`)
- ✅ **ColabFold** or **AlphaFold3** (for structure prediction)

## Step 1: Get the Code

### Option A: Git Clone (Recommended)
```bash
git clone <repository-url>
cd proteinweb
```

### Option B: Download ZIP
1. Download the project as a ZIP file
2. Extract it to your desired location
3. Open Terminal and navigate to the folder:
   ```bash
   cd ~/Downloads/proteinweb  # or wherever you extracted it
   ```

## Step 2: Backend Setup

```bash
cd backend

# Create a virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Step 3: Configure Mac-Specific Paths

You need to update the following files with your Mac paths:

### File 1: `backend/pipeline.py`

**Line 38-41** - Update Rosetta clean_pdb.py path:
```python
ROSETTA_CLEAN_PDB = (
    "/Users/YOUR_USERNAME/path/to/rosetta/main/"
    "tools/protein_tools/scripts/clean_pdb.py"
)
```

**Line 44-47** - Update Rosetta scripts executable (IMPORTANT: Use `.macclangrelease`):
```python
ROSETTA_SCRIPTS = (
    "/Users/YOUR_USERNAME/path/to/rosetta/main/"
    "source/bin/rosetta_scripts.macclangrelease"  # Note: .macclangrelease for Mac
)
```

**Line 50-51** - Update docking config file paths:
```python
DOCKING_XML_SRC = Path("/Users/YOUR_USERNAME/path/to/docking_full.xml")
DOCKING_OPTIONS_SRC = Path("/Users/YOUR_USERNAME/path/to/docking.options.txt")
```

**Line 54** - Update default work directory:
```python
DEFAULT_WORKDIR = Path(os.environ.get("PROTEINWEB_WORKDIR", "/Users/YOUR_USERNAME/proteinweb_work"))
```

**Line 314** - Update conda path (if using ColabFold):
```python
CONDA_PATH = "/Users/YOUR_USERNAME/anaconda3"  # or "/Users/YOUR_USERNAME/miniconda3"
```

### File 2: `backend/main.py`

**Line 31** - Update work directory:
```python
WORKDIR = Path("/Users/YOUR_USERNAME/proteinweb_work")  # CHANGE THIS
```

**Line 151** - Update Rosetta binary path:
```python
ROSETTA_BIN = "/Users/YOUR_USERNAME/path/to/rosetta/main/source/bin/rosetta_scripts.macclangrelease"
```

**Line 174-175** - Update docking config paths:
```python
DOCKING_XML_SRC = Path("/Users/YOUR_USERNAME/path/to/docking_full.xml")
DOCKING_OPTIONS_SRC = Path("/Users/YOUR_USERNAME/path/to/docking.options.txt")
```

### File 3: `backend/pipeline.py` (PyMOL command)

**Line 271** - Update PyMOL command for Mac:
```python
# For Mac, you may need the full path or just 'pymol'
subprocess.run(["pymol", "-c", str(pml_path)], check=False)  # -c for command-line mode

# OR if pymol is not in PATH:
subprocess.run(["/Applications/PyMOL.app/Contents/MacOS/PyMOL", "-c", str(pml_path)], check=False)
```

## Step 4: Find Your Rosetta Paths

Run these commands in Terminal to find your Rosetta installation:

```bash
# Find Rosetta installation
find ~ -name "rosetta_scripts.macclangrelease" 2>/dev/null

# Find clean_pdb.py
find ~ -name "clean_pdb.py" -path "*/rosetta/*" 2>/dev/null

# Check PyMOL location
which pymol
# OR
ls -la /Applications/PyMOL*.app/Contents/MacOS/PyMOL
```

## Step 5: Frontend Setup

```bash
cd ../protein-weaver

# Install dependencies
npm install
```

## Step 6: Update Frontend API URL (if needed)

**File: `protein-weaver/src/services/api.ts`**

**Line 1** - Update if backend runs on different port:
```typescript
const BASE = "http://localhost:5001";  // Change if needed
```

## Step 7: Run the Application

### Terminal 1: Start Backend
```bash
cd backend
source venv/bin/activate  # If using virtual environment
uvicorn main:app --reload --port 5001
```

### Terminal 2: Start Frontend
```bash
cd protein-weaver
npm run dev
```

### Open in Browser
Navigate to: `http://localhost:5173` (or the port Vite shows)

## Mac-Specific Notes

### Rosetta Executable Names
- **Linux**: `rosetta_scripts.linuxgccrelease`
- **macOS**: `rosetta_scripts.macclangrelease` ← Use this on Mac
- **Windows**: `rosetta_scripts.default.windowsgccrelease.exe`

### PyMOL on Mac
- If PyMOL is installed via `.dmg`, it's usually at:
  `/Applications/PyMOL.app/Contents/MacOS/PyMOL`
- If installed via Homebrew: `brew install pymol` (usually in PATH)
- Command-line mode: Use `-c` flag for headless operation

### Path Format
- Mac uses forward slashes: `/Users/username/path/to/file`
- No need for escaping like Windows

### Permissions
If you get permission errors:
```bash
# Make Rosetta executable executable
chmod +x /path/to/rosetta_scripts.macclangrelease

# Make clean_pdb.py executable
chmod +x /path/to/clean_pdb.py
```

## Troubleshooting

### "Command not found: rosetta_scripts"
- Check the path is correct
- Verify the executable name is `.macclangrelease` (not `.linuxgccrelease`)
- Make sure the file exists: `ls -la /path/to/rosetta_scripts.macclangrelease`

### "Command not found: pymol"
- Add PyMOL to PATH or use full path
- Check installation: `which pymol` or `ls /Applications/PyMOL*.app`

### "Permission denied"
- Make files executable: `chmod +x /path/to/file`
- Check file ownership: `ls -la /path/to/file`

### Port already in use
- Change port in backend: `uvicorn main:app --reload --port 5002`
- Update frontend API URL accordingly

## Quick Configuration Checklist

- [ ] Updated `ROSETTA_SCRIPTS` path in `backend/pipeline.py` (line 44-47)
- [ ] Updated `ROSETTA_CLEAN_PDB` path in `backend/pipeline.py` (line 38-41)
- [ ] Updated `ROSETTA_BIN` path in `backend/main.py` (line 151)
- [ ] Updated `WORKDIR` in `backend/main.py` (line 31)
- [ ] Updated `DOCKING_XML_SRC` and `DOCKING_OPTIONS_SRC` paths
- [ ] Updated `CONDA_PATH` if using ColabFold (line 314)
- [ ] Verified PyMOL command works
- [ ] Tested Rosetta executable: `/path/to/rosetta_scripts.macclangrelease --help`

## Testing the Setup

1. **Test Rosetta**:
   ```bash
   /path/to/rosetta_scripts.macclangrelease --help
   ```

2. **Test PyMOL**:
   ```bash
   pymol -c
   # OR
   /Applications/PyMOL.app/Contents/MacOS/PyMOL -c
   ```

3. **Test Backend**:
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn main:app --reload --port 5001
   # Should see: "Uvicorn running on http://127.0.0.1:5001"
   ```

4. **Test Frontend**:
   ```bash
   cd protein-weaver
   npm run dev
   # Should open in browser automatically
   ```

## Need Help?

If you encounter issues:
1. Check all paths are correct (use `ls -la` to verify files exist)
2. Verify Rosetta executable name is `.macclangrelease`
3. Check Python and Node.js versions meet requirements
4. Review error messages in terminal for specific issues

