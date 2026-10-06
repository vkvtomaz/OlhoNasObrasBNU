"""Allow complete official work names.

Revision ID: 0003
Revises: 0002
"""

from alembic import op
import sqlalchemy as sa


revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column(
        "works",
        "name",
        existing_type=sa.String(length=240),
        type_=sa.Text(),
        existing_nullable=False,
    )


def downgrade():
    op.alter_column(
        "works",
        "name",
        existing_type=sa.Text(),
        type_=sa.String(length=240),
        existing_nullable=False,
    )
