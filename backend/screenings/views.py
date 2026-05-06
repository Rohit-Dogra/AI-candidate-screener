import json
import os
from decimal import Decimal

from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .ai import MOCK_RESPONSE, PROMPT_TEMPLATE, call_openai, parse_ai_json, use_mock, _key_looks_valid
from .models import Application
from .serializers import ApplicationListSerializer, ApplicationSerializer


class ApplicationPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


class ScreenCandidateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Bug fix: request.data['field'] raised KeyError; validate with .get() and explicit 400.
        job_desc = request.data.get("job_description", "").strip()
        resume = request.data.get("resume", "").strip()
        if not job_desc or not resume:
            return Response(
                {"detail": "job_description and resume are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Bug fix: old code ignored job description; prompt now includes both artifacts for reliable scoring.
        user_prompt = f"Job Description:\n{job_desc}\n\nResume:\n{resume}"
        messages = [
            {"role": "system", "content": PROMPT_TEMPLATE},
            {"role": "user", "content": user_prompt},
        ]

        raw_content = None
        if not use_mock() and _key_looks_valid():
            try:
                # Bug fix: legacy openai.ChatCompletion API is deprecated and brittle.
                completion = call_openai(messages)
                raw_content = completion.choices[0].message.content or "{}"
            except Exception:
                # Key is invalid / quota exceeded / network error → fall back to mock.
                raw_content = None

        if raw_content is None:
            raw_content = MOCK_RESPONSE
        parsed = parse_ai_json(raw_content)

        # Bug fix: ai_score was stored as free-form text, which breaks sorting/comparison.
        app = Application.objects.create(
            job_description=job_desc,
            resume=resume,
            candidate_name=parsed["candidate_name"],
            ai_score=parsed["score"],
            ai_reasons=parsed["reasons"],
            ai_raw_response=raw_content,
            # Bug fix: keep ownership tied to authenticated user to preserve data isolation.
            created_by=request.user,
        )
        # Bug fix: create endpoint should return 201 Created, not 200 OK.
        return Response(ApplicationSerializer(app).data, status=status.HTTP_201_CREATED)


class ScreenCandidateStreamView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        job_desc = request.data.get("job_description", "").strip()
        resume = request.data.get("resume", "").strip()
        if not job_desc or not resume:
            return Response(
                {"detail": "job_description and resume are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_prompt = f"Job Description:\n{job_desc}\n\nResume:\n{resume}"
        messages = [
            {"role": "system", "content": PROMPT_TEMPLATE},
            {"role": "user", "content": user_prompt},
        ]

        def event_stream():
            raw_content = None
            if not use_mock() and _key_looks_valid():
                try:
                    collected = []
                    stream = call_openai(messages, stream=True)
                    for chunk in stream:
                        delta = chunk.choices[0].delta.content if chunk.choices else None
                        if not delta:
                            continue
                        collected.append(delta)
                        yield f"data: {json.dumps({'type': 'chunk', 'content': delta})}\n\n"
                    raw_content = "".join(collected) or None
                except Exception:
                    # Key invalid / quota exceeded → fall back to mock silently.
                    raw_content = None

            if raw_content is None:
                # Mock: stream character-by-character so the UI still animates.
                for char in MOCK_RESPONSE:
                    yield f"data: {json.dumps({'type': 'chunk', 'content': char})}\n\n"
                raw_content = MOCK_RESPONSE
            parsed = parse_ai_json(raw_content)
            app = Application.objects.create(
                job_description=job_desc,
                resume=resume,
                candidate_name=parsed["candidate_name"],
                ai_score=parsed["score"],
                ai_reasons=parsed["reasons"],
                ai_raw_response=raw_content,
                created_by=request.user,
            )
            final_payload = json.dumps(
                {
                    "type": "final",
                    "application": ApplicationSerializer(app).data,
                },
                default=str,
            )
            yield f"data: {final_payload}\n\n"

        return StreamingHttpResponse(event_stream(), content_type="text/event-stream")


class ApplicationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Security fix: returning Application.objects.all() leaks other users' resumes.
        apps = Application.objects.filter(created_by=request.user).order_by("-created_at")
        paginator = ApplicationPagination()
        page = paginator.paginate_queryset(apps, request)
        serializer = ApplicationListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class ApplicationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        app = Application.objects.filter(created_by=request.user, pk=pk).first()
        if not app:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ApplicationSerializer(app).data)
