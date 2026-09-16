# Agent Queue Cursor

mode: OPERATIONAL_RELIABILITY_FREEZE
last_accepted_capability: ORF00
current_feature: ORF01
current_executor: CODEX_LOCAL_ONLY
status: WAITING_FOR_USER_COMMAND
next_feature_after_acceptance: ORF02
new_feature_development: FROZEN
release_candidate_head: 47e02cdc2c4141eb6e2410d0e915f106d63b43ee
known_red_gates: RUST_CLAIM_REVERSAL_DATABASE_LOCK; NO_TRUE_E2E_ACCEPTANCE
instruction: ORF00 is closed in its scoped capability. Do not start ORF01 until a new user command. ORF01 must fix transaction rollback and immediate retry reliability, run Cargo locally, and stop before ORF02.
