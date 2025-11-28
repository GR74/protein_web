# Contributing to ProteinWeb Lab Suite

Thank you for your interest in contributing to ProteinWeb!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/proteinweb.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Commit: `git commit -m "Add: your feature description"`
6. Push: `git push origin feature/your-feature-name`
7. Open a Pull Request

## Development Setup

See [README.md](README.md) for installation instructions.

## Code Style

- **Python**: Follow PEP 8
- **TypeScript/React**: Use ESLint configuration provided
- **Commits**: Use clear, descriptive commit messages

## Adding New Modules

When adding new modules (e.g., Alanine Scanning, NCAA Scanning):

1. Create module directory: `backend/modules/your-module/`
2. Add router in `backend/main.py`
3. Create frontend page: `protein-weaver/src/pages/YourModulePage.tsx`
4. Add route in `App.tsx`
5. Update Dashboard with new module card
6. Update documentation

## Testing

Before submitting:
- Test on your platform
- Verify all paths are configurable (no hardcoded paths)
- Check for linting errors: `npm run lint` (frontend)

## Pull Request Process

1. Update README.md if needed
2. Update MAC_SETUP.md if Mac-specific changes
3. Ensure all tests pass
4. Request review from maintainers

## Questions?

Open an issue for questions or discussions.

