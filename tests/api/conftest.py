"""Test configuration for API tests.

Restricts anyio to the asyncio backend only (trio is not installed).
"""
import pytest


@pytest.fixture(params=["asyncio"])
def anyio_backend():
    return "asyncio"
