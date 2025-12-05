# ProteinWeb - Rosetta Docking Pipeline

A web-based interface for protein-protein docking using Rosetta, featuring structure input, preprocessing, docking, and visualization capabilities.

> **📱 Mac Users**: 
> - See [MAC_SETUP.md](MAC_SETUP.md) for detailed Mac-specific setup instructions.
> - Having issues? Check [MAC_QUICK_FIX.md](MAC_QUICK_FIX.md) for common fixes.
> - More troubleshooting? See [MAC_TROUBLESHOOTING.md](MAC_TROUBLESHOOTING.md).

## Overview

ProteinWeb provides a streamlined workflow for protein-protein docking:

1. **Structure Input**: Fetch from PDB, upload local files, or predict structures from sequences
2. **Preprocessing**: Clean, normalize chains, sanitize residues, and merge complexes
3. **Docking**: Run Rosetta docking with real-time progress tracking
4. **Results**: View all docking models in a sortable table with detailed metrics
5. **Visualization**: Launch PyMOL to visualize the best docking model

## Architecture

- **Backend**: FastAPI (Python) - handles Rosetta docking pipeline
- **Frontend**: React + TypeScript + Vite - modern web interface
- **Dependencies**: Rosetta, PyMOL, ColabFold (to be migrated to AlphaFold3)

## Prerequisites

### Required Software

1. **Rosetta** (RosettaScripts)
   - Download from: https://www.rosettacommons.org/software/license-and-download
   - Version: Rosetta 3.13+ (tested with release-371)

2. **PyMOL**
   - Download from: https://pymol.org/2/
   - Required for visualization

3. **Python 3.8+**
   - Required packages: `fastapi`, `uvicorn`, `requests`, `numpy`, `biopython`

4. **Node.js 18+** (for frontend)
   - Install from: https://nodejs.org/

5. **ColabFold** (currently) or **AlphaFold3** (planned)
   - For structure prediction from sequences

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd proteinweb
```

### 2. Backend Setup

```bash
cd backend

# Install Python dependencies
pip install fastapi uvicorn requests numpy biopython

# Or use a virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt  # Create this file if needed
```

### 3. Frontend Setup

```bash
cd protein-weaver

# Install Node.js dependencies
npm install
```

## Configuration

### Platform-Specific Path Configuration

You **must** update the following paths in the codebase to match your system:

#### Linux

**File: `backend/pipeline.py`** (lines 38-51)

```python
# Path to Rosetta clean_pdb.py
ROSETTA_CLEAN_PDB = (
    "/path/to/rosetta/main/tools/protein_tools/scripts/clean_pdb.py"
)

# Path to Rosetta scripts executable
ROSETTA_SCRIPTS = (
    "/path/to/rosetta/main/source/bin/rosetta_scripts.linuxgccrelease"
)

# Source paths for docking config files
DOCKING_XML_SRC = Path("/path/to/your/docking_full.xml")
DOCKING_OPTIONS_SRC = Path("/path/to/your/docking.options.txt")

# Working directory
DEFAULT_WORKDIR = Path(os.environ.get("PROTEINWEB_WORKDIR", "/path/to/your/workdir"))
```

**File: `backend/pipeline.py`** (line 314)

```python
# Path to conda (if using ColabFold)
CONDA_PATH = "/path/to/anaconda3"  # or "/path/to/miniconda3"
```

**File: `backend/main.py`** (line 31)

```python
WORKDIR = Path("/path/to/your/workdir")
```

**File: `backend/main.py`** (line 151)

```python
ROSETTA_BIN = "/path/to/rosetta/main/source/bin/rosetta_scripts.linuxgccrelease"
```

#### macOS

**File: `backend/pipeline.py`** (line 45)

```python
# macOS executable name
ROSETTA_SCRIPTS = (
    "/path/to/rosetta/main/source/bin/rosetta_scripts.macclangrelease"
)
```

**File: `backend/main.py`** (line 151)

```python
ROSETTA_BIN = "/path/to/rosetta/main/source/bin/rosetta_scripts.macclangrelease"
```

**Note**: PyMOL on macOS may require:
```python
# In pipeline.py, line 271
subprocess.run(["pymol", "-c", str(pml_path)], check=False)  # -c for command-line mode
```

#### Windows

**File: `backend/pipeline.py`** (line 45)

```python
# Windows executable name
ROSETTA_SCRIPTS = (
    "C:\\path\\to\\rosetta\\main\\source\\bin\\rosetta_scripts.default.windowsgccrelease.exe"
)
```

**File: `backend/main.py`** (line 151)

```python
ROSETTA_BIN = "C:\\path\\to\\rosetta\\main\\source\\bin\\rosetta_scripts.default.windowsgccrelease.exe"
```

**Note**: Windows path separators:
- Use double backslashes: `C:\\path\\to\\file`
- Or raw strings: `r"C:\path\to\file"`
- Or forward slashes: `C:/path/to/file` (Python handles this)

**PyMOL on Windows**:
```python
# In pipeline.py, line 271
subprocess.run(["pymol.exe", "-c", str(pml_path)], check=False)
```

### Docking Configuration Files

You need to provide your own Rosetta docking XML and options files:

1. **`docking_full.xml`**: RosettaScripts protocol for docking
   - Should include: low-res docking, high-res docking, minimization
   - Update path in `backend/pipeline.py` line 50

2. **`docking.options.txt`**: Rosetta command-line options
   - Should include: `-partners A_B`, `-dock_pert`, scoring weights, etc.
   - Update path in `backend/pipeline.py` line 51

### Frontend API Configuration

**File: `protein-weaver/src/services/api.ts`** (line 1)

```typescript
const BASE = "http://localhost:5001";  // Change if backend runs on different port
```

## Running the Application

### 1. Start the Backend Server

```bash
cd backend
uvicorn main:app --reload --port 5001
```

The backend will be available at `http://localhost:5001`

