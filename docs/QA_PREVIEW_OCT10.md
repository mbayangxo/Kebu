# Isolated QA Preview

This QA branch deploys the verified application to the active Kebu-qa database. Production variables and main are unchanged.

Vercel Hobby rejects the source's five-minute cron expressions, including during Preview creation. This branch's vercel.json omits schedules for QA deployment only. Cron API handlers and authorization remain implemented; no automated scheduling is verified by this Preview. Do not promote this Preview or merge its scheduler configuration into Production. Production needs an authorized scheduler solution and verified secret/provider flows before release.
