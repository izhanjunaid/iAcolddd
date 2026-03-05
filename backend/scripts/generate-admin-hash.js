
const bcrypt = require('bcrypt');

async function run() {
    try {
        const hash = await bcrypt.hash('Admin@123', 10);
        console.log('HASH:' + hash);
    } catch (e) {
        console.error(e);
    }
}
run();
