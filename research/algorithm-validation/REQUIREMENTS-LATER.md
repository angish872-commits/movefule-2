# Requirements the user will need when the execution phase starts

Nothing else is required from the user while the suite is being prepared.

When ready to execute the empirical phases on the user's own machine, the minimum practical requirements are:

- macOS or Linux computer with normal outbound HTTPS/DNS.
- Python 3.11+.
- Node.js 22.6+.
- Git.
- 5 GB free for pilot; about 25 GB for a standard selected-data run; much more only for large/full imagery.
- Existing Gemini key kept private in `GEMINI_API_KEY`.
- USDA key optional for bulk data; an API key is useful for live lookup probes.
- `gsutil`/Google Cloud CLI only when using Nutrition5k directory acquisition paths.
- Later, 50-100 blinded weighed launch-market meals for final U.S./U.K./Australia acceptance. Globally diverse foods remain in-scope because users in those markets eat diverse cuisines.

A GPU is **not** required to start. The preflight report records CPU/Apple Silicon/CUDA/MPS availability and only recommends GPU compute if benchmark latency becomes impractical.
