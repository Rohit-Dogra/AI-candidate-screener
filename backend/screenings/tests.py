from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from .models import Application


User = get_user_model()


class ScreeningApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="hr1", password="pass12345")
        self.other_user = User.objects.create_user(username="hr2", password="pass12345")
        token_resp = self.client.post(
            reverse("token_obtain_pair"), {"username": "hr1", "password": "pass12345"}
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_resp.data['access']}")

    @patch("screenings.views.get_client")
    def test_screen_candidate_creates_application(self, mock_get_client):
        mocked_completion = type(
            "Completion",
            (),
            {
                "choices": [
                    type(
                        "Choice",
                        (),
                        {
                            "message": type(
                                "Message",
                                (),
                                {
                                    "content": '{"candidate_name":"Ari","score":"Seven","reasons":["Good Python","REST experience","Matches years"]}'
                                },
                            )()
                        },
                    )()
                ]
            },
        )()
        mock_get_client.return_value.chat.completions.create.return_value = mocked_completion
        response = self.client.post(
            reverse("screen-candidate"),
            {
                "job_description": "Need Python and APIs",
                "resume": "Ari has 5 years building Django APIs.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Application.objects.count(), 1)
        self.assertEqual(Application.objects.first().ai_score, Decimal("7.00"))

    def test_application_list_is_user_scoped(self):
        Application.objects.create(
            job_description="JD",
            resume="resume one",
            candidate_name="A",
            ai_score=Decimal("8.00"),
            ai_reasons=["r1", "r2", "r3"],
            ai_raw_response="{}",
            created_by=self.user,
        )
        Application.objects.create(
            job_description="JD2",
            resume="resume two",
            candidate_name="B",
            ai_score=Decimal("9.00"),
            ai_reasons=["r1", "r2", "r3"],
            ai_raw_response="{}",
            created_by=self.other_user,
        )
        response = self.client.get(reverse("application-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["candidate_name"], "A")

    def test_missing_required_fields_returns_400(self):
        response = self.client.post(reverse("screen-candidate"), {"resume": "only resume"}, format="json")
        self.assertEqual(response.status_code, 400)
