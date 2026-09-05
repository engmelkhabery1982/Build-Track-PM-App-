# تشغيل وكلاء BuildTrack على Google Cloud وGemini API

## الخيار الأسهل: Google AI Studio Build

استخدم هذا إذا كان التطبيق `BuildTrack-Agent-Cloud` ظاهرًا ومربوطًا بـGitHub:

1. افتح التطبيق السحابي المرتبط بالمستودع.
2. افتح لوحة **GitHub** واضغط **Pull changes to Google AI Studio** قبل بدء كل وكيل.
3. تأكد أن المستودع هو `engmelkhabery1982/BuildTrack-Agent-Cloud` والفرع `main`.
4. افتح محادثة جديدة مع النموذج المتاح، والصق النص الكامل من
   `UNIVERSAL_CLOUD_AGENT_PROMPT_AR.md`.
5. عند توقف النموذج بسبب الحد، اطلب منه تنفيذ بروتوكول الانقطاع: commit متماسك،
   تحديث سجل الاستمرار، ثم اجعل تغييرات AI Studio جاهزة للدفع.
6. اضغط **Push changes to GitHub**.
7. اختر نموذجًا آخر/محادثة جديدة، ثم كرر من الخطوة 2 والصق الرسالة نفسها. الوكيل
   الجديد سيقرأ السجل ويكمل، ولا يحتاج ملخص المحادثة القديمة.

> AI Studio Build يحقن `GEMINI_API_KEY` تلقائيًا في بيئة الخادم للتطبيقات الجديدة.
> لا تضع المفتاح في المحادثة أو الملفات أو GitHub.

## الخيار الأكثر تحكمًا: Google Cloud Shell + Aider

هذا الخيار مناسب عندما تريد تبديل النماذج يدويًا وتشغيل الاختبارات وGit بصورة واضحة.
Cloud Shell مجاني لحساب Google، ويوفر 5GB تخزينًا دائمًا، لكن الجلسة تنتهي بعد الخمول
ولها حدود استخدام؛ لذلك يجب push عند كل تسليم.

### إعداد مرة واحدة

افتح [Google Cloud Shell](https://shell.cloud.google.com/) ثم نفذ الأسطر بالتتابع:

```bash
git clone https://github.com/engmelkhabery1982/BuildTrack-Agent-Cloud.git
cd BuildTrack-Agent-Cloud
python3 -m pip install --user aider-install
~/.local/bin/aider-install
```

احفظ مفتاح Gemini خارج المستودع:

```bash
mkdir -p ~/.config/buildtrack-agent
read -s -p "Gemini API key: " GEMINI_KEY_INPUT; echo
printf 'export GEMINI_API_KEY=%q\n' "$GEMINI_KEY_INPUT" > ~/.config/buildtrack-agent/gemini.env
chmod 600 ~/.config/buildtrack-agent/gemini.env
unset GEMINI_KEY_INPUT
source ~/.config/buildtrack-agent/gemini.env
```

لا تنفذ `git add -f` لملف المفتاح، ولا تطبع قيمته. اختبر وجوده دون إظهاره:

```bash
test -n "$GEMINI_API_KEY" && echo "Gemini key loaded"
```

### تشغيل الوكيل الأول

```bash
cd ~/BuildTrack-Agent-Cloud
git pull --ff-only origin main
aider --model gemini/gemini-2.5-pro \
  --read AGENTS.md \
  --read docs/agent-work-orders/PROJECT_CHARTER_AR.md \
  --read docs/agent-work-orders/CLOUD_PROGRESS_LEDGER.md \
  --read docs/agent-work-orders/MASTER_CLOUD_DEVELOPMENT_WORK_ORDER_AR.md
```

داخل Aider الصق الرسالة الموجودة في `UNIVERSAL_CLOUD_AGENT_PROMPT_AR.md`.

### تبديل النموذج عند الحد

داخل Aider:

```text
/model gemini/gemini-2.5-flash
```

أو أغلقه وشغّل:

```bash
aider --model gemini/gemini-2.5-flash --read AGENTS.md \
  --read docs/agent-work-orders/PROJECT_CHARTER_AR.md \
  --read docs/agent-work-orders/CLOUD_PROGRESS_LEDGER.md \
  --read docs/agent-work-orders/MASTER_CLOUD_DEVELOPMENT_WORK_ORDER_AR.md
```

للمهام الخفيفة والتوثيق يمكن تجربة `gemini/gemini-2.5-flash-lite`. اعرض النماذج
التي يتعرف عليها إصدار Aider المثبت بدل تخمين الاسم:

```bash
aider --list-models gemini/
```

توزيع مقترح:

- `gemini-2.5-pro`: تحليل schema والعلاقات والتصميم والإصلاحات المعقدة.
- `gemini-2.5-flash`: التنفيذ، الاختبارات، وإصلاح build.
- `gemini-2.5-flash-lite`: جرد الملفات والتوثيق والتقارير القصيرة.

حدود Gemini تُحسب على مستوى مشروع Google وليس لكل API key فقط، وتختلف حسب النموذج
وبحسب RPM/TPM/RPD. تبديل المفتاح داخل المشروع نفسه لا يعيد الحصة. تبديل النموذج قد
يستخدم حد ذلك النموذج المتاح، لكنه ليس وسيلة لتجاوز شروط الخدمة. راقب الاستهلاك من
AI Studio Dashboard ولا تفعل Billing إن كنت تريد الالتزام بالمجاني فقط.

## منع تعارض الوكلاء

- الأسهل والأكثر أمانًا: وكيل واحد في كل مرة على Agent Cloud `main`.
- لا تفتح وكيلين يكتبان في Google AI Studio workspace نفسه بالتزامن.
- للتوازي الحقيقي يلزم clone/worktree وفرع منفصل لكل وكيل؛ لا تستخدمه قبل أن يجهز
  Codex أوامر عمل مستقلة غير متداخلة.
- كل وكيل يبدأ بـPull وينتهي بـcommit + تحديث السجل + Push.

