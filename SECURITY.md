# Security

mdifit is a local tool. It serves the folder you point it at on `127.0.0.1` only, answers
only requests addressed to `localhost`, `127.0.0.1` or `[::1]`, reads Markdown and images
inside that folder, writes nothing to disk, and shows raw HTML in Markdown as text.

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub's
"Report a vulnerability" (Security → Advisories) on this repository instead of a public
issue. Include steps to reproduce and the version (`npx mdifit --version`). You will get an
answer within a week.
