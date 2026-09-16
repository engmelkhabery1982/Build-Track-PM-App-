# Agent Queue Cursor

mode: OPERATIONAL_RELIABILITY_FREEZE
last_accepted_capability: W05
current_feature: ORF00
current_executor: CODEX_LOCAL_ONLY
status: READY_FOR_CODEX_LOCAL_EXECUTION
next_feature_after_acceptance: ORF01
new_feature_development: FROZEN
release_candidate_head: befdd12c1df56e9e78ded4105fec16a9b4f77127
known_red_gates: LOCAL_CLOUD_VERSION_DIVERGENCE; RUST_CLAIM_REVERSAL_DATABASE_LOCK; NO_TRUE_E2E_ACCEPTANCE
instruction: Execute ORF00 only from the master freeze plan. Preserve the seven local Rust candidates, classify hunks, create one governed clean candidate, run all gates, and stop. Cloud agents must not execute ORF00 and must not start ORF01 until Codex updates ACTIVE.md.
