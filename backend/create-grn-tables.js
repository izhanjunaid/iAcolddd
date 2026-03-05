const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'admin',
  password: 'admin123',
  database: 'advance_erp',
});

async function run() {
  await client.connect();

  try {
    console.log('--- Debugging Schema ---');

    // Check column type
    const resCol = await client.query(`
        SELECT column_name, data_type, udt_name 
        FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' AND column_name = 'status';
    `);
    console.log('Column Info:', resCol.rows);

    // List all enums
    const resEnums = await client.query(`
        SELECT t.typname
        FROM pg_type t
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typtype = 'e';
    `);
    console.log('Existing Enums:', resEnums.rows.map(r => r.typname));

    // Based on findings, try to update
    const udtName = resCol.rows[0]?.udt_name;
    if (udtName) {
      console.log(`Attempting to update enum: ${udtName}`);
      try {
        await client.query(`ALTER TYPE "public"."${udtName}" ADD VALUE IF NOT EXISTS 'PARTIALLY_RECEIVED';`);
        console.log('✅ Updated enum successfully.');
      } catch (e) {
        console.log(`❌ Failed to update enum ${udtName}:`, e.message);
      }
    } else {
      console.log('❌ Could not find status column or UDT.');
    }

    // 2. Create GRN Status enum
    console.log('Creating grn_status enum...');
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."grn_status_enum" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 3. Create goods_receipt_notes table
    console.log('Creating goods_receipt_notes table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "goods_receipt_notes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "grn_number" character varying(50) NOT NULL,
        "purchase_order_id" uuid NOT NULL,
        "vendor_id" uuid NOT NULL,
        "receipt_date" date NOT NULL,
        "status" "public"."grn_status_enum" NOT NULL DEFAULT 'DRAFT',
        "total_amount" numeric(18,2) NOT NULL DEFAULT '0',
        "notes" text,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
        "updated_by" uuid,
        CONSTRAINT "PK_goods_receipt_notes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_goods_receipt_notes_grn_number" UNIQUE ("grn_number")
      );
    `);

    // 4. Create goods_receipt_note_items table
    console.log('Creating goods_receipt_note_items table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "goods_receipt_note_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "goods_receipt_note_id" uuid NOT NULL,
        "purchase_order_item_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "description" character varying(255) NOT NULL,
        "ordered_quantity" numeric(18,4) NOT NULL,
        "received_quantity" numeric(18,4) NOT NULL,
        "unit_price" numeric(18,4) NOT NULL,
        "total_amount" numeric(18,2) NOT NULL,
        "warehouse_id" uuid,
        "room_id" uuid,
        "lot_number" character varying(50),
        "expiry_date" date,
        CONSTRAINT "PK_goods_receipt_note_items" PRIMARY KEY ("id")
      );
    `);

    // 5. Add Foreign Keys
    console.log('Adding Foreign Keys...');
    // GRN -> PO
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "FK_grn_po" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    // GRN -> Vendor
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "FK_grn_vendor" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    // GRN Item -> GRN
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE "goods_receipt_note_items" ADD CONSTRAINT "FK_grn_item_grn" FOREIGN KEY ("goods_receipt_note_id") REFERENCES "goods_receipt_notes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    // GRN Item -> PO Item
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE "goods_receipt_note_items" ADD CONSTRAINT "FK_grn_item_po_item" FOREIGN KEY ("purchase_order_item_id") REFERENCES "purchase_order_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    // GRN Item -> Inventory Item
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE "goods_receipt_note_items" ADD CONSTRAINT "FK_grn_item_inv_item" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    console.log('✅ Tables created successfully!');

  } catch (err) {
    console.error('❌ Error creating tables:', err);
  } finally {
    await client.end();
  }
}

run();
