import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateColdStoreModule20260218190000 implements MigrationInterface {
  name = 'CreateColdStoreModule20260218190000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── 1. ENUMS ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "cold_store_lot_status" AS ENUM (
          'IN_STORAGE', 'PARTIALLY_RELEASED', 'RELEASED', 'CANCELLED'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "billing_unit_type" AS ENUM ('PER_BAG', 'PER_KG');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "gate_pass_status" AS ENUM ('DRAFT', 'APPROVED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "rental_cycle_status" AS ENUM ('ACTIVE', 'CLOSED', 'INVOICED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    // ─── 2. cold_store_lots ──────────────────────────────────────────────────
    // One row per customer batch. Tracks physical custody — NO financial ownership.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cold_store_lots" (
        "id"                        UUID          NOT NULL DEFAULT gen_random_uuid(),
        "lot_number"                VARCHAR(30)   NOT NULL,
        "customer_id"               UUID          NOT NULL,
        "commodity"                 VARCHAR(100)  NOT NULL,
        "variety"                   VARCHAR(100),
        "chamber_id"                UUID,
        "bags_in"                   INTEGER       NOT NULL DEFAULT 0,
        "bags_out"                  INTEGER       NOT NULL DEFAULT 0,
        "gross_weight_kg"           DECIMAL(18,3) NOT NULL DEFAULT 0,
        "tare_weight_kg"            DECIMAL(18,3) NOT NULL DEFAULT 0,
        "net_weight_kg"             DECIMAL(18,3) NOT NULL DEFAULT 0,
        "inward_date"               DATE          NOT NULL,
        "outward_date"              DATE,
        "billing_start_date"        DATE          NOT NULL,
        "status"                    "cold_store_lot_status" NOT NULL DEFAULT 'IN_STORAGE',
        "billing_unit"              "billing_unit_type" NOT NULL DEFAULT 'PER_BAG',
        "rate_per_bag_per_season"   DECIMAL(10,2),
        "rate_per_kg_per_day"       DECIMAL(10,4),
        "notes"                     TEXT,
        "created_by"                UUID,
        "updated_by"                UUID,
        "created_at"                TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"                TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_cold_store_lots"         PRIMARY KEY ("id"),
        CONSTRAINT "uq_cold_store_lots_number"  UNIQUE ("lot_number"),
        CONSTRAINT "fk_csl_customer"            FOREIGN KEY ("customer_id") REFERENCES "customers" ("id"),
        CONSTRAINT "fk_csl_chamber"             FOREIGN KEY ("chamber_id")  REFERENCES "rooms" ("id"),
        CONSTRAINT "fk_csl_created_by"          FOREIGN KEY ("created_by")  REFERENCES "users" ("id"),
        CONSTRAINT "fk_csl_updated_by"          FOREIGN KEY ("updated_by")  REFERENCES "users" ("id"),
        CONSTRAINT "chk_csl_bags_out"           CHECK ("bags_out" <= "bags_in"),
        CONSTRAINT "chk_csl_net_weight"         CHECK ("net_weight_kg" >= 0)
      )
    `);

    // ─── 3. gate_passes_inward ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "gate_passes_inward" (
        "id"                  UUID          NOT NULL DEFAULT gen_random_uuid(),
        "gate_pass_number"    VARCHAR(30)   NOT NULL,
        "lot_id"              UUID,
        "customer_id"         UUID          NOT NULL,
        "commodity"           VARCHAR(100)  NOT NULL,
        "variety"             VARCHAR(100),
        "chamber_id"          UUID,
        "vehicle_number"      VARCHAR(50),
        "driver_name"         VARCHAR(100),
        "bags_received"       INTEGER       NOT NULL DEFAULT 0,
        "gross_weight_kg"     DECIMAL(18,3) NOT NULL DEFAULT 0,
        "tare_weight_kg"      DECIMAL(18,3) NOT NULL DEFAULT 0,
        "net_weight_kg"       DECIMAL(18,3) NOT NULL DEFAULT 0,
        "billing_unit"        "billing_unit_type" NOT NULL DEFAULT 'PER_BAG',
        "rate_per_bag_per_season" DECIMAL(10,2),
        "rate_per_kg_per_day"     DECIMAL(10,4),
        "inward_date"         DATE          NOT NULL,
        "status"              "gate_pass_status" NOT NULL DEFAULT 'DRAFT',
        "approved_by"         UUID,
        "approved_at"         TIMESTAMPTZ,
        "notes"               TEXT,
        "created_by"          UUID,
        "created_at"          TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_gate_passes_inward"        PRIMARY KEY ("id"),
        CONSTRAINT "uq_gate_passes_inward_number" UNIQUE ("gate_pass_number"),
        CONSTRAINT "fk_gpi_lot"                   FOREIGN KEY ("lot_id")       REFERENCES "cold_store_lots" ("id"),
        CONSTRAINT "fk_gpi_customer"              FOREIGN KEY ("customer_id")  REFERENCES "customers" ("id"),
        CONSTRAINT "fk_gpi_chamber"               FOREIGN KEY ("chamber_id")   REFERENCES "rooms" ("id"),
        CONSTRAINT "fk_gpi_approved_by"           FOREIGN KEY ("approved_by")  REFERENCES "users" ("id"),
        CONSTRAINT "fk_gpi_created_by"            FOREIGN KEY ("created_by")   REFERENCES "users" ("id")
      )
    `);

    // ─── 4. gate_passes_outward ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "gate_passes_outward" (
        "id"                  UUID          NOT NULL DEFAULT gen_random_uuid(),
        "gate_pass_number"    VARCHAR(30)   NOT NULL,
        "lot_id"              UUID          NOT NULL,
        "customer_id"         UUID          NOT NULL,
        "vehicle_number"      VARCHAR(50),
        "driver_name"         VARCHAR(100),
        "bags_released"       INTEGER       NOT NULL DEFAULT 0,
        "gross_weight_kg"     DECIMAL(18,3) NOT NULL DEFAULT 0,
        "tare_weight_kg"      DECIMAL(18,3) NOT NULL DEFAULT 0,
        "net_weight_kg"       DECIMAL(18,3) NOT NULL DEFAULT 0,
        "outward_date"        DATE          NOT NULL,
        "status"              "gate_pass_status" NOT NULL DEFAULT 'DRAFT',
        "invoice_id"          UUID,
        "approved_by"         UUID,
        "approved_at"         TIMESTAMPTZ,
        "notes"               TEXT,
        "created_by"          UUID,
        "created_at"          TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_gate_passes_outward"        PRIMARY KEY ("id"),
        CONSTRAINT "uq_gate_passes_outward_number" UNIQUE ("gate_pass_number"),
        CONSTRAINT "fk_gpo_lot"                    FOREIGN KEY ("lot_id")      REFERENCES "cold_store_lots" ("id"),
        CONSTRAINT "fk_gpo_customer"               FOREIGN KEY ("customer_id") REFERENCES "customers" ("id"),
        CONSTRAINT "fk_gpo_approved_by"            FOREIGN KEY ("approved_by") REFERENCES "users" ("id"),
        CONSTRAINT "fk_gpo_created_by"             FOREIGN KEY ("created_by")  REFERENCES "users" ("id")
      )
    `);

    // ─── 5. rental_billing_cycles ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rental_billing_cycles" (
        "id"                    UUID          NOT NULL DEFAULT gen_random_uuid(),
        "lot_id"                UUID          NOT NULL,
        "customer_id"           UUID          NOT NULL,
        "billing_start_date"    DATE          NOT NULL,
        "billing_end_date"      DATE,
        "days_stored"           INTEGER,
        "bags_billed"           INTEGER,
        "weight_billed_kg"      DECIMAL(18,3),
        "rate_applied"          DECIMAL(10,4) NOT NULL DEFAULT 0,
        "billing_unit"          "billing_unit_type" NOT NULL DEFAULT 'PER_BAG',
        "storage_charges"       DECIMAL(18,2) NOT NULL DEFAULT 0,
        "handling_charges_in"   DECIMAL(18,2) NOT NULL DEFAULT 0,
        "handling_charges_out"  DECIMAL(18,2) NOT NULL DEFAULT 0,
        "other_charges"         DECIMAL(18,2) NOT NULL DEFAULT 0,
        "subtotal"              DECIMAL(18,2) NOT NULL DEFAULT 0,
        "gst_amount"            DECIMAL(18,2) NOT NULL DEFAULT 0,
        "wht_amount"            DECIMAL(18,2) NOT NULL DEFAULT 0,
        "total_amount"          DECIMAL(18,2) NOT NULL DEFAULT 0,
        "status"                "rental_cycle_status" NOT NULL DEFAULT 'ACTIVE',
        "invoice_id"            UUID,
        "outward_gate_pass_id"  UUID,
        "notes"                 TEXT,
        "created_at"            TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_rental_billing_cycles"  PRIMARY KEY ("id"),
        CONSTRAINT "fk_rbc_lot"                FOREIGN KEY ("lot_id")      REFERENCES "cold_store_lots" ("id"),
        CONSTRAINT "fk_rbc_customer"           FOREIGN KEY ("customer_id") REFERENCES "customers" ("id")
      )
    `);

    // ─── 6. kandari_records (weighing) ───────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "kandari_records" (
        "id"                UUID          NOT NULL DEFAULT gen_random_uuid(),
        "lot_id"            UUID          NOT NULL,
        "record_type"       VARCHAR(10)   NOT NULL DEFAULT 'INWARD',
        "weigh_date"        DATE          NOT NULL,
        "gross_weight_kg"   DECIMAL(18,3) NOT NULL DEFAULT 0,
        "tare_weight_kg"    DECIMAL(18,3) NOT NULL DEFAULT 0,
        "net_weight_kg"     DECIMAL(18,3) NOT NULL DEFAULT 0,
        "bags_weighed"      INTEGER,
        "weighbridge_id"    VARCHAR(50),
        "notes"             TEXT,
        "created_by"        UUID,
        "created_at"        TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_kandari_records"   PRIMARY KEY ("id"),
        CONSTRAINT "fk_kr_lot"            FOREIGN KEY ("lot_id")      REFERENCES "cold_store_lots" ("id"),
        CONSTRAINT "fk_kr_created_by"     FOREIGN KEY ("created_by")  REFERENCES "users" ("id"),
        CONSTRAINT "chk_kr_record_type"   CHECK ("record_type" IN ('INWARD', 'OUTWARD', 'PERIODIC'))
      )
    `);

    // ─── 7. bardana_records (empty bag tracking) ─────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bardana_records" (
        "id"              UUID          NOT NULL DEFAULT gen_random_uuid(),
        "lot_id"          UUID          NOT NULL,
        "record_type"     VARCHAR(10)   NOT NULL DEFAULT 'RECEIVED',
        "record_date"     DATE          NOT NULL,
        "bag_type"        VARCHAR(50)   NOT NULL DEFAULT 'GUNNY',
        "bags_count"      INTEGER       NOT NULL DEFAULT 0,
        "notes"           TEXT,
        "created_by"      UUID,
        "created_at"      TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_bardana_records"   PRIMARY KEY ("id"),
        CONSTRAINT "fk_br_lot"            FOREIGN KEY ("lot_id")      REFERENCES "cold_store_lots" ("id"),
        CONSTRAINT "fk_br_created_by"     FOREIGN KEY ("created_by")  REFERENCES "users" ("id"),
        CONSTRAINT "chk_br_record_type"   CHECK ("record_type" IN ('RECEIVED', 'RETURNED', 'DEDUCTED'))
      )
    `);

    // ─── 8. INDEXES ──────────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE INDEX "idx_csl_customer"       ON "cold_store_lots"       ("customer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_csl_chamber"        ON "cold_store_lots"       ("chamber_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_csl_status"         ON "cold_store_lots"       ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_csl_inward_date"    ON "cold_store_lots"       ("inward_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_gpi_customer"       ON "gate_passes_inward"    ("customer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_gpi_status"         ON "gate_passes_inward"    ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_gpo_lot"            ON "gate_passes_outward"   ("lot_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_gpo_status"         ON "gate_passes_outward"   ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_rbc_lot"            ON "rental_billing_cycles" ("lot_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_rbc_status"         ON "rental_billing_cycles" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_kr_lot"             ON "kandari_records"       ("lot_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_br_lot"             ON "bardana_records"       ("lot_id")`,
    );

    // ─── 9. SEQUENCE for lot/gate-pass numbers ───────────────────────────────
    // sequences table uses: key (PK varchar), value (int), version (int)
    const year = new Date().getFullYear();
    await queryRunner.query(`
      INSERT INTO "sequences" ("key", "value", "version")
      VALUES ('LOT-${year}', 0, 1)
      ON CONFLICT ("key") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "sequences" ("key", "value", "version")
      VALUES ('GPI-${year}', 0, 1)
      ON CONFLICT ("key") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "sequences" ("key", "value", "version")
      VALUES ('GPO-${year}', 0, 1)
      ON CONFLICT ("key") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "bardana_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "kandari_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rental_billing_cycles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "gate_passes_outward"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "gate_passes_inward"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cold_store_lots"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rental_cycle_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "gate_pass_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "billing_unit_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "cold_store_lot_status"`);
    await queryRunner.query(
      `DELETE FROM "sequences" WHERE "name" IN ('cold_store_lot', 'gate_pass_inward', 'gate_pass_outward')`,
    );
  }
}
