# Project rules for Claude

## Git
- Always work directly on the `main` branch. Do not create feature branches.
- Commit and push every change straight to `origin/main` (`git push origin main`).
- `main` auto-deploys: frontend to Vercel, backend (including the weighbridge agent download) to Render.

## Weighbridge
- Troubleshooting guide: `docs/WEIGHBRIDGE_COM_TROUBLESHOOTING.md`.
- The cabin PC agent is `backend/scripts/weighbridge_agent.js` + `start_agent.bat`. The cloud server has no COM ports.
