const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'advance_erp',
  user: 'admin',
  password: 'admin123'
});

client.connect()
  .then(() => {
    console.log('✅ PostgreSQL connection successful!');
    return client.query('SELECT version();');
  })
  .then(result => {
    console.log('Database version:', result.rows[0].version);
    return client.end();
  })
  .catch(err => {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  });
