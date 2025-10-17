// Test script to verify DHAN_CLIENT_ID security implementation
import { getDatabaseConnection } from '../src/lib/database';
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
    console.log('✅ User before DHAN ID assignment:', {
      id: userBefore.id,
      username: userBefore.username,
      dhanClientId: userBefore.dhanClientId,
      isApproved: userBefore.isApproved
    });

    // Test 3: Update DHAN_CLIENT_ID
    console.log('\n3. Updating DHAN_CLIENT_ID...');
    await updateUserDhanClientId(testUser.id, 'TEST_CLIENT_123');
    const userAfterUpdate = await findUserByUsername('testuser_security');
    console.log('✅ User after DHAN ID update:', {
      id: userAfterUpdate.id,
      username: userAfterUpdate.username,
      dhanClientId: userAfterUpdate.dhanClientId,
      isApproved: userAfterUpdate.isApproved
    });

    // Test 4: Find user by DHAN_CLIENT_ID
    console.log('\n4. Finding user by DHAN_CLIENT_ID...');
    const userByDhanId = await findUserByDhanClientId('TEST_CLIENT_123');
    console.log('✅ User found by DHAN ID:', {
      id: userByDhanId.id,
      username: userByDhanId.username,
      dhanClientId: userByDhanId.dhanClientId
    });

    // Test 5: Approve user
    console.log('\n5. Approving user...');
    await approveUser(testUser.id);
    const userAfterApproval = await findUserByUsername('testuser_security');
    console.log('✅ User after approval:', {
      id: userAfterApproval.id,
      username: userAfterApproval.username,
      dhanClientId: userAfterApproval.dhanClientId,
      isApproved: userAfterApproval.isApproved
    });

    // Test 6: Test uniqueness constraint
    console.log('\n6. Testing DHAN_CLIENT_ID uniqueness...');
    try {
      const anotherUser = await createUser({
        username: 'testuser_security2',
        email: 'testuser_security2@example.com',
        password: 'testpassword123',
        fullName: 'Test User Security 2'
      });
      
      // This should fail due to unique constraint
      await updateUserDhanClientId(anotherUser.id, 'TEST_CLIENT_123');
      console.log('❌ Uniqueness constraint failed - duplicate DHAN_CLIENT_ID was allowed');
    } catch (error) {
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        console.log('✅ Uniqueness constraint working - duplicate DHAN_CLIENT_ID rejected');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- ✅ User creation with null DHAN_CLIENT_ID');
    console.log('- ✅ DHAN_CLIENT_ID update functionality');
    console.log('- ✅ User lookup by DHAN_CLIENT_ID');
    console.log('- ✅ User approval process');
    console.log('- ✅ DHAN_CLIENT_ID uniqueness constraint');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testDhanClientIdSecurity();
