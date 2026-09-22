# MoveFuel incident and rollback runbook

## First response

1. Record the alert time, Appwrite project, affected Function deployment ID,
   route, correlation ID, and user-safe symptoms. Never copy photos, JWTs,
   secrets, or raw health data into an incident record.
2. Classify: authentication/data exposure, private-media access, deletion
   failure, incorrect meal result, availability, or crash/performance issue.
3. For suspected exposure, disable public Function execution and camera
   analysis, preserve audit evidence, notify the owner, and obtain privacy/legal
   guidance before user communication.

## Rollback

1. Select the previous verified Appwrite Function deployment ID recorded in the
   release checklist and activate it.
2. Do not revert or delete TablesDB data as part of code rollback.
3. Verify `/health`, authenticated bootstrap, owner isolation, private media,
   and the affected route against staging before re-enabling production traffic.
4. Record the rollback decision, deployed source SHA, operator, checks, and
   follow-up corrective action.

## Recovery proof

At least once before public launch and after any material schema change, run a
staging export/restore drill using a test account. Verify account export,
confirmed meals, private-media deletion, and account deletion after recovery.
