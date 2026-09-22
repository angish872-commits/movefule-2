# MoveFuel production release checklist

This checklist is evidence-based. A checkbox is not approval to bypass a
missing external test.

- [ ] Staging and production are distinct EU Appwrite projects with least-
  privilege operator access and separate private media buckets.
- [ ] Source SHA, Appwrite schema ledger, active Function deployment IDs,
  algorithm/model versions, and validation artifact IDs are frozen.
- [ ] Backend, nutrition, UI, Android, Wear, lint, emulator, and physical
  paired-device acceptance have passed on the frozen source.
- [ ] User A/User B isolation, private image read/write/delete, rate limiting,
  retry/idempotency, export, deletion, backup restore, and rollback have
  passed against staging.
- [ ] Camera analysis has passed live-provider and blinded weighed-food
  acceptance for the US, UK, and Australia; its review evidence is immutable.
- [ ] Paid features remain disabled; no premium claim or purchase UI is live.
- [ ] Privacy policy, terms, adult general-wellness disclaimer, image consent,
  retention/deletion policy, support contact, and Play Data Safety responses
  have been reviewed by the owner and qualified counsel.
- [ ] Release signing inputs are loaded only on the secured build machine;
  signed phone and Wear artifacts pass their production-input gates.
- [ ] Google Play closed test, crash/vitals monitoring, incident owner,
  support escalation, rollback deployment ID, and no-Sev-1/Sev-2 decision are
  recorded.
