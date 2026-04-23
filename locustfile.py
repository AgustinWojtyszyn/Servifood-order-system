import os

from locust import HttpUser, between, task


class MyUser(HttpUser):
    host = os.getenv("LOCUST_HOST", "http://localhost:3000")
    wait_time = between(1, 3)

    default_headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    @task
    def home(self):
        self.client.get("/", headers=self.default_headers)

    @task
    def login(self):
        payload = {
            "username": "test",
            "password": "test",
        }
        self.client.post("/login", json=payload, headers=self.default_headers)
