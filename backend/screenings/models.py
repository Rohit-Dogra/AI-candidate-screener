from django.conf import settings
from django.db import models


class Application(models.Model):
    job_description = models.TextField()
    resume = models.TextField()
    candidate_name = models.CharField(max_length=255, blank=True)
    ai_score = models.DecimalField(max_digits=4, decimal_places=2)
    ai_reasons = models.JSONField(default=list)
    ai_raw_response = models.TextField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
