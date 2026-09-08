# طابور العمل المحلي

## الاستمرار السحابي بين النماذج والوكلاء

- نقطة البدء الإلزامية: [AGENT_START_HERE_AR.md](AGENT_START_HERE_AR.md)
- مؤشر المهمة الوحيد: [ACTIVE.md](ACTIVE.md)
- أمر العمل المرجعي: [MASTER_CLOUD_DEVELOPMENT_WORK_ORDER_AR.md](MASTER_CLOUD_DEVELOPMENT_WORK_ORDER_AR.md)
- حزمة القراءة المحدودة: [FEATURE_READ_PACKS_AR.md](FEATURE_READ_PACKS_AR.md)
- الرسالة الوحيدة الجاهزة لكل وكيل: [UNIVERSAL_CLOUD_AGENT_PROMPT_V2_AR.md](UNIVERSAL_CLOUD_AGENT_PROMPT_V2_AR.md)
- خطوات Google Cloud/Aider: [GOOGLE_CLOUD_AGENTS_SETUP_AR.md](GOOGLE_CLOUD_AGENTS_SETUP_AR.md)

الملفات `UNIVERSAL_CLOUD_AGENT_PROMPT_AR.md` و`GITHUB_CONTINUATION_WORK_ORDER_AR.md`
و`CLOUD_PROGRESS_LEDGER.md` مراجع تاريخية فقط، ولا تختار المهمة ولا تُرسل للوكيل.

هذه الملفات خاصة بالعمل المتسلسل على `BuildTrack-Agent-Cloud`. لا يكتب الوكيل
السحابي إلى المستودع الرسمي؛ Codex يراجع ويصلح ثم يدمج.

## طابور Ollama المحلي

ضع بطاقة مكتملة في `inbox` باسم ينتهي بـ`.ready.md`، مثال:

`C2.2-forecast-variance.ready.md`

انسخ [TASK_TEMPLATE.md](TASK_TEMPLATE.md) أولًا. احفظها باسم مؤقت ثم أعد تسميتها
إلى `.ready.md` بعد الانتهاء. المشغّل ينقلها آليًا إلى `processing` ثم إلى `ready`
إذا اجتازت مسودة Qwen حارس النطاق ومراجعة Llama، أو إلى `rejected` بعد محاولة
تصحيح واحدة فاشلة.

لا يعني وجود بطاقة في `ready` أن الميزة نُفذت. معناها فقط أن هناك patch مسودة
وتقرير مراجعة محفوظين تحت `tmp/` بانتظار مراجعة Codex واختبارات القبول والدمج.

لا تعدّل يدويًا بطاقة داخل `processing`. أصلح بطاقة `rejected` وأنشئ نسخة جديدة
في `inbox` باسم جديد عند الحاجة.
