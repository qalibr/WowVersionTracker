from app.models import User, UserUiSelection


def test_health_check(client):
    response = client.get("/api/v1/status")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "message": "API is running."}


def test_mock_user_exists(session, mock_user):
    db_user = session.get(User, mock_user.id)
    assert db_user is not None
    assert db_user.username == "TestAddonDev"


def test_user_ui_selection(session, mock_user):
    selection = UserUiSelection(
        user_id=mock_user.id, product="wow_classic", is_selected=True
    )
    session.add(selection)
    session.commit()

    # Retrieve it
    saved_selection = session.get(UserUiSelection, (mock_user.id, "wow_classic"))
    assert saved_selection is not None
    assert saved_selection.is_selected is True
