import { storage } from './storage';
import bcrypt from 'bcrypt';
import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function updateAllPasswords() {
  console.log('🔐 Updating all user passwords to "12345"...');

  try {
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('12345', saltRounds);
    console.log('✅ Password hashed');

    // Get all users
    const allUsers = await storage.getAllUsers();
    console.log(`Found ${allUsers.length} users to update`);

    // Update each user with the hashed password
    for (const user of allUsers) {
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, user.id));
      
      console.log(`✅ Updated password for ${user.email}`);
    }

    console.log('🎉 All passwords updated successfully!');
    console.log('Users can now login with email and password "12345"');
    
  } catch (error) {
    console.error('❌ Error updating passwords:', error);
    process.exit(1);
  }
}

// Run the update
updateAllPasswords().then(() => {
  console.log('✅ Password update completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Password update failed:', error);
  process.exit(1);
});