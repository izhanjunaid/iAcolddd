import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePurchaseOrdersTables20260214170000
  implements MigrationInterface
{
  name = 'CreatePurchaseOrdersTables20260214170000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create purchase_orders table
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "purchase_orders" (
                "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                "po_number" VARCHAR(50) NOT NULL,
                "vendor_id" UUID NOT NULL,
                "order_date" DATE NOT NULL,
                "expected_delivery_date" DATE,
                "status" VARCHAR NOT NULL DEFAULT 'DRAFT',
                "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
                "notes" TEXT,
                "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "created_by" UUID,
                "updated_by" UUID,
                CONSTRAINT "pk_purchase_orders" PRIMARY KEY ("id"),
                CONSTRAINT "uq_purchase_orders_number" UNIQUE ("po_number"),
                CONSTRAINT "fk_purchase_orders_vendor" FOREIGN KEY ("vendor_id") REFERENCES "vendors" ("id"),
                CONSTRAINT "fk_purchase_orders_created_by" FOREIGN KEY ("created_by") REFERENCES "users" ("id"),
                CONSTRAINT "fk_purchase_orders_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users" ("id")
            )
        `);

    // Create purchase_order_items table
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "purchase_order_items" (
                "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                "purchase_order_id" UUID NOT NULL,
                "item_id" UUID NOT NULL,
                "description" VARCHAR(255) NOT NULL,
                "quantity" DECIMAL(18,4) NOT NULL,
                "unit_price" DECIMAL(18,4) NOT NULL,
                "total_amount" DECIMAL(18,2) NOT NULL,
                CONSTRAINT "pk_purchase_order_items" PRIMARY KEY ("id"),
                CONSTRAINT "fk_po_items_order" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders" ("id") ON DELETE CASCADE,
                CONSTRAINT "fk_po_items_item" FOREIGN KEY ("item_id") REFERENCES "inventory_items" ("id")
            )
        `);

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "idx_purchase_orders_vendor" ON "purchase_orders" ("vendor_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_purchase_orders_status" ON "purchase_orders" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_po_items_order" ON "purchase_order_items" ("purchase_order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_po_items_item" ON "purchase_order_items" ("item_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_order_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_orders"`);
  }
}
