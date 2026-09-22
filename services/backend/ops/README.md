# Local backend supervision

`com.movefuel.backend.plist` is a credential-free launchd **template** for the
local MVP backend. `install-launchd.sh` resolves the current repository path and
the installed Node binary, writes the real plist to `~/Library/LaunchAgents`,
and reloads the per-user agent.

Install or reload it on macOS with:

```bash
cd services/backend
./ops/install-launchd.sh
```

Check process health with `GET http://127.0.0.1:8787/health`. stdout and stderr
are written to `/tmp/movefuel-backend.stdout.log` and
`/tmp/movefuel-backend.stderr.log`; logs must remain sanitized and must never
contain credentials, API keys, or private health data.
