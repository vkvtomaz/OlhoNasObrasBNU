"""initial citizen portal schema"""
from alembic import op
import sqlalchemy as sa
revision = "0001"
down_revision = None
branch_labels = None
depends_on = None
def upgrade():
    op.create_table("works",
        sa.Column("id", sa.Integer(), primary_key=True), sa.Column("slug", sa.String(160), unique=True, nullable=False),
        sa.Column("name", sa.String(240), nullable=False), sa.Column("purpose", sa.Text(), nullable=False),
        sa.Column("neighborhood", sa.String(120), nullable=False), sa.Column("official_status", sa.String(60), nullable=False),
        sa.Column("calculated_status", sa.String(120), nullable=False), sa.Column("initial_value", sa.Numeric(14,2), nullable=False),
        sa.Column("current_value", sa.Numeric(14,2), nullable=False), sa.Column("paid_value", sa.Numeric(14,2), nullable=False),
        sa.Column("physical_progress", sa.Float(), nullable=False), sa.Column("financial_progress", sa.Float(), nullable=False),
        sa.Column("contract_date", sa.Date(), nullable=True), sa.Column("start_effective", sa.Date(), nullable=True),
        sa.Column("original_end", sa.Date(), nullable=True), sa.Column("updated_end", sa.Date(), nullable=True),
        sa.Column("completion_real", sa.Date(), nullable=True), sa.Column("mandate_start", sa.Integer(), nullable=True),
        sa.Column("mandate_end", sa.Integer(), nullable=True), sa.Column("inherited", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False), sa.Column("source_name", sa.String(120), nullable=False),
        sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.create_table("contracts", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("work_id", sa.Integer(), sa.ForeignKey("works.id"), nullable=False), sa.Column("number", sa.String(80), nullable=False), sa.Column("contractor", sa.String(180), nullable=False))
    op.create_table("documents", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("work_id", sa.Integer(), sa.ForeignKey("works.id"), nullable=False), sa.Column("title", sa.String(200), nullable=False), sa.Column("kind", sa.String(80), nullable=False), sa.Column("source_url", sa.String(500), nullable=True), sa.Column("sha256", sa.String(64), nullable=True))
    op.create_table("changes", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("work_id", sa.Integer(), sa.ForeignKey("works.id"), nullable=False), sa.Column("field", sa.String(80), nullable=False), sa.Column("old_value", sa.String(240), nullable=True), sa.Column("new_value", sa.String(240), nullable=True), sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False))
    op.create_table("contacts", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("protocol", sa.String(40), unique=True, nullable=False), sa.Column("name", sa.String(120), nullable=False), sa.Column("email", sa.String(180), nullable=False), sa.Column("category", sa.String(80), nullable=False), sa.Column("subject", sa.String(180), nullable=False), sa.Column("message", sa.Text(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
def downgrade():
    for table in ("contacts", "changes", "documents", "contracts", "works"):
        op.drop_table(table)
