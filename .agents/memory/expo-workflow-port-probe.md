---
name: Expo workflow port probe failures in isolated task envs
description: When an Expo artifact's dev workflow reports "didn't open port" despite Metro fully starting — what to check and what not to waste cycles on.
---

# Expo workflow "didn't open port" despite Metro starting

Symptom: `restart_workflow` on an Expo artifact fails with `DIDNT_OPEN_A_PORT`
even though the captured workflow log shows Metro fully starting (it reaches the
complete interactive menu and prints `Web is waiting on http://localhost:<port>`).

**Things that did NOT fix it** (tried exhaustively, all still failed even with
240–400s windows): toggling `--localhost` vs `--lan`, `reactCompiler` on/off,
`NODE_OPTIONS=--dns-result-order=ipv4first`, clearing Metro caches. So it is
**not** binding flag, IPv6/IPv4, React Compiler startup cost, or compile time.

**Hard environment constraints that make this nearly undiagnosable from inside a
task-agent env:**
- The sandbox **SIGKILLs (exit 137) any Metro/expo process you spawn yourself**
  (nohup/setsid/disown included) — you cannot run the dev server outside the
  managed workflow to curl `/status` or inspect the bind interface.
- Workflow **log capture can freeze** — new restart runs produce no new log
  file, so the "full menu" log you see may be from an earlier run.
- After a failed probe the process is killed, so `screenshot` of the Expo dev
  domain returns 502 — you cannot verify the UI visually.

**Conclusion / how to apply:** This is an environment/platform-level probe issue
(`ensurePreviewReachable = "/status"` against the Expo `localPort` in
`.replit-artifact/artifact.toml`), not an app-code defect. Verify the app another
way: `tsc --noEmit` (typecheck) plus static review of provider wiring
(`app/_layout.tsx`), theme context, and screen entry points. Do NOT burn many
cycles looping on dev-command/config tweaks + restarts — confirm code soundness,
restore the pristine scaffold dev command, and report the workflow probe as an
environment blocker. It may behave differently in the merged/main environment.
