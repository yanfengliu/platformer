# Local execution rules

The owner requires headless work with no terminal windows (2026-10-13). Keep shell execution non-interactive and task-owned Windows child launches hidden. PowerShell Start-Process uses -WindowStyle Hidden; Node child_process.spawn uses windowsHide: true, including detached browser-tool helpers.

The cached Playwright CLI can launch a detached daemon without windowsHide even when its browser is headless. Enforce hidden child spawning with a task-local preload before invoking it; do not modify the shared installed tool. Close its named session and verify the recorded process tree in finally cleanup.