### 2. Start the Frontend Development Server

```bash
cd protein-weaver
npm run dev
```

The frontend will be available at `http://localhost:5173` (or the port Vite assigns)

### 3. Access the Application

Open your browser and navigate to the frontend URL (typically `http://localhost:5173`)

## Usage Workflow

1. **Input Structures**
   - **Receptor**: Fetch from PDB, upload PDB file, or predict from sequence
   - **Binder**: Same options as receptor

2. **Preprocessing**
   - **Clean**: Run Rosetta's `clean_pdb.py` on both structures
   - **Normalize**: Ensure unique chain IDs (A for receptor, B for binder)
   - **Sanitize**: Renumber residues sequentially
   - **Merge**: Combine structures with specified surface gap (default: 2.0 Å)

3. **Docking**
   - Configure `nstruct` (number of structures to generate)
   - Run docking with real-time progress tracking
   - View all results in sortable table

4. **Results & Visualization**
   - Review best score and all models
   - Launch PyMOL to visualize the best model

## Project Structure

```
proteinweb/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── pipeline.py          # Rosetta docking pipeline functions
│   └── requirements.txt     # Python dependencies (create if needed)
├── protein-weaver/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API client
│   │   └── types/           # TypeScript types
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Notes & Known Issues

### ⚠️ Important Notes

1. **ColabFold → AlphaFold3 Migration**
   - **Current**: Uses ColabFold via conda environment (`colabfold`)
   - **Planned**: Migrate to native AlphaFold3 installation
   - **Location**: `backend/pipeline.py`, function `run_colabfold()` (line 305)
   - **Action Required**: Replace ColabFold command with AlphaFold3 API/CLI

2. **Progress Bar Configuration**
   - **Status**: Progress bar is displayed but not fully configured
   - **Current**: Shows percentage based on structure count
   - **Location**: `backend/main.py`, `/dock-stream` endpoint (line 156)
   - **Action Required**: Improve progress parsing from Rosetta log output for more accurate progress tracking

3. **Complex Merging Logic**
   - **Status**: Basic merging implemented, needs refinement
   - **Current**: Uses surface gap (2.0 Å) to position binder relative to receptor
   - **Location**: `backend/pipeline.py`, function `combine_in_python()` (line 467)
   - **Issues**: 
     - May not always produce optimal initial poses
     - Direction selection (forward/backward) could be improved
   - **Action Required**: 
     - Implement better alignment algorithms
     - Add options for different merging strategies
     - Consider using Rosetta's `docking_setup` mover for initial positioning

### Platform-Specific Considerations

#### Linux
- Rosetta executables: `*.linuxgccrelease`
- PyMOL: Usually available as `pymol` in PATH
- Paths: Use forward slashes or raw strings

#### macOS
- Rosetta executables: `*.macclangrelease`
- PyMOL: May need full path or `pymol -c` for command-line mode
- Paths: Use forward slashes

#### Windows
- Rosetta executables: `*.windowsgccrelease.exe` or `*.default.windowsgccrelease.exe`
- PyMOL: Usually `pymol.exe` or full path required
- Paths: Use double backslashes or raw strings
- Line endings: Ensure `.fasc` files use Unix line endings (LF) if parsing fails

## Troubleshooting

### Backend Issues

**Rosetta not found:**
- Verify `ROSETTA_SCRIPTS` path is correct
- Check executable permissions: `chmod +x /path/to/rosetta_scripts.*`
- On Windows, ensure `.exe` extension is included

**PyMOL not launching:**
- Verify PyMOL is in PATH: `which pymol` (Linux/Mac) or `where pymol` (Windows)
- Try full path: `/usr/bin/pymol` or `C:\Program Files\PyMOL\pymol.exe`
- Check if command-line mode is needed: `pymol -c script.pml`

**Docking fails:**
- Check Rosetta license is valid
- Verify docking XML and options files exist and are readable
- Check log file: `{workdir}/{project}/docking_full.log`

### Frontend Issues

**API connection errors:**
- Verify backend is running on port 5001
- Check CORS settings in `backend/main.py`
- Update `BASE` URL in `protein-weaver/src/services/api.ts` if needed

**Build errors:**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)

## Development

### Adding New Features

1. **Backend**: Add new endpoints in `backend/main.py`
2. **Pipeline**: Add functions in `backend/pipeline.py`
3. **Frontend**: Add components in `protein-weaver/src/components/`
4. **Types**: Update `protein-weaver/src/types/docking.ts`

### Testing

```bash
# Backend
cd backend
python -m pytest  # If tests are added

# Frontend
cd protein-weaver
npm run lint
```

## License

[Add your license information here]

## Contributing

[Add contribution guidelines if applicable]

## Contact

[Add contact information if needed]

