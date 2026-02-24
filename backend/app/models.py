from typing import Optional, List
from datetime import datetime, timezone
from sqlmodel import Field, SQLModel, Relationship


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    github_id: int = Field(unique=True, index=True)
    username: str
    email: Optional[str] = None
    github_access_token: Optional[str] = None  # TODO encrypt this 
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    tracked_repos: List["TrackedRepo"] = Relationship(back_populates="user")
    ui_selections: List["UserUiSelection"] = Relationship(back_populates="user")


class TrackedRepo(SQLModel, table=True):
    __tablename__ = "tracked_repos"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    repo_full_name: str
    toc_file_path: str
    last_checked_at: Optional[datetime] = None

    user: Optional[User] = Relationship(back_populates="tracked_repos")


class WowVersion(SQLModel, table=True):
    __tablename__ = "wow_versions"

    id: Optional[int] = Field(default=None, primary_key=True)
    product: str = Field(index=True)
    region: str = Field(index=True)
    version_name: str
    build_id: str
    build_config: str
    discovered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserUiSelection(SQLModel, table=True):
    __tablename__ = "user_ui_selections"

    user_id: int = Field(foreign_key="users.id", primary_key=True)
    product: str = Field(primary_key=True)
    is_selected: bool = Field(default=False)

    user: Optional[User] = Relationship(back_populates="ui_selections")
