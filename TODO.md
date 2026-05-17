- [ ] Identify frontend deployment method (Render/Vercel) and ensure build-time env var `VITE_API_URL` points to deployed backend.
- [x] Add defensive guard in `frontend/src/components/AnalysisPanel.jsx` to prevent polling `/simulate/status/undefined`.
- [x] Rebuild frontend.
- [ ] Verify production deployment has `VITE_API_URL` set so `POST /api/pipeline/simulate` returns `{ jobId }`.


