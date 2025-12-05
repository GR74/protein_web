# ProteinWeb Improvement Plan

This document outlines recommended improvements organized by priority and impact.

## 🔴 High Priority (Security & Configuration)

### 1. Environment-Based Configuration
**Problem**: Hardcoded paths throughout the codebase make it difficult to share and deploy.

**Solution**:
- Create `.env` file support using `python-dotenv`
- Move all paths to environment variables
- Create `config.py` to centralize configuration
- Add `.env.example` template

**Files to Create/Modify**:
- `backend/config.py` - Centralized configuration
- `backend/.env.example` - Template for users
- Update `backend/pipeline.py` and `backend/main.py` to use config

**Impact**: ⭐⭐⭐⭐⭐ Makes project portable and easier to deploy

---

### 2. Security Improvements

#### A. CORS Configuration
**Problem**: Currently allows all origins (`allow_origins=["*"]`)

**Solution**:
```python
# Use environment variable for allowed origins
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:8080,http://localhost:5173").split(",")
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, ...)
```

#### B. Download Endpoint Path Traversal
**Problem**: `/download?path=...` allows arbitrary file access

**Solution**:
- Validate paths are within workdir
- Use relative paths from project directory
- Add authentication/authorization checks

**Impact**: ⭐⭐⭐⭐⭐ Critical for security

---

### 3. Input Validation & Error Handling

**Problem**: Limited validation, generic error messages

**Solution**:
- Add Pydantic models for all request/response types
- Consistent error response format
- Better error messages for users

**Files to Create**:
- `backend/schemas.py` - Pydantic models
- Update all endpoints to use schemas

**Impact**: ⭐⭐⭐⭐ Better UX and debugging

---

## 🟡 Medium Priority (Code Quality & Maintainability)

### 4. Structured Logging

**Problem**: Print statements scattered throughout, no log levels

**Solution**:
```python
# Use loguru or Python's logging module
from loguru import logger

logger.info("Starting docking...")
logger.error(f"Docking failed: {error}")
```

**Benefits**:
- Log levels (INFO, ERROR, DEBUG)
- File logging
- Better debugging

**Impact**: ⭐⭐⭐⭐ Easier debugging and monitoring

---

### 5. API Documentation

**Problem**: No auto-generated API docs

**Solution**:
FastAPI already supports OpenAPI! Just need to:
- Add better docstrings
- Add response models
- Configure Swagger UI

**Impact**: ⭐⭐⭐ Better developer experience

---

### 6. Code Refactoring

#### A. Duplicate Path Handling
**Problem**: Path conversion (`str(path)`) repeated everywhere

**Solution**:
```python
def path_to_str(path: Path) -> str:
    """Convert Path to string, handling None."""
    return str(path) if path else None
```

#### B. Consistent Error Responses
**Problem**: Inconsistent error response formats

**Solution**: Create standard error response function

#### C. Extract Constants
**Problem**: Magic numbers and strings scattered

**Solution**: Move to config/constants file

**Impact**: ⭐⭐⭐ Better maintainability

---

## 🟢 Low Priority (Nice to Have)

### 7. Testing

**Problem**: No tests exist

**Solution**:
- Add pytest for backend
- Add unit tests for critical functions
- Add integration tests for API endpoints

**Impact**: ⭐⭐⭐ Better reliability

---

### 8. Performance Optimizations

**Problem**: Some inefficient operations

**Solutions**:
- Cache parsed FASC files
- Async file operations where possible
- Optimize PDB parsing

**Impact**: ⭐⭐ Minor performance gains

---

### 9. Database Support (Future)

**Problem**: No persistence for projects

**Solution**: Add SQLite/PostgreSQL for:
- Project history
- User preferences
- Job tracking

**Impact**: ⭐⭐ Future enhancement

---

## 📋 Quick Wins (Easy to Implement)

### 10. Add Request/Response Models

**Time**: 1-2 hours
**Impact**: High

### 11. Environment Variable Support

**Time**: 2-3 hours
**Impact**: Very High

### 12. Better Error Messages

**Time**: 1-2 hours
**Impact**: Medium-High

### 13. Logging Setup

**Time**: 1 hour
**Impact**: Medium

---

## 🎯 Recommended Implementation Order

1. **Week 1**: Configuration system (`.env` support)
2. **Week 1**: Security fixes (CORS, download endpoint)
3. **Week 2**: Error handling & validation (Pydantic models)
4. **Week 2**: Structured logging
5. **Week 3**: API documentation improvements
6. **Week 3**: Code refactoring (duplicates, constants)

