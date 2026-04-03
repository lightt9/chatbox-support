import 'dotenv/config';
import * as path from 'path';
import * as fs from 'fs';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as bcrypt from 'bcrypt';
import {
  companies,
  companySchedules,
  companyChannels,
  adminUsers,
  operators,
  teams,
  operatorTeams,
} from '@chatbox/db-schema';
import { eq } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Load .env from the monorepo root if not already set
// ---------------------------------------------------------------------------

if (!process.env.DATABASE_URL) {
  const rootEnvPath = path.resolve(__dirname, '../../../../.env');
  if (fs.existsSync(rootEnvPath)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('dotenv').config({ path: rootEnvPath });
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEMO_COMPANY_NAME = 'ChatBox Demo';
const DEMO_COMPANY_SLUG = 'chatbox-demo';

const ADMIN_EMAIL = 'admin@chatbox.local';
const ADMIN_PASSWORD = 'Admin123!';
const ADMIN_NAME = 'System Admin';
const ADMIN_ROLE = 'super_admin';

const BCRYPT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL is not set. Aborting seed.');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema: { companies, companySchedules, companyChannels, adminUsers, operators, teams, operatorTeams } });

  try {
    // ── 1. Create tables if they don't exist ──────────────────────────────
    console.log('Ensuring tables exist...');
    const sqlPath = path.resolve(__dirname, 'create-tables.sql');
    const createTablesSql = fs.readFileSync(sqlPath, 'utf-8');
    await pool.query(createTablesSql);

    // Run migrations
    for (const migrationFile of ['add-widget-columns.sql', 'add-rbac.sql']) {
      const migrationPath = path.resolve(__dirname, migrationFile);
      if (fs.existsSync(migrationPath)) {
        await pool.query(fs.readFileSync(migrationPath, 'utf-8'));
      }
    }

    // (legacy compat - keep old widget migration block)
    const widgetMigrationPath = path.resolve(__dirname, 'add-widget-columns.sql');
    if (false && fs.existsSync(widgetMigrationPath)) {
      const widgetSql = fs.readFileSync(widgetMigrationPath, 'utf-8');
      await pool.query(widgetSql);
    }
    console.log('  Tables ready.');

    // ── 2. Seed default company ───────────────────────────────────────────
    console.log('Seeding default company...');

    const existingCompany = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, DEMO_COMPANY_SLUG))
      .limit(1);

    let companyId: string;

    if (existingCompany.length > 0) {
      companyId = existingCompany[0].id;
      console.log(`  Company "${DEMO_COMPANY_NAME}" already exists (id: ${companyId}).`);
    } else {
      const [newCompany] = await db
        .insert(companies)
        .values({
          name: DEMO_COMPANY_NAME,
          slug: DEMO_COMPANY_SLUG,
          default_language: 'en',
          timezone: 'UTC',
          plan: 'free',
          max_operators: 5,
          settings: {},
          active: true,
        })
        .returning();

      companyId = newCompany.id;
      console.log(`  Created company "${DEMO_COMPANY_NAME}" (id: ${companyId}).`);
    }

    // ── 3. Seed default schedules (Mon-Fri 9-18, Sat-Sun closed) ─────────
    console.log('Seeding default schedules...');

    const existingSchedules = await db
      .select()
      .from(companySchedules)
      .where(eq(companySchedules.company_id, companyId));

    if (existingSchedules.length > 0) {
      console.log(`  Schedules already exist (${existingSchedules.length} entries). Skipping.`);
    } else {
      const scheduleRows = [
        { company_id: companyId, day_of_week: 0, open_time: '00:00', close_time: '00:00', is_closed: true },  // Sunday
        { company_id: companyId, day_of_week: 1, open_time: '09:00', close_time: '18:00', is_closed: false }, // Monday
        { company_id: companyId, day_of_week: 2, open_time: '09:00', close_time: '18:00', is_closed: false }, // Tuesday
        { company_id: companyId, day_of_week: 3, open_time: '09:00', close_time: '18:00', is_closed: false }, // Wednesday
        { company_id: companyId, day_of_week: 4, open_time: '09:00', close_time: '18:00', is_closed: false }, // Thursday
        { company_id: companyId, day_of_week: 5, open_time: '09:00', close_time: '18:00', is_closed: false }, // Friday
        { company_id: companyId, day_of_week: 6, open_time: '00:00', close_time: '00:00', is_closed: true },  // Saturday
      ];

      await db.insert(companySchedules).values(scheduleRows);
      console.log('  Created 7 schedule entries (Mon-Fri 09:00-18:00, Sat-Sun closed).');
    }

    // ── 4. Seed default web_chat channel ──────────────────────────────────
    console.log('Seeding default channel...');

    const existingChannels = await db
      .select()
      .from(companyChannels)
      .where(eq(companyChannels.company_id, companyId));

    if (existingChannels.length > 0) {
      console.log(`  Channels already exist (${existingChannels.length} entries). Skipping.`);
    } else {
      await db.insert(companyChannels).values({
        company_id: companyId,
        channel_type: 'web_chat',
        enabled: true,
        credentials: {},
        settings: {},
      });
      console.log('  Created default web_chat channel.');
    }

    // ── 5. Seed super_admin user ──────────────────────────────────────────
    console.log('Seeding super_admin user...');

    const existingAdmin = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, ADMIN_EMAIL))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log(`  Admin user "${ADMIN_EMAIL}" already exists. Skipping.`);
    } else {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);

      const [newAdmin] = await db
        .insert(adminUsers)
        .values({
          company_id: companyId,
          email: ADMIN_EMAIL,
          name: ADMIN_NAME,
          password_hash: passwordHash,
          role: ADMIN_ROLE,
          active: true,
        })
        .returning();

      console.log(`  Created super_admin "${ADMIN_EMAIL}" (id: ${newAdmin.id}).`);
    }

    // ── 6. Seed teams ────────────────────────────────────────────────────
    console.log('Seeding teams...');

    const existingTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.company_id, companyId));

    let supportTeamId: string;
    let salesTeamId: string;

    if (existingTeams.length > 0) {
      supportTeamId = existingTeams[0].id;
      salesTeamId = existingTeams[1]?.id ?? existingTeams[0].id;
      console.log(`  Teams already exist (${existingTeams.length} entries). Skipping.`);
    } else {
      const [supportTeam] = await db
        .insert(teams)
        .values({ company_id: companyId, name: 'Support', description: 'Customer support team' })
        .returning();
      const [salesTeam] = await db
        .insert(teams)
        .values({ company_id: companyId, name: 'Sales', description: 'Sales and lead qualification' })
        .returning();
      supportTeamId = supportTeam.id;
      salesTeamId = salesTeam.id;
      console.log('  Created 2 teams (Support, Sales).');
    }

    // ── 7. Seed sample operators ─────────────────────────────────────────
    console.log('Seeding sample operators...');

    const existingOperators = await db
      .select()
      .from(operators)
      .where(eq(operators.company_id, companyId));

    if (existingOperators.length > 0) {
      console.log(`  Operators already exist (${existingOperators.length} entries). Skipping.`);
    } else {
      const operatorPassword = await bcrypt.hash('Operator123!', BCRYPT_ROUNDS);

      const sampleOperators = [
        { name: 'Alice Martinez', email: 'alice@chatbox.local', role: 'admin', status: 'online' },
        { name: 'Bob Wilson', email: 'bob@chatbox.local', role: 'manager', status: 'online' },
        { name: 'Carol Thompson', email: 'carol@chatbox.local', role: 'agent', status: 'away' },
        { name: 'David Lee', email: 'david@chatbox.local', role: 'agent', status: 'offline' },
        { name: 'Eva Nguyen', email: 'eva@chatbox.local', role: 'agent', status: 'online' },
      ];

      const insertedOperators = await db
        .insert(operators)
        .values(
          sampleOperators.map((op) => ({
            company_id: companyId,
            email: op.email,
            name: op.name,
            password_hash: operatorPassword,
            role: op.role,
            status: op.status,
            timezone: 'Europe/Bucharest',
            language: 'en',
            active: true,
          })),
        )
        .returning();

      // Assign teams
      const teamAssignments = [
        { operator_id: insertedOperators[0].id, team_id: supportTeamId },
        { operator_id: insertedOperators[0].id, team_id: salesTeamId },
        { operator_id: insertedOperators[1].id, team_id: supportTeamId },
        { operator_id: insertedOperators[2].id, team_id: supportTeamId },
        { operator_id: insertedOperators[3].id, team_id: salesTeamId },
        { operator_id: insertedOperators[4].id, team_id: supportTeamId },
      ];

      await db.insert(operatorTeams).values(teamAssignments);
      console.log(`  Created ${insertedOperators.length} operators with team assignments.`);
    }

    // ── 8. No demo data ─────────────────────────────────────────────────
    // Conversations, messages, and leads are created by real users via the
    // chat widget and dashboard. No fake/demo data is seeded.
    console.log('Skipping demo data — production mode (real data only).');

    // ── Done ──────────────────────────────────────────────────────────────
    console.log('\nSeed completed successfully!');
    console.log('Summary:');
    console.log(`  Company:  ${DEMO_COMPANY_NAME} (${DEMO_COMPANY_SLUG})`);
    console.log(`  Admin:    ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    console.log(`  Schedule: Mon-Fri 09:00-18:00, Sat-Sun closed`);
    console.log(`  Channel:  web_chat (enabled)`);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('Database connection closed.');
  }
}

seed();
