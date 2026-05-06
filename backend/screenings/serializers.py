from rest_framework import serializers

from .models import Application


class ApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = [
            "id",
            "job_description",
            "resume",
            "candidate_name",
            "ai_score",
            "ai_reasons",
            "ai_raw_response",
            "created_at",
        ]
        read_only_fields = ["id", "ai_score", "ai_reasons", "ai_raw_response", "created_at"]


class ApplicationListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = ["id", "candidate_name", "ai_score", "created_at", "ai_reasons"]