---

## 📝 Detailed Improvement Descriptions

### Improvement 1: Environment Configuration

**Create `backend/config.py`**:
```python
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Paths
    ROSETTA_CLEAN_PDB = Path(os.getenv("ROSETTA_CLEAN_PDB"))
    ROSETTA_BIN = Path(os.getenv("ROSETTA_BIN"))
    DOCKING_XML_SRC = Path(os.getenv("DOCKING_XML_SRC"))
    DOCKING_OPTIONS_SRC = Path(os.getenv("DOCKING_OPTIONS_SRC"))
    WORKDIR = Path(os.getenv("PROTEINWEB_WORKDIR", "./workdir"))
    CONDA_PATH = Path(os.getenv("CONDA_PATH", ""))
    
    # Server
    BACKEND_PORT = int(os.getenv("BACKEND_PORT", 5001))
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:8080").split(",")
    
    # Optional settings
    SURFACE_GAP = float(os.getenv("SURFACE_GAP", 2.0))
```

**Create `backend/.env.example`**:
```env
# Rosetta Paths
ROSETTA_CLEAN_PDB=/path/to/rosetta/main/tools/protein_tools/scripts/clean_pdb.py
ROSETTA_BIN=/path/to/rosetta/main/source/bin/rosetta_scripts.linuxgccrelease
DOCKING_XML_SRC=/path/to/docking_full.xml
DOCKING_OPTIONS_SRC=/path/to/docking.options.txt

# Working Directory
PROTEINWEB_WORKDIR=/path/to/workdir

# Conda (optional, for ColabFold)
CONDA_PATH=/path/to/anaconda3

# Server Configuration
BACKEND_PORT=5001
ALLOWED_ORIGINS=http://localhost:8080,http://localhost:5173

# Settings
SURFACE_GAP=2.0
```

### Improvement 2: Input Validation

**Create `backend/schemas.py`**:
```python
from pydantic import BaseModel, Field
from typing import Optional

class ProjectRequest(BaseModel):
    project: str = Field(..., min_length=1, max_length=100)

class FetchRequest(ProjectRequest):
    role: str = Field(..., pattern="^(receptor|binder)$")
    pdbCode: str = Field(..., min_length=4, max_length=4, pattern="^[0-9A-Z]{4}$")

class DockingRequest(ProjectRequest):
    nstruct: int = Field(default=10, ge=1, le=1000)

class DockingResponse(BaseModel):
    score: float
    bestScore: float
    desc: str
    bestModel: str
    index: int
    pdb_path: str
    bestPdbPath: str
    log_path: str
    project: str
```

---

## 🔍 Code Quality Improvements

### Current Issues Found:

1. **Hardcoded Paths**: 5+ locations with hardcoded paths
2. **No Input Validation**: Endpoints accept any input
3. **Inconsistent Errors**: Mix of exceptions and HTTPException
4. **No Logging**: Print statements everywhere
5. **Security Risks**: CORS, path traversal
6. **Code Duplication**: Path conversions, error handling

---

## 💡 Additional Suggestions

### Frontend Improvements:
- Add loading skeletons
- Better error messages in UI
- Retry logic for failed requests
- Progress indicators for all async operations

### Backend Improvements:
- Add health check endpoint (`/health`)
- Add metrics endpoint (if needed)
- Job queue for long-running tasks
- File cleanup for old projects

### DevOps:
- Docker setup for easy deployment
- CI/CD pipeline
- Automated testing

---

## 📊 Impact Assessment

| Improvement | Priority | Effort | Impact | ROI |
|------------|----------|--------|--------|-----|
| Environment Config | High | Medium | Very High | ⭐⭐⭐⭐⭐ |
| Security Fixes | High | Low | Very High | ⭐⭐⭐⭐⭐ |
| Error Handling | High | Medium | High | ⭐⭐⭐⭐ |
| Logging | Medium | Low | Medium | ⭐⭐⭐⭐ |
| API Docs | Medium | Low | Medium | ⭐⭐⭐ |
| Testing | Medium | High | High | ⭐⭐⭐ |
| Code Refactoring | Low | Medium | Medium | ⭐⭐⭐ |

---

## 🚀 Getting Started

Want to implement these? Start with:

1. **Environment Configuration** (2-3 hours)
   - Create `config.py`
   - Create `.env.example`
   - Update imports

2. **Security Fixes** (1 hour)
   - Fix CORS
   - Secure download endpoint

3. **Error Handling** (2-3 hours)
   - Add Pydantic models
   - Update endpoints

These three will have the biggest impact!

