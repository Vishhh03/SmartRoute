# IDE Migration Reminder - Critical Setup Steps

## Before You Start in New IDE (Windsurf/Trae)

### 1. .env File - MOST IMPORTANT! 
Most IDEs hide .env files by default. You MUST manually copy this:

**Create `.env` file in project root with:**
```
# OpenRouteService API Key
ORS_API_KEY=eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImQwZDdhYTNjODU2YzRlMjlhNDNlMDliNzA1OTUxOWM3IiwiaCI6Im11cm11cjY0In0=

# Flask Backend
FLASK_ENV=development
API_PORT=5000

# Optional: Database settings if needed
DATABASE_URL=sqlite:///traffic_data.db
```

### 2. How to Create .env in New IDE

1. **Show Hidden Files**: Most IDEs have a "Show hidden files" toggle
2. **Create New File**: Right-click project root > "New File" > Name it `.env`
3. **Copy-Paste**: Copy the content above exactly
4. **Save**: Make sure it's saved in the project root directory

### 3. Verify Installation

**Check dependencies are installed:**
```bash
npm install  # Frontend dependencies
pip install -r requirements.txt  # Backend dependencies (if exists)
```

**Verify lucide-react is installed:**
- Should see `"lucide-react": "^0.462.0"` in package.json
- Icons like `Navigation`, `Timer`, `Globe` should work without errors

### 4. Quick Test

1. **Start Backend**: `python backend/app_new.py`
2. **Start Frontend**: `npm run dev`
3. **Test Search**: Try searching for "Downtown Minneapolis"
4. **Check Console**: No errors about missing icons or API keys

### 5. Common Migration Issues

| Issue | Solution |
|-------|----------|
| Icons not showing | Install lucide-react: `npm install lucide-react` |
| API calls failing | Check .env file exists with correct ORS_API_KEY |
| Map not loading | Verify Leaflet CSS is imported in main.tsx |
| Route colors wrong | Hard refresh browser (Ctrl+F5) to clear cache |

### 6. Projector Visibility Check

After migration, test visibility:
- **Stand 10 feet back** from your monitor
- **Check if text is readable** (enhanced font weights applied)
- **Verify Neon Cyan vs Red contrast** on routes
- **Test on projector** if available before demo

---

## Migration Checklist

- [ ] Copy .env file with ORS_API_KEY
- [ ] Run `npm install` for dependencies  
- [ ] Start backend: `python backend/app_new.py`
- [ ] Start frontend: `npm run dev`
- [ ] Test route search functionality
- [ ] Verify all icons display correctly
- [ ] Check projector visibility from distance
- [ ] Hard refresh browser (Ctrl+F5)

---

**Remember: The .env file is the #1 thing people forget during IDE migration!**
