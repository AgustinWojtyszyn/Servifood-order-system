# Supabase Excel Analysis Integration TODO

## [ ] 1. Database Setup
- [ ] Create food-order-app/analysis_history.sql
- [ ] Run SQL in Supabase SQL Editor (table + RLS)

## [ ] 2. Backend
- [ ] Install xlsx: npm i xlsx
- [ ] Add /api/upload-excel endpoint in server.js with JWT verify
- [ ] Process Excel → extract sample data → save jsonb with user_id

## [ ] 3. Frontend Services
- [ ] Create src/services/analysis.js (CRUD with existing supabase)

## [ ] 4. UI Components
- [ ] Create src/components/ExcelAnalysis.jsx (upload + list)
- [ ] Add to src/App.jsx routes (protected)

## [ ] 5. Test
- [ ] Login → upload Excel → check analysis_history in Supabase
- [ ] Dashboard shows own records only

Progress: Starting with SQL...
