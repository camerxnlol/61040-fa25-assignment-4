import { assertEquals, assertExists, assertNotEquals } from "@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";

Deno.test("Principle: User lifecycle (register, authenticate, change password, re-authenticate)", async (t) => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    console.log("\n--- Principle Test: User Lifecycle ---");

    const username = "alice";
    const password = "password123";
    const newPassword = "newPassword456";

    console.log(`Attempting to register user: ${username}`);
    const registerResult = await authConcept.register({ username, password });
    assertNotEquals("error" in registerResult, true, `Register should succeed: ${JSON.stringify(registerResult)}`);
    const { user: registeredUser } = registerResult as { user: ID };
    assertExists(registeredUser, "A user ID should be returned upon successful registration.");
    console.log(`✅ Registered user with ID: ${registeredUser}`);

    console.log(`\nAttempting to authenticate user: ${username} with correct password`);
    const authResult1 = await authConcept.authenticate({ username, password });
    assertNotEquals("error" in authResult1, true, `Authentication with correct password should succeed: ${JSON.stringify(authResult1)}`);
    assertEquals((authResult1 as { user: ID }).user, registeredUser, "Authenticated user ID should match registered user ID.");
    console.log(`✅ Authentication successful for user: ${username}`);

    console.log(`\nAttempting to change password for user: ${username}`);
    const changePwdResult = await authConcept.changePassword({ user: registeredUser, oldPassword: password, newPassword });
    assertEquals("error" in changePwdResult, false, `Change password should succeed: ${JSON.stringify(changePwdResult)}`);
    console.log(`✅ Password changed successfully for user: ${username}`);

    console.log(`\nAttempting to authenticate user: ${username} with OLD password (should fail)`);
    const authResult2 = await authConcept.authenticate({ username, password });
    assertEquals("error" in authResult2, true, `Authentication with OLD password should fail: ${JSON.stringify(authResult2)}`);
    console.log(`✅ Expected authentication with old password to fail, and it did: ${(authResult2 as { error: string }).error}`);

    console.log(`\nAttempting to authenticate user: ${username} with NEW password (should succeed)`);
    const authResult3 = await authConcept.authenticate({ username, password: newPassword });
    assertNotEquals("error" in authResult3, true, `Authentication with NEW password should succeed: ${JSON.stringify(authResult3)}`);
    assertEquals((authResult3 as { user: ID }).user, registeredUser, "Authenticated user ID should match after password change.");
    console.log(`✅ Authentication with new password successful for user: ${username}`);

    console.log("\n✅ Principle test completed successfully.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: register", async (t) => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    console.log("\n--- Action Test: register ---");

    await t.step("should register a new user successfully", async () => {
      const username = "testuser1";
      const password = "password123";
      console.log(`Registering user: ${username}`);
      const result = await authConcept.register({ username, password });
      assertNotEquals("error" in result, true, `Expected successful registration, got: ${JSON.stringify(result)}`);
      const { user } = result as { user: ID };
      assertExists(user, "User ID should be returned.");

      console.log(`Verifying user '${username}' exists via query.`);
      const queryResult = await authConcept._getUserByUsername({ username });
      assertNotEquals("error" in queryResult, true, `Query for user '${username}' should succeed.`);
      assertEquals((queryResult as Array<{ user: ID }>)[0].user, user, "Queried user ID should match registered ID.");
      console.log("✅ Registration successful and verifiable.");
    });

    await t.step("should prevent registering with a duplicate username", async () => {
      const username = "duplicateuser";
      const password = "password123";
      console.log(`Registering user: ${username} for the first time.`);
      await authConcept.register({ username, password });

      console.log(`Attempting to register user: ${username} again (should fail).`);
      const result = await authConcept.register({ username, password });
      assertEquals("error" in result, true, `Expected registration to fail for duplicate username, got: ${JSON.stringify(result)}`);
      assertEquals((result as { error: string }).error, `Username '${username}' already exists.`);
      console.log("✅ Duplicate username registration correctly prevented.");
    });
    console.log("--- End Action Test: register ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: authenticate", async (t) => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    console.log("\n--- Action Test: authenticate ---");

    const username = "authuser";
    const password = "authpassword";
    console.log(`Registering user: ${username} for authentication tests.`);
    const registerResult = await authConcept.register({ username, password });
    const { user: userId } = registerResult as { user: ID };

    await t.step("should authenticate successfully with correct credentials", async () => {
      console.log(`Attempting to authenticate user: ${username} with correct password.`);
      const result = await authConcept.authenticate({ username, password });
      assertNotEquals("error" in result, true, `Expected successful authentication, got: ${JSON.stringify(result)}`);
      assertEquals((result as { user: ID }).user, userId, "Authenticated user ID should match.");
      console.log("✅ Authentication successful with correct credentials.");
    });

    await t.step("should fail with incorrect password", async () => {
      console.log(`Attempting to authenticate user: ${username} with incorrect password.`);
      const result = await authConcept.authenticate({ username, password: "wrongpassword" });
      assertEquals("error" in result, true, `Expected authentication to fail with incorrect password, got: ${JSON.stringify(result)}`);
      assertEquals((result as { error: string }).error, "Invalid credentials.");
      console.log("✅ Expected authentication to fail with incorrect password, and it did.");
    });

    await t.step("should fail for a non-existent username", async () => {
      console.log(`Attempting to authenticate non-existent user: 'nonexistent'.`);
      const result = await authConcept.authenticate({ username: "nonexistent", password: "anypassword" });
      assertEquals("error" in result, true, `Expected authentication to fail for non-existent user, got: ${JSON.stringify(result)}`);
      assertEquals((result as { error: string }).error, "Invalid credentials.");
      console.log("✅ Expected authentication to fail for non-existent user, and it did.");
    });
    console.log("--- End Action Test: authenticate ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: delete", async (t) => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    console.log("\n--- Action Test: delete ---");

    const username = "deleteuser";
    const password = "deletepassword";
    console.log(`Registering user: ${username} for deletion tests.`);
    const registerResult = await authConcept.register({ username, password });
    const { user: userId } = registerResult as { user: ID };

    await t.step("should delete an existing user successfully", async () => {
      console.log(`Deleting user with ID: ${userId}`);
      const deleteResult = await authConcept.delete({ user: userId });
      assertEquals("error" in deleteResult, false, `Expected successful deletion, got: ${JSON.stringify(deleteResult)}`);
      console.log(`✅ User ${userId} deleted.`);

      console.log(`Verifying user '${username}' no longer exists via query and authentication.`);
      const queryResult = await authConcept._getUserByUsername({ username });
      assertEquals("error" in queryResult, true, `Query for deleted user '${username}' should fail.`);
      assertEquals((queryResult as { error: string }).error, `User with username '${username}' not found.`);

      const authResult = await authConcept.authenticate({ username, password });
      assertEquals("error" in authResult, true, `Authentication for deleted user '${username}' should fail.`);
      console.log("✅ User deletion verified: user no longer exists.");
    });

    await t.step("should fail to delete a non-existent user", async () => {
      const nonExistentUserId = "user:nonexistent" as ID;
      console.log(`Attempting to delete non-existent user ID: ${nonExistentUserId}.`);
      const result = await authConcept.delete({ user: nonExistentUserId });
      assertEquals("error" in result, true, `Expected deletion to fail for non-existent user, got: ${JSON.stringify(result)}`);
      assertEquals((result as { error: string }).error, `User with ID '${nonExistentUserId}' not found.`);
      console.log("✅ Expected deletion of non-existent user to fail, and it did.");
    });
    console.log("--- End Action Test: delete ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: changePassword", async (t) => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    console.log("\n--- Action Test: changePassword ---");

    const username = "changepwduser";
    const oldPassword = "oldpassword";
    const newPassword = "newsecurepassword";
    console.log(`Registering user: ${username} for password change tests.`);
    const registerResult = await authConcept.register({ username, password: oldPassword });
    const { user: userId } = registerResult as { user: ID };

    await t.step("should change password successfully with correct old password", async () => {
      console.log(`Attempting to change password for user ID: ${userId}.`);
      const changeResult = await authConcept.changePassword({ user: userId, oldPassword, newPassword });
      assertEquals("error" in changeResult, false, `Expected successful password change, got: ${JSON.stringify(changeResult)}`);
      console.log(`✅ Password for user ${userId} changed.`);

      console.log("Verifying old password no longer works and new password works.");
      const oldAuth = await authConcept.authenticate({ username, password: oldPassword });
      assertEquals("error" in oldAuth, true, "Authentication with old password should now fail.");

      const newAuth = await authConcept.authenticate({ username, password: newPassword });
      assertNotEquals("error" in newAuth, true, "Authentication with new password should succeed.");
      assertEquals((newAuth as { user: ID }).user, userId, "Authenticated user ID should match.");
      console.log("✅ Password change verified: old password failed, new password succeeded.");
    });

    await t.step("should fail to change password for a non-existent user", async () => {
      const nonExistentUserId = "user:nonexistent" as ID;
      console.log(`Attempting to change password for non-existent user ID: ${nonExistentUserId}.`);
      const result = await authConcept.changePassword({ user: nonExistentUserId, oldPassword: "any", newPassword: "new" });
      assertEquals("error" in result, true, `Expected failure for non-existent user, got: ${JSON.stringify(result)}`);
      assertEquals((result as { error: string }).error, `User with ID '${nonExistentUserId}' not found.`);
      console.log("✅ Expected password change for non-existent user to fail, and it did.");
    });

    await t.step("should fail to change password with an incorrect old password", async () => {
      const user2Username = "changeuser2";
      const user2Password = "initial";
      const user2NewPassword = "final";
      const regRes2 = await authConcept.register({ username: user2Username, password: user2Password });
      const user2Id = (regRes2 as { user: ID }).user;
      console.log(`Attempting to change password for user ID: ${user2Id} with incorrect old password.`);
      const result = await authConcept.changePassword({ user: user2Id, oldPassword: "wrongold", newPassword: user2NewPassword });
      assertEquals("error" in result, true, `Expected failure for incorrect old password, got: ${JSON.stringify(result)}`);
      assertEquals((result as { error: string }).error, "Incorrect old password.");
      console.log("✅ Expected password change with incorrect old password to fail, and it did.");

      // Verify old password still works
      const authStillWorks = await authConcept.authenticate({ username: user2Username, password: user2Password });
      assertNotEquals("error" in authStillWorks, true, "Old password should still work after failed change attempt.");
      console.log("✅ Old password still works after failed change attempt.");
    });
    console.log("--- End Action Test: changePassword ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: changeUsername", async (t) => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    console.log("\n--- Action Test: changeUsername ---");

    const username = "originaluser";
    const password = "userpassword";
    const newUsername = "updateduser";
    console.log(`Registering user: ${username} for username change tests.`);
    const registerResult = await authConcept.register({ username, password });
    const { user: userId } = registerResult as { user: ID };

    // Register another user to test duplicate new username
    const otherUsername = "anotheruser";
    const otherPassword = "otherpassword";
    await authConcept.register({ username: otherUsername, password: otherPassword });

    await t.step("should change username successfully with correct password", async () => {
      console.log(`Attempting to change username for user ID: ${userId} from '${username}' to '${newUsername}'.`);
      const changeResult = await authConcept.changeUsername({ user: userId, newUsername, password });
      assertEquals("error" in changeResult, false, `Expected successful username change, got: ${JSON.stringify(changeResult)}`);
      console.log(`✅ Username for user ${userId} changed to '${newUsername}'.`);

      console.log("Verifying old username no longer works and new username works.");
      const oldUsernameAuth = await authConcept.authenticate({ username, password });
      assertEquals("error" in oldUsernameAuth, true, "Authentication with old username should now fail.");

      const newUsernameAuth = await authConcept.authenticate({ username: newUsername, password });
      assertNotEquals("error" in newUsernameAuth, true, "Authentication with new username should succeed.");
      assertEquals((newUsernameAuth as { user: ID }).user, userId, "Authenticated user ID should match.");

      const queryOldUsername = await authConcept._getUserByUsername({ username });
      assertEquals("error" in queryOldUsername, true, `Query for old username '${username}' should fail.`);

      const queryNewUsername = await authConcept._getUserByUsername({ username: newUsername });
      assertNotEquals("error" in queryNewUsername, true, `Query for new username '${newUsername}' should succeed.`);
      assertEquals((queryNewUsername as Array<{ user: ID }>)[0].user, userId, "Queried user ID for new username should match.");
      console.log("✅ Username change verified.");
    });

    await t.step("should fail to change username for a non-existent user", async () => {
      const nonExistentUserId = "user:nonexistent" as ID;
      console.log(`Attempting to change username for non-existent user ID: ${nonExistentUserId}.`);
      const result = await authConcept.changeUsername({ user: nonExistentUserId, newUsername: "fake", password: "any" });
      assertEquals("error" in result, true, `Expected failure for non-existent user, got: ${JSON.stringify(result)}`);
      assertEquals((result as { error: string }).error, `User with ID '${nonExistentUserId}' not found.`);
      console.log("✅ Expected username change for non-existent user to fail, and it did.");
    });

    await t.step("should fail to change username with an incorrect password", async () => {
      const user3Username = "userwithincorrectpassword";
      const user3Password = "correct";
      const user3NewUsername = "newname";
      const regRes3 = await authConcept.register({ username: user3Username, password: user3Password });
      const user3Id = (regRes3 as { user: ID }).user;

      console.log(`Attempting to change username for user ID: ${user3Id} with incorrect password.`);
      const result = await authConcept.changeUsername({ user: user3Id, newUsername: user3NewUsername, password: "wrongpassword" });
      assertEquals("error" in result, true, `Expected failure for incorrect password, got: ${JSON.stringify(result)}`);
      assertEquals((result as { error: string }).error, "Incorrect password.");
      console.log("✅ Expected username change with incorrect password to fail, and it did.");
    });

    await t.step("should fail to change username to one that already exists", async () => {
      const user4Username = "user4";
      const user4Password = "pwd4";
      const user5Username = "user5"; // This username already exists
      const user5Password = "pwd5";

      const regRes4 = await authConcept.register({ username: user4Username, password: user4Password });
      const user4Id = (regRes4 as { user: ID }).user;
      await authConcept.register({ username: user5Username, password: user5Password }); // Register user5

      console.log(`Attempting to change username for user ID: ${user4Id} to an existing username: '${user5Username}'.`);
      const result = await authConcept.changeUsername({ user: user4Id, newUsername: user5Username, password: user4Password });
      assertEquals("error" in result, true, `Expected failure for duplicate new username, got: ${JSON.stringify(result)}`);
      assertEquals((result as { error: string }).error, `Username '${user5Username}' is already taken.`);
      console.log("✅ Expected username change to an existing username to fail, and it did.");
    });
    console.log("--- End Action Test: changeUsername ---");
  } finally {
    await client.close();
  }
});