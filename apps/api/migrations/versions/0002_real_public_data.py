"""allow unknown public fields and mark records as real by default"""

from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("works") as batch:
        batch.add_column(sa.Column("source_code", sa.String(40), nullable=True))
        batch.create_unique_constraint("uq_works_source_code", ["source_code"])
        for column in (
            "initial_value",
            "current_value",
            "paid_value",
            "physical_progress",
            "financial_progress",
        ):
            batch.alter_column(column, existing_type=sa.Numeric(14, 2) if "value" in column else sa.Float(), nullable=True)
        batch.alter_column("is_demo", server_default=sa.false())


def downgrade():
    op.execute("UPDATE works SET initial_value = 0 WHERE initial_value IS NULL")
    op.execute("UPDATE works SET current_value = 0 WHERE current_value IS NULL")
    op.execute("UPDATE works SET paid_value = 0 WHERE paid_value IS NULL")
    op.execute("UPDATE works SET physical_progress = 0 WHERE physical_progress IS NULL")
    op.execute("UPDATE works SET financial_progress = 0 WHERE financial_progress IS NULL")
    with op.batch_alter_table("works") as batch:
        batch.drop_constraint("uq_works_source_code", type_="unique")
        batch.drop_column("source_code")
        for column in (
            "initial_value",
            "current_value",
            "paid_value",
            "physical_progress",
            "financial_progress",
        ):
            batch.alter_column(column, existing_type=sa.Numeric(14, 2) if "value" in column else sa.Float(), nullable=False)
        batch.alter_column("is_demo", server_default=sa.true())
