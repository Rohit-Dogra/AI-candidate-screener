# ScreenIQ

ScreenIQ is a lightweight internal HR screening tool built with a Django REST API backend and a Next.js frontend. It accepts a job description plus a candidate resume, generates an AI-based shortlisting score with concise reasoning, and stores screening history for authenticated HR users.

## Tech Stack

- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS
- Backend: Django 5 + Django REST Framework
- Auth: JWT using `djangorestframework-simplejwt`
- Database: PostgreSQL (primary), SQLite fallback for local test/dev
- AI: OpenAI Chat Completions API (`gpt-4o-mini`)
- Streaming: Server-Sent Events (SSE) from Django to Next.js client

## Project Structure

```text
.
├── backend/
│   ├── config/
│   ├── screenings/
│   ├── requirements.txt
│   └── manage.py
├── frontend/
│   ├── src/app/screen/page.tsx
│   ├── src/app/dashboard/page.tsx
│   └── src/lib/
├── .env.example
└── README.md
```

## Setup Guide

1. Clone repository and copy env file:

```bash
cp .env.example .env
```

Fill in your real values in `.env` (DB credentials, OpenAI key).

2. Backend setup:

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\python -m pip install -r requirements.txt
```

3. Configure PostgreSQL and ensure `.env` has correct DB credentials.  
   Or use SQLite for local dev by setting `USE_SQLITE=true` in `.env`.

4. Run migrations and create a demo user:

```bash
# Windows PowerShell — SQLite (easiest for local dev)
$env:USE_SQLITE="true"
.venv\Scripts\python manage.py migrate
.venv\Scripts\python manage.py createsuperuser
```

5. Start backend:

```bash
.venv\Scripts\python manage.py runserver 8000
```

6. Start frontend:

```bash
cd ../frontend
npm install
npm run dev
```

7. Open `http://localhost:3000`, log in with the superuser credentials you created.

### Running without an OpenAI key (mock mode)

If your OpenAI key has no quota or you want to test without calling the API, set in `.env`:

```
USE_MOCK_AI=true
```

The app will return a fixed demo score (7.5) with placeholder reasons so every other feature works normally.

## API Endpoints

- `POST /api/auth/token/` — get JWT access/refresh token
- `POST /api/auth/token/refresh/` — refresh token
- `POST /api/screen/` — non-stream screening
- `POST /api/screen/stream/` — streaming screening via SSE
- `GET /api/applications/` — paginated screenings for current user
- `GET /api/applications/<id>/` — detail view for current user

---

## Bugs Fixed

The starter `ScreenCandidateView` in `backend/screenings/views.py` had six issues. Each is shown below as **before → after** with an explanation.

### Bug 1 — Unsafe dictionary access causes unhandled 500

**Before (broken):**
```python
job_desc = request.data['job_description']
resume   = request.data['resume']
```

**After (fixed):**
```python
job_desc = request.data.get("job_description", "").strip()
resume   = request.data.get("resume", "").strip()
if not job_desc or not resume:
    return Response(
        {"detail": "job_description and resume are required."},
        status=status.HTTP_400_BAD_REQUEST,
    )
```

`request.data['key']` raises a `KeyError` when the field is missing, which Django REST Framework converts to an unhandled 500. Using `.get()` with explicit validation returns a clean HTTP 400 with a descriptive message.

---

### Bug 2 — Prompt ignores job description; scores resume in isolation

**Before (broken):**
```python
messages=[{"role": "user", "content": f"Score this resume 1-10: {resume}"}]
```

**After (fixed):**
```python
user_prompt = f"Job Description:\n{job_desc}\n\nResume:\n{resume}"

messages=[
    {"role": "system", "content": PROMPT_TEMPLATE},
    {"role": "user",   "content": user_prompt},
]
```

The original prompt never sent the job description to the model, so every score was based only on the resume text with no reference to the role. The fixed version passes both artifacts and uses a structured system prompt (see AI Prompt Design section).

---

### Bug 3 — Deprecated OpenAI SDK call and fragile response parsing

**Before (broken):**
```python
import openai

response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[...]
)
score = response.choices[0].message.content
```

**After (fixed):**
```python
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
completion = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[...],
    temperature=0.2,
)
raw_content = completion.choices[0].message.content or "{}"
```

`openai.ChatCompletion.create` was removed in openai SDK v1.0. The new client-based API is the only supported path. The response is also guarded with `or "{}"` so a `None` content value does not crash downstream JSON parsing.

---

### Bug 4 — `ai_score` stored as free-form text breaks sorting and UI rendering

