// Helper script to generate bcrypt password hash
// Run this script to create a password hash for users.json

const bcrypt = require('bcrypt');

const password = 'password123'; // Change this to your desired password
const saltRounds = 10;

console.log('Generating password hash...');
console.log('Password:', password);
console.log('');

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }
  
  console.log('✓ Hash generated successfully!');
  console.log('');
  console.log('Copy this hash to users.json:');
  console.log('----------------------------------------');
  console.log(hash);
  console.log('----------------------------------------');
  console.log('');
  console.log('Example users.json entry:');
  console.log(JSON.stringify({
    users: [
      {
        id: 1,
        email: 'demo@vpn.com',
        password: hash
      }
    ]
  }, null, 2));
  
  process.exit(0);
});
