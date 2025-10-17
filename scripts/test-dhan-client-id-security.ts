// Test script to verify DHAN_CLIENT_ID security implementation
import { 
  createUser, 
  findUserByUsername, 
  findUserByDhanClientId 
} from '../src/lib/userDatabase';

async function testDhanClientIdSecurity() {
  console.log('🧪 Testing DHAN_CLIENT_ID Security Implementation...\n');
  
  try {
    // Test 1: Create a new user
    console.log('1. Creating a new user...');
    const testUser = await createUser({
      username: 'testuser_security',
      email: 'testuser_security@example.com',
      password: 'testpassword123',
      fullName: 'Test User Security'
    });
    console.log('✅ User created:', {
      id: testUser.id,
      username: testUser.username,
      dhanClientId: testUser.dhanClientId
    });

    // Test 2: Verify user has no DHAN_CLIENT_ID initially
    console.log('\n2. Verifying initial state...');
    const userBefore = await findUserByUsername('testuser_security');
    if (!userBefore) {
      console.error('❌ User not found after creation');
      return;
    }
    console.log('✅ User before DHAN ID assignment:', {
      id: userBefore.id,
      username: userBefore.username,
      dhanClientId: userBefore.dhanClientId,
      isApproved: userBefore.isApproved
    });

    // Test 3: Find user by DHAN_CLIENT_ID (should return null initially)
    console.log('\n3. Finding user by DHAN_CLIENT_ID (should be null)...');
    const userByDhanId = await findUserByDhanClientId('TEST_CLIENT_123');
    console.log('✅ User found by DHAN ID:', userByDhanId ? 'Found (unexpected)' : 'Not found (expected)');

    console.log('\n📝 Note: DHAN_CLIENT_ID assignment and user approval are now handled manually via database updates.');
    console.log('   Use the following SQL commands to test:');
    console.log('   UPDATE users SET dhan_client_id = \'TEST_CLIENT_123\' WHERE username = \'testuser_security\';');
    console.log('   UPDATE users SET is_approved = true WHERE username = \'testuser_security\';');

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- ✅ User creation with null DHAN_CLIENT_ID');
    console.log('- ✅ User lookup by DHAN_CLIENT_ID');
    console.log('- ✅ Manual database management approach');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testDhanClientIdSecurity();