**Before (broken):**
```python
# models.py
ai_score = models.CharField(max_length=10)

# views.py — score was whatever string the model returned, e.g. "Seven" or "7.3/10"
app = Application.objects.create(..., ai_score=score, ...)
```

**After (fixed):**
```python
# models.py
ai_score = models.DecimalField(max_digits=4, decimal_places=2)

# ai.py — normalised before saving
def parse_score(raw_score: str) -> Decimal:
    ...  # handles "7.3", "Seven", "7.3/10" → Decimal("7.30")
```

Storing a raw string like `"Seven"` or `"7.3/10"` makes database-level ordering (`ORDER BY ai_score`) meaningless and forces every consumer to re-parse the value. Normalising to a `DecimalField` at write time gives a single source of truth.

---

### Bug 5 — No authentication enforced; `created_by` silently fails for anonymous requests

**Before (broken):**
```python
class ScreenCandidateView(APIView):
    # no permission_classes — any unauthenticated request reaches the view
    def post(self, request):
        ...
        created_by=request.user  # AnonymousUser → IntegrityError or wrong owner
```

**After (fixed):**
```python
class ScreenCandidateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ...
        created_by=request.user  # guaranteed to be a real User instance
```

Without `IsAuthenticated`, unauthenticated callers reach the view and `request.user` is `AnonymousUser`, which cannot satisfy the `ForeignKey` constraint on `created_by` — causing either an `IntegrityError` or silently assigning the wrong owner.

---

### Bug 6 — Resource creation returned HTTP 200 instead of HTTP 201

**Before (broken):**
```python
return Response(ApplicationSerializer(app).data, status=status.HTTP_200_OK)
```

**After (fixed):**
```python
return Response(ApplicationSerializer(app).data, status=status.HTTP_201_CREATED)
```

HTTP 200 means "OK / updated". HTTP 201 means "resource created". Using the correct status code lets clients (and API gateways) distinguish creation from retrieval without inspecting the body.

---

## Security Vulnerability Found & Fixed

**Vulnerability: IDOR / data leakage in `ApplicationListView`**

**Before (vulnerable):**
```python
class ApplicationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        apps = Application.objects.all()   # ← returns EVERY user's records
        return Response(ApplicationSerializer(apps, many=True).data)
```

Any authenticated HR user could call `GET /api/applications/` and receive every other user's screening records — including full resume text, job descriptions, and AI scores. This is a classic **Insecure Direct Object Reference (IDOR)** / tenant-isolation failure.

**After (fixed):**
```python
class ApplicationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        apps = Application.objects.filter(created_by=request.user).order_by("-created_at")
        ...

class ApplicationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        app = Application.objects.filter(created_by=request.user, pk=pk).first()
        if not app:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        ...
```

Queries are scoped to `request.user` on both list and detail endpoints. A user requesting another user's record ID receives 404, not the record.

---

## AI Prompt Design

The prompt uses a strict **system instruction** that separates role definition from user input. The system message tells the model exactly what it is (an HR screening assistant), what inputs to use (both job description and resume), what format to return (JSON only, no prose), and what constraints apply (score 1–10, exactly 3 reasons, ignore protected attributes). The user message then supplies the actual job description and resume as clearly labelled sections.

I used `temperature=0.2` to reduce randomness — repeated evaluations of the same resume/JD pair should produce consistent scores, which matters for fairness and auditability. The JSON contract (`{"candidate_name": ..., "score": ..., "reasons": [...]}`) simplifies downstream parsing and avoids brittle regex on free-form text. Reasons are constrained to skills, experience, and role fit to reduce the chance of the model surfacing demographic proxies.

```
You are an HR screening assistant. Evaluate candidate-job fit strictly from supplied text.
Return JSON only in this exact shape:
{"candidate_name":"string","score":"1-10 number","reasons":["reason 1","reason 2","reason 3"]}

Rules:
- Use both the job description and resume.
- Score must be 1 to 10 (decimals allowed).
- Reasons must be concise bullets focused on skills, experience, and role fit.
- Ignore protected attributes (name, gender, ethnicity, location) unless explicitly job-relevant.
```

---

## State Management Decision (Frontend)

I used local component state (`useState` + `useEffect`) instead of a global state library. This application has mostly page-local state: form fields and stream output live only on `/screen`; paginated table rows and the selected detail record live only on `/dashboard`. There is no state that needs to be shared across pages or persisted between navigations beyond the JWT token (stored in `localStorage`). Adding React Query or Zustand for this scope would increase bundle size and cognitive overhead without a meaningful benefit. If requirements expand to cross-page caching, optimistic updates, or real-time collaboration, introducing React Query would be the natural next step.

---

## 500+ Rows Performance Decision

I implemented **server-side pagination** (`PageNumberPagination`, 25 rows per page) rather than virtual scrolling.

