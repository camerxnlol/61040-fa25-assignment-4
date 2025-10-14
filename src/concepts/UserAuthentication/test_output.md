Principle Test: User Lifecycle

Attempting to register user: alice

✅ Registered user with ID: 0199e0c0-2c56-76bf-b7ff-e749d90c59c6

  

Attempting to authenticate user: alice with correct password

✅ Authentication successful for user: alice

  

Attempting to change password for user: alice

✅ Password changed successfully for user: alice

  

Attempting to authenticate user: alice with OLD password (should fail)

✅ Expected authentication with old password to fail, and it did: Invalid credentials.

  

Attempting to authenticate user: alice with NEW password (should succeed)

✅ Authentication with new password successful for user: alice

  

✅ Principle test completed successfully.

Principle: User lifecycle (register, authenticate, change password, re-authenticate) ... ok (1s)

  

Action: register ...

--- Action Test: register ---

should register a new user successfully ...

Registering user: testuser1

Verifying user 'testuser1' exists via query.

✅ Registration successful and verifiable.

should register a new user successfully ... ok (117ms)

  

should prevent registering with a duplicate username ...

Registering user: duplicateuser for the first time.

Attempting to register user: duplicateuser again (should fail).

✅ Duplicate username registration correctly prevented.

should prevent registering with a duplicate username ... ok (179ms)

--- End Action Test: register ---

Action: register ... ok (842ms)

  

Action: authenticate ...

--- Action Test: authenticate ---

Registering user: authuser for authentication tests.

  

should authenticate successfully with correct credentials ...

Attempting to authenticate user: authuser with correct password.

✅ Authentication successful with correct credentials.

should authenticate successfully with correct credentials ... ok (48ms)

  

should fail with incorrect password ...

Attempting to authenticate user: authuser with incorrect password.

✅ Expected authentication to fail with incorrect password, and it did.

should fail with incorrect password ... ok (42ms)

  

should fail for a non-existent username ...

Attempting to authenticate non-existent user: 'nonexistent'.

✅ Expected authentication to fail for non-existent user, and it did.

should fail for a non-existent username ... ok (16ms)

--- End Action Test: authenticate ---

Action: authenticate ... ok (817ms)

  

Action: delete ...

--- Action Test: delete ---

Registering user: deleteuser for deletion tests.

  

should delete an existing user successfully ...

Deleting user with ID: 0199e0c0-3774-7172-b7cc-3dcc56679acd

✅ User 0199e0c0-3774-7172-b7cc-3dcc56679acd deleted.

Verifying user 'deleteuser' no longer exists via query and authentication.

✅ User deletion verified: user no longer exists.

should delete an existing user successfully ... ok (97ms)

  

should fail to delete a non-existent user ...

Attempting to delete non-existent user ID: user:nonexistent.

✅ Expected deletion of non-existent user to fail, and it did.

should fail to delete a non-existent user ... ok (26ms)

--- End Action Test: delete ---

Action: delete ... ok (1s)

  

Action: changePassword ...

--- Action Test: changePassword ---

Registering user: changepwduser for password change tests.

  

should change password successfully with correct old password ...

Attempting to change password for user ID: 0199e0c0-3b41-7aa3-93a0-a44e5488e9a5.

✅ Password for user 0199e0c0-3b41-7aa3-93a0-a44e5488e9a5 changed.

Verifying old password no longer works and new password works.

✅ Password change verified: old password failed, new password succeeded.

should change password successfully with correct old password ... ok (189ms)

  

should fail to change password for a non-existent user ...

Attempting to change password for non-existent user ID: user:nonexistent.

✅ Expected password change for non-existent user to fail, and it did.

should fail to change password for a non-existent user ... ok (16ms)

  

should fail to change password with an incorrect old password ...

Attempting to change password for user ID: 0199e0c0-3c60-7c75-8cd2-1af08bb38a0e with incorrect old password.

✅ Expected password change with incorrect old password to fail, and it did.

✅ Old password still works after failed change attempt.

should fail to change password with an incorrect old password ... ok (236ms)

--- End Action Test: changePassword ---

Action: changePassword ... ok (1s)

  

Action: changeUsername ...

--- Action Test: changeUsername ---

Registering user: originaluser for username change tests.

  

should change username successfully with correct password ...

Attempting to change username for user ID: 0199e0c0-3fd2-77e1-8fa6-d85fed7d64af from 'originaluser' to 'updateduser'.

✅ Username for user 0199e0c0-3fd2-77e1-8fa6-d85fed7d64af changed to 'updateduser'.

Verifying old username no longer works and new username works.

✅ Username change verified.

should change username successfully with correct password ... ok (308ms)

  

should fail to change username for a non-existent user ...

Attempting to change username for non-existent user ID: user:nonexistent.

✅ Expected username change for non-existent user to fail, and it did.

should fail to change username for a non-existent user ... ok (17ms)

  

should fail to change username with an incorrect password ...

Attempting to change username for user ID: 0199e0c0-41bd-7cd7-b7d6-8b063eaacdf0 with incorrect password.

✅ Expected username change with incorrect password to fail, and it did.

should fail to change username with an incorrect password ... ok (132ms)

  

should fail to change username to one that already exists ...

Attempting to change username for user ID: 0199e0c0-423c-7b89-9ead-8373af5e921a to an existing username: 'user5'.

✅ Expected username change to an existing username to fail, and it did.

should fail to change username to one that already exists ... ok (287ms)

--- End Action Test: changeUsername ---

Action: changeUsername ... ok (1s)