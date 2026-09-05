# A3 — Revenue vs Delivery Cost Separation

## النتيجة

`CLOSED — CODEX ACCEPTED 8/10`

استُعيدت مسودة الوكيل من `BuildTrack-Agent-Recovery-A3-20260905` دون دمج تاريخ
المستودع أو ملفات Google AI Studio الجانبية، ثم راجعها Codex وصحح منطقها وربطها.

## ما تم قبوله وتصحيحه

- فصل Revenue BAC/PV/EV/SV/SPI عن Delivery Cost BAC/PV/EV/AC/CV/CPI/EAC/ETC/VAC/TCPI.
- تجميع Cost PV وCost EV لكل Control Account بدل تطبيق نسبة ربح إجمالية مضللة.
- اعتماد خطة التكلفة فقط من Control Account مرتبط بخط SOV حالته Active أو Closed.
- SOV Draft أو غياب خطة التكلفة يعيد Unavailable أو Approved Baseline Required.
- استبعاد معاملات ما بعد Data Date ودعم قيود التكلفة السالبة والعكسية.
- استخدام المحرك نفسه في Dashboard وControl Account وReport Pack وربط Portfolio وS-Curve به.
- فصل تسميات الواجهة لمنع قراءة Revenue EV كأنه Cost EV.

## الاختبارات الفعلية

- `npm test`: 142/142 passed.
- `npm run build`: passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: 21/21 passed.
- `git diff --check`: passed.

## المراجعة المحلية

بدأت مراجعة Ollama المستقلة ثم طلب المستخدم تأجيلها لإتمام المزامنة قبل انتهاء حد
الاستخدام. يعاد تشغيلها في بوابة مراجعة لاحقة.

## الخطوة التالية

`A4 — KPI Source Drill-down & Reconciliation` فقط.
