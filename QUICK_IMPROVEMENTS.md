# Quick Improvements - Start Here!

These are the **3 most impactful improvements** you can implement in ~2 hours.

## 🎯 Priority 1: Environment Variables (30 min)

### Why?
- Makes sharing code between you and your student easier
- No more hardcoded paths
- Easy to configure per environment

### Steps:

1. **Install python-dotenv**:
   ```bash
   cd backend
   pip install python-dotenv
   ```

2. **Create `backend/.env.example`**:
   ```env
   ROSETTA_CLEAN_PDB=/path/to/rosetta/main/tools/protein_tools/scripts/clean_pdb.py
   ROSETTA_BIN=/path/to/rosetta/main/source/bin/rosetta_scripts.linuxgccrelease
   DOCKING_XML_SRC=/path/to/docking_full.xml
   DOCKING_OPTIONS_SRC=/path/to/docking.options.txt
   PROTEINWEB_WORKDIR=/path/to/workdir
   CONDA_PATH=/path/to/anaconda3
   BACKEND_PORT=5001
   ```

3. **Create `backend/config.py`**:
   ```python
   import os
   from pathlib import Path
   from dotenv import load_dotenv

   load_dotenv()

   # All config in one place
   ROSETTA_CLEAN_PDB = Path(os.getenv("ROSETTA_CLEAN_PDB", ""))
   ROSETTA_BIN = Path(os.getenv("ROSETTA_BIN", ""))
   DOCKING_XML_SRC = Path(os.getenv("DOCKING_XML_SRC", ""))
   DOCKING_OPTIONS_SRC = Path(os.getenv("DOCKING_OPTIONS_SRC", ""))
   WORKDIR = Path(os.getenv("PROTEINWEB_WORKDIR", "./workdir"))
   CONDA_PATH = Path(os.getenv("CONDA_PATH", ""))
   BACKEND_PORT = int(os.getenv("BACKEND_PORT", 5001))
   ```

4. **Update `backend/pipeline.py`**:
   ```python
   from config import ROSETTA_CLEAN_PDB, ROSETTA_BIN, DOCKING_XML_SRC, ...
   ```

5. **Update `backend/main.py`**:
   ```python
   from config import WORKDIR, BACKEND_PORT
   ```

**Done!** Now each user just creates their own `.env` file.

---

## 🎯 Priority 2: Secure Download Endpoint (15 min)

### Why?
- Current endpoint allows downloading ANY file on your system (security risk!)

### Fix:

**Current (unsafe)**:
```python
@app.get("/download")
async def api_download(path: str):
    return FileResponse(path)  # ⚠️ DANGEROUS!
```

**Fixed (safe)**:
```python
@app.get("/download")
async def api_download(path: str, project: str):
    project_dir = get_project_dir(project)
    
    # Resolve path relative to project directory
    file_path = (project_dir / path).resolve()
    
    # Security check: ensure file is within project directory
    if not str(file_path).startswith(str(project_dir.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)
```

---

## 🎯 Priority 3: Better Error Handling (30 min)

### Why?
- Better error messages for debugging
- Consistent error format
- Better user experience

### Steps:

1. **Add basic validation to endpoints**:
   ```python
   @app.post("/fetch")
   async def api_fetch(
       project: str = Form(...),
       role: str = Form(...),
       pdbCode: str = Form(...)
   ):
       # Validate inputs
       if len(project) == 0 or len(project) > 100:
           raise HTTPException(status_code=400, detail="Invalid project name")
       
       if role not in ["receptor", "binder"]:
           raise HTTPException(status_code=400, detail="Role must be 'receptor' or 'binder'")
       
       if len(pdbCode) != 4 or not pdbCode.isalnum():
           raise HTTPException(status_code=400, detail="PDB code must be 4 alphanumeric characters")
       
       try:
           project_dir = get_project_dir(project)
           # ... rest of code
       except Exception as e:
           raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
   ```

2. **Create error response helper**:
   ```python
   def error_response(message: str, status_code: int = 400):
       raise HTTPException(status_code=status_code, detail=message)
   ```

---

## 🎯 Bonus: Add Logging (20 min)

### Why?
- Better debugging
- See what's happening in production

### Steps:

1. **Install loguru**:
   ```bash
   pip install loguru
   ```

2. **Add to `backend/main.py`**:
   ```python
   from loguru import logger
   
   logger.info("Starting ProteinWeb backend...")
   ```

3. **Replace print statements**:
   ```python
   # Instead of: print(f"Error: {e}")
   logger.error(f"Error: {e}")
   
   # Instead of: print("Starting docking...")
   logger.info("Starting docking...")
   ```

---

## 📋 Implementation Checklist

- [ ] Install `python-dotenv`: `pip install python-dotenv`
- [ ] Create `backend/.env.example`
- [ ] Create `backend/config.py`
- [ ] Update `backend/pipeline.py` imports
- [ ] Update `backend/main.py` imports
- [ ] Fix download endpoint security
- [ ] Add basic input validation
- [ ] (Optional) Add logging

**Total Time**: ~2 hours
**Impact**: ⭐⭐⭐⭐⭐ (Very High)

---

## 🚀 After These Improvements

You'll have:
- ✅ Portable configuration (easy to share)
- ✅ Secure file downloads
- ✅ Better error messages
- ✅ Professional logging

Want help implementing any of these? Let me know!