For this HR dashboard workflow, users typically review recent screenings in small batches — they are not continuously scrolling through hundreds of records. Server-side pagination reduces initial payload size, database query cost, and render time to a fixed 25-row window regardless of total record count. The tradeoff is that jumping to an arbitrary page requires a network round-trip, but that is acceptable for this use case.

Virtual scrolling keeps all fetched rows in memory and renders only the visible slice, which is better for continuous-scroll exploration (e.g. a social feed). It still requires fetching many records over time and adds significant UI complexity (row height measurement, scroll position management). For a structured HR review workflow, server-side pagination is simpler, more predictable, and easier to maintain.

---

## Edge Case: Inconsistent AI Score Output

Normalisation is handled in **both layers**, with the backend as the source of truth.

- **Backend** (`backend/screenings/ai.py` → `parse_score`): parses values like `"7.3"`, `"Seven"`, or `"7.3/10"` into a clamped `Decimal` (1–10) before writing to the database. This guarantees that every stored `ai_score` is a clean numeric value.
- **Frontend** (`frontend/src/lib/score.ts` → `normalizeScore`): applies the same logic defensively when rendering. This protects the UI from any legacy data or unexpected API values that might bypass backend normalisation.

The backend is the authoritative normaliser because it controls what goes into the database and what the API returns. The frontend normaliser is a safety net, not the primary handler.

---

## Streaming Approach

I used **Server-Sent Events (SSE)** from Django (`StreamingHttpResponse`) on `POST /api/screen/stream/`. The backend streams partial model text chunks and sends a final event containing the persisted application data. The Next.js `/screen` page reads the response stream incrementally using the Fetch Streams API and updates the UI progressively.

Why SSE over WebSockets or Next.js route handlers:
- AI output is one-directional (server → client), so the full duplex overhead of WebSockets is unnecessary.
- SSE works over standard HTTP, requires no additional infrastructure (no Django Channels, no Redis), and is easy to reason about operationally.
- Next.js route handlers would add a proxy hop between the browser and Django with no benefit for this use case.

---

## Bias & Fairness

To detect whether the AI scores candidates differently based on name, university, or location rather than skills, I would run a **controlled counterfactual audit**. The approach is to build a benchmark dataset where resumes are equivalent in skills and experience but vary on sensitive attributes — for example, the same resume submitted with names that signal different genders or ethnicities, different university names (prestigious vs. regional), and different cities. Each profile would be scored multiple times to account for model variance, and score distributions would be compared across groups using mean score gap, pass-rate disparity (percentage above a threshold like 7), and rank-order shifts.

I would also inspect the `reasons` text for proxy signals — for example, if "culture fit" or "communication style" appears disproportionately for certain name patterns, that is a red flag even if the numeric score looks balanced.

For production monitoring, I would log anonymised model inputs, normalised scores, and downstream human decisions (shortlisted / rejected), then build fairness dashboards that alert on score drift by cohort. Statistical tests (e.g. a two-sample t-test on score distributions) should run automatically after any prompt or model change.

To reduce bias, I would combine prompt-level and system-level controls: the system prompt already instructs the model to ignore protected attributes unless job-relevant. I would additionally redact likely sensitive tokens (names, locations) from the resume before inference where feasible, constrain reasons to structured competency categories (skills match, years of experience, domain fit, evidence quality), and add a human-in-the-loop review gate for borderline scores (e.g. 5–7 range). Auto-rejection purely from model output would be prohibited by policy. Prompt versions would be tracked so fairness regressions are detectable and reversible.

---

## Tests

Implemented in `backend/screenings/tests.py`. Run with:

```bash
cd backend
$env:USE_SQLITE="true"   # PowerShell
.venv\Scripts\python -m pytest
```

### Test 1 — `test_screen_candidate_creates_application`

Verifies the full success path: a valid POST to `/api/screen/` calls the AI client, parses the response (including word-form score `"Seven"`), persists a normalised `Decimal("7.00")` score, and returns HTTP 201. This covers correctness of the core feature and the score normalisation fix.

### Test 2 — `test_application_list_is_user_scoped`

Creates one application for the authenticated user and one for a different user, then asserts that `GET /api/applications/` returns exactly one result — the current user's own record. This directly tests the IDOR security fix.

### Test 3 — `test_missing_required_fields_returns_400`

Posts a request with only `resume` (no `job_description`) and asserts HTTP 400 is returned. This tests the input validation fix (Bug 1) and confirms the endpoint does not crash with a 500.

These three tests cover the most critical risks: feature correctness, security isolation, and input validation. They were chosen because a regression in any one of them would either break the product, expose user data, or produce confusing errors for clients.
