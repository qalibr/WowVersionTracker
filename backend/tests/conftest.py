import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.database import get_session
from app.models import User

# Use an in-memory SQLite database for tests.
# StaticPool ensures connections aren't shared across threads incorrectly during tests.
sqlite_url = "sqlite://"
engine = create_engine(
    sqlite_url, connect_args={"check_same_thread": False}, poolclass=StaticPool
)


@pytest.fixture(name="session")
def session_fixture():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session

    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture(name="mock_user")
def mock_user_fixture(session: Session):
    user = User(github_id=1234567, username="TestAddonDev", email="dev@example.com")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
