

# from __future__ import annotations
# import uuid
# from datetime import datetime, timezone
# from sqlalchemy import String, Text, DateTime, text
# from sqlalchemy.orm import Mapped, mapped_column, relationship
# from .database import Base, engine
# from typing import Optional

# class Article(Base):
#     __tablename__ = "articles"

#     id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
#     url: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
#     title: Mapped[str] = mapped_column(Text, nullable=False)
#     summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # <-- Added summary column
#     body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
#     source_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
#     source_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
#     published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
#     scraped_at: Mapped[datetime] = mapped_column(
#         DateTime(timezone=True),
#         default=lambda: datetime.now(timezone.utc),
#     )

#     risk_scores: Mapped[list["RiskScore"]] = relationship(  # noqa: F821
#         "RiskScore", back_populates="article", cascade="all, delete-orphan"
#     )
#     alerts: Mapped[list["Alert"]] = relationship(  # noqa: F821
#         "Alert", back_populates="article", cascade="all, delete-orphan"
#     )


# # Safe in-place migration for existing databases without 'summary' column
# def _ensure_summary_column_exists():
#     try:
#         with engine.connect() as conn:
#             conn.execute(text("ALTER TABLE articles ADD COLUMN summary TEXT;"))
#             conn.commit()
#     except Exception:
#         pass  # Column already exists

# _ensure_summary_column_exists()




from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base, engine
from typing import Optional


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    url: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # "So what?" analyst view, stored as a JSON string (see so_what_service.py)
    analysis: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    source_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    scraped_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    risk_scores: Mapped[list["RiskScore"]] = relationship(  # noqa: F821
        "RiskScore", back_populates="article", cascade="all, delete-orphan"
    )
    alerts: Mapped[list["Alert"]] = relationship(  # noqa: F821
        "Alert", back_populates="article", cascade="all, delete-orphan"
    )


# Safe in-place migration for existing databases that predate a column.
# Each column is added in its own try/except so one failure can't block the others.
def _ensure_column_exists(column_ddl: str) -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE articles ADD COLUMN {column_ddl};"))
            conn.commit()
    except Exception:
        pass  # Column already exists


_ensure_column_exists("summary TEXT")
_ensure_column_exists("analysis TEXT")
