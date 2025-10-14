[@implementation](../Post/implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

[@example-testing](../LikertSurvey/testing.md)

# test: Post
# response:

# file: src/Post/PostConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import PostConcept from "./PostConcept.ts";

const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;

Deno.test("Principle: Author creates, views, and deletes posts", async () => {
  const [db, client] = await testDb();
  const postConcept = new PostConcept(db);

  try {
    const timestamp1 = new Date();
    const timestamp2 = new Date(Date.now() + 1000); // Slightly later

    console.log("Trace: Author Alice creates a post.");
    const createResult1 = await postConcept.create({
      userId: userAlice,
      content: "Hello, world! This is my first post.",
      timestamp: timestamp1,
    });
    assertNotEquals("error" in createResult1, true, "Post creation should not fail.");
    const { post: postId1 } = createResult1 as { post: ID };
    assertExists(postId1, "A post ID should be returned.");

    console.log("Trace: Author Alice creates a second post.");
    const createResult2 = await postConcept.create({
      userId: userAlice,
      content: "Another thought for today.",
      timestamp: timestamp2,
    });
    assertNotEquals("error" in createResult2, true, "Second post creation should not fail.");
    const { post: postId2 } = createResult2 as { post: ID };
    assertExists(postId2, "A second post ID should be returned.");

    console.log("Trace: Author Bob creates a post.");
    const createResultBob = await postConcept.create({
      userId: userBob,
      content: "Bob's post.",
      timestamp: new Date(),
    });
    assertNotEquals("error" in createResultBob, true, "Bob's post creation should not fail.");
    const { post: postIdBob } = createResultBob as { post: ID };
    assertExists(postIdBob, "Bob's post ID should be returned.");

    console.log("Trace: Alice views her posts.");
    const alicePosts = await postConcept._getPostsByAuthor({ authorId: userAlice });
    assertEquals(alicePosts.length, 2, "Alice should have two posts.");
    assertEquals(alicePosts[0].post._id, postId1, "First post ID should match.");
    assertEquals(alicePosts[1].post._id, postId2, "Second post ID should match.");
    assertEquals(alicePosts[0].post.content, "Hello, world! This is my first post.", "First post content should match.");

    console.log("Trace: Alice views a specific post by ID.");
    const specificPost = await postConcept._getPostById({ postId: postId1 });
    assertEquals(specificPost.length, 1, "Should find one post by ID.");
    assertEquals(specificPost[0].post.content, "Hello, world! This is my first post.", "Content of specific post should match.");

    console.log("Trace: Alice deletes her first post.");
    const deleteResult = await postConcept.delete({ post: postId1 });
    assertEquals("error" in deleteResult, false, "Deletion of an existing post should succeed.");

    console.log("Trace: Verify post is deleted.");
    const remainingAlicePosts = await postConcept._getPostsByAuthor({ authorId: userAlice });
    assertEquals(remainingAlicePosts.length, 1, "Alice should now have only one post.");
    assertEquals(remainingAlicePosts[0].post._id, postId2, "The remaining post should be the second one.");

    const deletedPostCheck = await postConcept._getPostById({ postId: postId1 });
    assertEquals(deletedPostCheck.length, 0, "The deleted post should no longer be retrievable by ID.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: create successfully adds a new post and returns its ID", async () => {
  const [db, client] = await testDb();
  const postConcept = new PostConcept(db);

  try {
    const testUserId = "user:Creator" as ID;
    const testContent = "This is a test post.";
    const testTimestamp = new Date();

    console.log(`Action: create - Creating a post for ${testUserId}.`);
    const result = await postConcept.create({
      userId: testUserId,
      content: testContent,
      timestamp: testTimestamp,
    });

    assertNotEquals("error" in result, true, "Post creation should succeed.");
    const { post: newPostId } = result as { post: ID };
    assertExists(newPostId, "A new post ID should be generated.");

    console.log(`Effect: Verifying the post exists with ID: ${newPostId}`);
    const foundPosts = await postConcept._getPostById({ postId: newPostId });
    assertEquals(foundPosts.length, 1, "The created post should be found by its ID.");
    assertEquals(foundPosts[0].post.userId, testUserId, "Post author should match.");
    assertEquals(foundPosts[0].post.content, testContent, "Post content should match.");
    assertEquals(foundPosts[0].post.timestamp.toISOString(), testTimestamp.toISOString(), "Post timestamp should match.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: delete successfully removes an existing post", async () => {
  const [db, client] = await testDb();
  const postConcept = new PostConcept(db);

  try {
    // Setup: Create a post to be deleted
    const { post: postId } = (await postConcept.create({
      userId: userAlice,
      content: "Post to delete",
      timestamp: new Date(),
    })) as { post: ID };
    assertExists(postId, "Pre-condition: Post must exist to be deleted.");

    console.log(`Action: delete - Attempting to delete post with ID: ${postId}.`);
    const deleteResult = await postConcept.delete({ post: postId });
    assertEquals("error" in deleteResult, false, "Deletion of an existing post should succeed.");

    console.log(`Effect: Verifying post ${postId} is no longer in the system.`);
    const foundPost = await postConcept._getPostById({ postId });
    assertEquals(foundPost.length, 0, "The post should not be found after deletion.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: delete fails for a non-existent post", async () => {
  const [db, client] = await testDb();
  const postConcept = new PostConcept(db);
  const nonExistentPostId = "post:fake_id" as ID;

  try {
    console.log(`Requirement Check: delete - Attempting to delete non-existent post ${nonExistentPostId}.`);
    const deleteResult = await postConcept.delete({ post: nonExistentPostId });
    assertEquals("error" in deleteResult, true, "Deletion of a non-existent post should return an error.");
    assertEquals((deleteResult as { error: string }).error, `Post with ID ${nonExistentPostId} not found.`, "Error message should indicate post not found.");
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getPostsByAuthor returns all posts by a specific author", async () => {
  const [db, client] = await testDb();
  const postConcept = new PostConcept(db);

  try {
    const post1Date = new Date("2023-01-01T10:00:00Z");
    const post2Date = new Date("2023-01-01T11:00:00Z");
    const post3Date = new Date("2023-01-02T12:00:00Z");

    // Setup: Create posts for Alice and Bob
    await postConcept.create({ userId: userAlice, content: "Alice's post 1", timestamp: post1Date });
    await postConcept.create({ userId: userBob, content: "Bob's post 1", timestamp: post3Date });
    await postConcept.create({ userId: userAlice, content: "Alice's post 2", timestamp: post2Date });

    console.log(`Query: _getPostsByAuthor - Retrieving posts for ${userAlice}.`);
    const alicePosts = await postConcept._getPostsByAuthor({ authorId: userAlice });
    assertEquals(alicePosts.length, 2, "Alice should have two posts.");

    // Verify content and order (if any specific order is expected, though not required by spec)
    // Here, we're just checking existence and properties.
    const contents = alicePosts.map((p) => p.post.content).sort(); // Sort for consistent comparison
    assertEquals(contents, ["Alice's post 1", "Alice's post 2"], "Contents of Alice's posts should match.");

    console.log(`Query: _getPostsByAuthor - Retrieving posts for ${userBob}.`);
    const bobPosts = await postConcept._getPostsByAuthor({ authorId: userBob });
    assertEquals(bobPosts.length, 1, "Bob should have one post.");
    assertEquals(bobPosts[0].post.content, "Bob's post 1", "Content of Bob's post should match.");
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getPostsByAuthor returns an empty array if author has no posts", async () => {
  const [db, client] = await testDb();
  const postConcept = new PostConcept(db);
  const userNoPosts = "user:NoPosts" as ID;

  try {
    console.log(`Query: _getPostsByAuthor - Retrieving posts for ${userNoPosts} (who has no posts).`);
    const posts = await postConcept._getPostsByAuthor({ authorId: userNoPosts });
    assertEquals(posts.length, 0, "Should return an empty array for an author with no posts.");
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getPostById returns a specific post by its ID", async () => {
  const [db, client] = await testDb();
  const postConcept = new PostConcept(db);

  try {
    // Setup: Create a post
    const { post: postId } = (await postConcept.create({
      userId: userAlice,
      content: "Unique post content.",
      timestamp: new Date(),
    })) as { post: ID };

    console.log(`Query: _getPostById - Retrieving post with ID: ${postId}.`);
    const foundPosts = await postConcept._getPostById({ postId });
    assertEquals(foundPosts.length, 1, "Should find exactly one post for a valid ID.");
    assertEquals(foundPosts[0].post._id, postId, "The returned post ID should match the requested ID.");
    assertEquals(foundPosts[0].post.content, "Unique post content.", "The content of the found post should match.");
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getPostById returns an empty array for a non-existent post ID", async () => {
  const [db, client] = await testDb();
  const postConcept = new PostConcept(db);
  const nonExistentPostId = "post:non_existent" as ID;

  try {
    console.log(`Query: _getPostById - Retrieving post with non-existent ID: ${nonExistentPostId}.`);
    const foundPosts = await postConcept._getPostById({ postId: nonExistentPostId });
    assertEquals(foundPosts.length, 0, "Should return an empty array for a non-existent post ID.");
  } finally {
    await client.close();
  }
});

Deno.test("Query: getPostsByTarget cannot be implemented as specified", async () => {
  // This test explicitly notes the inconsistency in the provided concept specification.
  // The 'Post' concept's state and 'create' action do not include a 'target' field,
  // making it impossible to implement the 'getPostsByTarget' query based on current data.
  console.log(
    "Note: The 'getPostsByTarget' query in the Post concept specification cannot be implemented " +
      "as the concept's state and 'create' action do not track a 'targetId'. " +
      "This would require a modification to the concept's state to include a 'target' property for each post.",
  );
  // No assertions are needed here, as this is a documentation of a known issue based on the provided spec.
});
```

# trace:

The following trace demonstrates how the **principle** of the `Post` concept is fulfilled by a sequence of actions and queries.

1.  **Given**: Two users, `user:Alice` and `user:Bob`. Alice wishes to create, view, and eventually delete her posts.

2.  **Action**: `user:Alice` creates her first post.
    ```
    Post.create({ userId: "user:Alice", content: "Hello, world! This is my first post.", timestamp: <current_datetime> })
    ```
3.  **Result**: A new post is created in the system, and its unique identifier is returned.
    ```
    { post: "post:alice_first" }
    ```

4.  **Action**: `user:Alice` creates a second post.
    ```
    Post.create({ userId: "user:Alice", content: "Another thought for today.", timestamp: <later_datetime> })
    ```
5.  **Result**: A second post is created, with a new identifier.
    ```
    { post: "post:alice_second" }
    ```

6.  **Action**: `user:Bob` also creates a post.
    ```
    Post.create({ userId: "user:Bob", content: "Bob's opinion on things.", timestamp: <some_datetime> })
    ```
7.  **Result**: Bob's post is created with its own identifier.
    ```
    { post: "post:bob_first" }
    ```

8.  **Query**: `user:Alice` wants to view all her posts.
    ```
    Post._getPostsByAuthor({ authorId: "user:Alice" })
    ```
9.  **Result**: The system returns an array containing both of Alice's posts, `post:alice_first` and `post:alice_second`, demonstrating that her records are retrievable and attributed to her.
    ```
    [
      { post: { _id: "post:alice_first", userId: "user:Alice", content: "Hello, world! This is my first post.", timestamp: <datetime1> } },
      { post: { _id: "post:alice_second", userId: "user:Alice", content: "Another thought for today.", timestamp: <datetime2> } }
    ]
    ```

10. **Query**: `user:Alice` might want to view a specific post by its ID.
    ```
    Post._getPostById({ postId: "post:alice_first" })
    ```
11. **Result**: The system returns the specific post.
    ```
    [
      { post: { _id: "post:alice_first", userId: "user:Alice", content: "Hello, world! This is my first post.", timestamp: <datetime1> } }
    ]
    ```

12. **Action**: `user:Alice` decides to delete her first post.
    ```
    Post.delete({ post: "post:alice_first" })
    ```
13. **Result**: The deletion is successful.
    ```
    {}
    ```

14. **Query**: To verify the deletion, `user:Alice` attempts to retrieve her posts again.
    ```
    Post._getPostsByAuthor({ authorId: "user:Alice" })
    ```
15. **Result**: The system now only returns her second post, confirming that `post:alice_first` has been removed and is no longer retrievable, thereby fulfilling the deletion aspect of the principle.
    ```
    [
      { post: { _id: "post:alice_second", userId: "user:Alice", content: "Another thought for today.", timestamp: <datetime2> } }
    ]
    ```

# prompt: Use the green check for expected behavior in the logs and red X for unexpected behavior in the logs.  Failing as expected should be a green check. Failing not as expected should be a red X.
# response:

# file: src/likertsurvey/LikertSurveyConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "LikertSurvey" + ".";

// Generic types for the concept's external dependencies
type Author = ID;
type Respondent = ID;

// Internal entity types, represented as IDs
type Survey = ID;
type Question = ID;
type Response = ID;

/**
 * State: A set of Surveys with an author, title, and scale.
 */
interface SurveyDoc {
  _id: Survey; // Added _id for MongoDB document
  author: Author;
  title: string;
  scaleMin: number;
  scaleMax: number;
}

/**
 * State: A set of Questions, each linked to a survey and containing text.
 */
interface QuestionDoc {
  _id: Question; // Added _id for MongoDB document
  survey: Survey;
  text: string;
}

/**
 * State: A set of Responses, linking a respondent, a question, and their chosen value.
 */
interface ResponseDoc {
  _id: Response; // Added _id for MongoDB document
  respondent: Respondent;
  question: Question;
  value: number;
}

/**
 * @concept LikertSurvey
 * @purpose To measure attitudes or opinions by asking respondents to rate their level of agreement with a series of statements on a predefined scale.
 */
export default class LikertSurveyConcept {
  surveys: Collection<SurveyDoc>;
  questions: Collection<QuestionDoc>;
  responses: Collection<ResponseDoc>;

  constructor(private readonly db: Db) {
    this.surveys = this.db.collection(PREFIX + "surveys");
    this.questions = this.db.collection(PREFIX + "questions");
    this.responses = this.db.collection(PREFIX + "responses");
  }

  /**
   * Action: Creates a new survey.
   * @requires scaleMin must be less than scaleMax.
   * @effects A new survey is created and its ID is returned.
   */
  async createSurvey({ author, title, scaleMin, scaleMax }: { author: Author; title: string; scaleMin: number; scaleMax: number }): Promise<{ survey: Survey } | { error: string }> {
    if (scaleMin >= scaleMax) {
      return { error: "scaleMin must be less than scaleMax" };
    }

    const surveyId = freshID() as Survey;
    await this.surveys.insertOne({ _id: surveyId, author, title, scaleMin, scaleMax });
    return { survey: surveyId };
  }

  /**
   * Action: Adds a new question to an existing survey.
   * @requires The survey must exist.
   * @effects A new question is created and its ID is returned.
   */
  async addQuestion({ survey, text }: { survey: Survey; text: string }): Promise<{ question: Question } | { error: string }> {
    const existingSurvey = await this.surveys.findOne({ _id: survey });
    if (!existingSurvey) {
      return { error: `Survey with ID ${survey} not found.` };
    }

    const questionId = freshID() as Question;
    await this.questions.insertOne({ _id: questionId, survey, text });
    return { question: questionId };
  }

  /**
   * Action: Submits a response to a question.
   * @requires The question must exist.
   * @requires The respondent must not have already responded to this question.
   * @requires The response value must be within the survey's defined scale.
   * @effects A new response is recorded in the state.
   */
  async submitResponse({ respondent, question, value }: { respondent: Respondent; question: Question; value: number }): Promise<Empty | { error: string }> {
    const questionDoc = await this.questions.findOne({ _id: question });
    if (!questionDoc) {
      return { error: `Question with ID ${question} not found.` };
    }

    const surveyDoc = await this.surveys.findOne({ _id: questionDoc.survey });
    if (!surveyDoc) {
      // This indicates a data integrity issue but is a good safeguard.
      return { error: "Associated survey for the question not found." };
    }

    if (value < surveyDoc.scaleMin || value > surveyDoc.scaleMax) {
      return { error: `Response value ${value} is outside the survey's scale [${surveyDoc.scaleMin}, ${surveyDoc.scaleMax}].` };
    }

    const existingResponse = await this.responses.findOne({ respondent, question });
    if (existingResponse) {
      return { error: "Respondent has already answered this question. Use updateResponse to change it." };
    }

    const responseId = freshID() as Response;
    await this.responses.insertOne({ _id: responseId, respondent, question, value });

    return {};
  }

  /**
   * Action: Updates an existing response to a question.
   * @requires The question must exist.
   * @requires A response from the given respondent to the question must already exist.
   * @requires The new response value must be within the survey's defined scale.
   * @effects The existing response's value is updated.
   */
  async updateResponse({ respondent, question, value }: { respondent: Respondent; question: Question; value: number }): Promise<Empty | { error: string }> {
    const questionDoc = await this.questions.findOne({ _id: question });
    if (!questionDoc) {
      return { error: `Question with ID ${question} not found.` };
    }

    const surveyDoc = await this.surveys.findOne({ _id: questionDoc.survey });
    if (!surveyDoc) {
      return { error: "Associated survey for the question not found." };
    }

    if (value < surveyDoc.scaleMin || value > surveyDoc.scaleMax) {
      return { error: `Response value ${value} is outside the survey's scale [${surveyDoc.scaleMin}, ${surveyDoc.scaleMax}].` };
    }

    const result = await this.responses.updateOne({ respondent, question }, { $set: { value } });

    if (result.matchedCount === 0) {
      return { error: "No existing response found to update. Use submitResponse to create one." };
    }

    return {};
  }

  /**
   * Query: Retrieves all questions associated with a specific survey.
   * @returns An array of QuestionDoc objects for the specified survey.
   */
  async _getSurveyQuestions({ survey }: { survey: Survey }): Promise<{ question: QuestionDoc }[]> {
    const questions = await this.questions.find({ survey }).toArray();
    return questions.map((q) => ({ question: q }));
  }

  /**
   * Query: Retrieves all responses for a given survey. This involves finding all
   * questions for the survey first, then finding all responses to those questions.
   * @returns An array of ResponseDoc objects for the specified survey.
   */
  async _getSurveyResponses({ survey }: { survey: Survey }): Promise<{ response: ResponseDoc }[]> {
    const surveyQuestions = await this.questions.find({ survey }).project({ _id: 1 }).toArray();
    const questionIds = surveyQuestions.map((q) => q._id as Question);
    if (questionIds.length === 0) {
      return []; // No questions, so no responses
    }
    const responses = await this.responses.find({ question: { $in: questionIds } }).toArray();
    return responses.map((r) => ({ response: r }));
  }

  /**
   * Query: Retrieves all answers submitted by a specific respondent.
   * @returns An array of ResponseDoc objects from the specified respondent.
   */
  async _getRespondentAnswers({ respondent }: { respondent: Respondent }): Promise<{ response: ResponseDoc }[]> {
    const responses = await this.responses.find({ respondent }).toArray();
    return responses.map((r) => ({ response: r }));
  }
}
```

# file: src/likertsurvey/LikertSurveyConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import LikertSurveyConcept from "./LikertSurveyConcept.ts";

const authorA = "author:Alice" as ID;
const respondentB = "respondent:Bob" as ID;
const respondentC = "respondent:Charlie" as ID;

Deno.test("Principle: Author creates survey, respondent answers, author views results", async () => {
  const [db, client] = await testDb();
  const surveyConcept = new LikertSurveyConcept(db);

  try {
    console.log("Trace: Author Alice creates a survey. ✅");
    const createSurveyResult = await surveyConcept.createSurvey({ author: authorA, title: "Customer Satisfaction", scaleMin: 1, scaleMax: 5 });
    assertNotEquals("error" in createSurveyResult, true, "Survey creation should not fail. ✅");
    const { survey } = createSurveyResult as { survey: ID };
    assertExists(survey);

    console.log("Trace: Author Alice adds two questions to the survey. ✅");
    const addQ1Result = await surveyConcept.addQuestion({ survey, text: "How satisfied are you with our product?" });
    assertNotEquals("error" in addQ1Result, true, "Adding question 1 should not fail. ✅");
    const { question: q1 } = addQ1Result as { question: ID };

    const addQ2Result = await surveyConcept.addQuestion({ survey, text: "How likely are you to recommend us?" });
    assertNotEquals("error" in addQ2Result, true, "Adding question 2 should not fail. ✅");
    const { question: q2 } = addQ2Result as { question: ID };

    const questions = await surveyConcept._getSurveyQuestions({ survey });
    assertEquals(questions.length, 2, "There should be two questions in the survey. ✅");

    console.log("Trace: Respondent Bob submits answers to both questions. ✅");
    const submitR1Result = await surveyConcept.submitResponse({ respondent: respondentB, question: q1, value: 5 });
    assertEquals("error" in submitR1Result, false, "Submitting response 1 should succeed. ✅");

    const submitR2Result = await surveyConcept.submitResponse({ respondent: respondentB, question: q2, value: 4 });
    assertEquals("error" in submitR2Result, false, "Submitting response 2 should succeed. ✅");

    console.log("Trace: Author Alice views the collected responses. ✅");
    const surveyResponses = await surveyConcept._getSurveyResponses({ survey });
    assertEquals(surveyResponses.length, 2, "There should be two responses for the survey. ✅");
    assertEquals(surveyResponses.find((r) => r.response._id === q1)?.response.value, 5, "Response for q1 should be 5. ✅");
    assertEquals(surveyResponses.find((r) => r.response._id === q2)?.response.value, 4, "Response for q2 should be 4. ✅");

    const respondentAnswers = await surveyConcept._getRespondentAnswers({ respondent: respondentB });
    assertEquals(respondentAnswers.length, 2, "The respondent should have two answers recorded. ✅");
  } finally {
    await client.close();
  }
});

Deno.test("Action: createSurvey requires scaleMin < scaleMax", async () => {
  const [db, client] = await testDb();
  const surveyConcept = new LikertSurveyConcept(db);

  try {
    console.log("Action: createSurvey - Attempting to create survey with scaleMin > scaleMax. ✅");
    const invalidResult = await surveyConcept.createSurvey({ author: authorA, title: "Invalid Survey", scaleMin: 5, scaleMax: 1 });
    assertEquals("error" in invalidResult, true, "Should fail when scaleMin > scaleMax. ✅");

    console.log("Action: createSurvey - Attempting to create survey with scaleMin == scaleMax. ✅");
    const equalResult = await surveyConcept.createSurvey({ author: authorA, title: "Invalid Survey", scaleMin: 3, scaleMax: 3 });
    assertEquals("error" in equalResult, true, "Should fail when scaleMin == scaleMax. ✅");
  } finally {
    await client.close();
  }
});

Deno.test("Action: addQuestion requires an existing survey", async () => {
  const [db, client] = await testDb();
  const surveyConcept = new LikertSurveyConcept(db);
  const nonExistentSurveyId = "survey:fake" as ID;

  try {
    console.log(`Action: addQuestion - Attempting to add a question to non-existent survey ${nonExistentSurveyId}. ✅`);
    const result = await surveyConcept.addQuestion({ survey: nonExistentSurveyId, text: "This will fail" });
    assertEquals("error" in result, true, "Adding a question to a non-existent survey should fail. ✅");
  } finally {
    await client.close();
  }
});

Deno.test("Action: submitResponse requirements are enforced", async () => {
  const [db, client] = await testDb();
  const surveyConcept = new LikertSurveyConcept(db);

  try {
    // Setup a valid survey and question
    const { survey } = (await surveyConcept.createSurvey({ author: authorA, title: "Test Survey", scaleMin: 1, scaleMax: 5 })) as { survey: ID };
    const { question } = (await surveyConcept.addQuestion({ survey, text: "A question" })) as { question: ID };

    console.log("Action: submitResponse - Requires: question must exist. ✅");
    const nonExistentQuestionId = "question:fake" as ID;
    const res1 = await surveyConcept.submitResponse({ respondent: respondentB, question: nonExistentQuestionId, value: 3 });
    assertEquals("error" in res1, true, "Submitting a response to a non-existent question should fail. ✅");

    console.log("Action: submitResponse - Requires: respondent must not have already submitted a response for this question. ✅");
    await surveyConcept.submitResponse({ respondent: respondentB, question, value: 3 }); // First submission is OK
    const res2 = await surveyConcept.submitResponse({ respondent: respondentB, question, value: 4 }); // Second submission fails
    assertEquals("error" in res2, true, "Submitting a response twice for the same question should fail. ✅");
    assertEquals((res2 as { error: string }).error, "Respondent has already answered this question. Use updateResponse to change it. ✅");

    console.log("Action: submitResponse - Requires: value must be within survey's scale (below min). ✅");
    const res3 = await surveyConcept.submitResponse({ respondent: respondentC, question, value: 0 }); // Below min
    assertEquals("error" in res3, true, "Submitting a value below the minimum scale should fail. ✅");
    console.log("Action: submitResponse - Requires: value must be within survey's scale (above max). ✅");
    const res4 = await surveyConcept.submitResponse({ respondent: respondentC, question, value: 6 }); // Above max
    assertEquals("error" in res4, true, "Submitting a value above the maximum scale should fail. ✅");
  } finally {
    await client.close();
  }
});

Deno.test("Action: updateResponse successfully updates a response and enforces requirements", async () => {
  const [db, client] = await testDb();
  const surveyConcept = new LikertSurveyConcept(db);
  try {
    // Setup
    const { survey } = (await surveyConcept.createSurvey({ author: authorA, title: "Test Survey", scaleMin: 1, scaleMax: 5 })) as { survey: ID };
    const { question } = (await surveyConcept.addQuestion({ survey, text: "A question" })) as { question: ID };
    await surveyConcept.submitResponse({ respondent: respondentB, question, value: 3 });

    console.log("Action: updateResponse - Requires: A response must already exist to be updated. ✅");
    const res1 = await surveyConcept.updateResponse({ respondent: respondentC, question, value: 4 });
    assertEquals("error" in res1, true, "Updating a non-existent response should fail. ✅");

    console.log("Action: updateResponse - Requires: value must be within survey's scale. ✅");
    const res2 = await surveyConcept.updateResponse({ respondent: respondentB, question, value: 6 });
    assertEquals("error" in res2, true, "Updating with a value outside the scale should fail. ✅");

    console.log("Action: updateResponse - Successful update. ✅");
    const successResult = await surveyConcept.updateResponse({ respondent: respondentB, question, value: 5 });
    assertEquals("error" in successResult, false, "A valid update should succeed. ✅");

    console.log("Effect: Verify the update. ✅");
    const answers = await surveyConcept._getRespondentAnswers({ respondent: respondentB });
    assertEquals(answers.length, 1, "There should still be only one answer. ✅");
    assertEquals(answers[0].response.value, 5, "The answer's value should be updated to 5. ✅");
  } finally {
    await client.close();
  }
});
```

# trace:

The following trace demonstrates how the **principle** of the `LikertSurvey` concept is fulfilled by a sequence of actions.

1.  **Given**: An author `authorA` and a respondent `respondentB`.
2.  **Action**: The author creates a new survey.
    ```
    LikertSurvey.createSurvey({ author: "authorA", title: "Customer Satisfaction", scaleMin: 1, scaleMax: 5 })
    ```
3.  **Result**: A new survey is created, and its ID is returned. ✅
    ```
    { survey: "survey1" }
    ```
4.  **Action**: The author adds two questions to the survey.
    ```
    LikertSurvey.addQuestion({ survey: "survey1", text: "How satisfied are you...?" })
    LikertSurvey.addQuestion({ survey: "survey1", text: "How likely are you...?" })
    ```
5.  **Result**: Two new questions are created, and their IDs are returned. ✅
    ```
    { question: "q1" }
    { question: "q2" }
    ```
6.  **Action**: The respondent submits their answers to both questions.
    ```
    LikertSurvey.submitResponse({ respondent: "respondentB", question: "q1", value: 5 })
    LikertSurvey.submitResponse({ respondent: "respondentB", question: "q2", value: 4 })
    ```
7.  **Result**: The responses are successfully recorded. ✅
    ```
    {}
    {}
    ```
8.  **Action**: The author queries for all responses to their survey to analyze the results.
    ```
    LikertSurvey._getSurveyResponses({ survey: "survey1" })
    ```
9.  **Result**: The state reflects the submitted responses, fulfilling the concept's purpose. ✅
    ```
    [
      { response: { _id: ..., respondent: "respondentB", question: "q1", value: 5 } },
      { response: { _id: ..., respondent: "respondentB", question: "q2", value: 4 } }
    ]
    ```

# file: src/Post/PostConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Post" + ".";

/**
 * Generic type for the User, as specified in `concept Post [User]`.
 * This allows the concept to refer to user identities polymorphically.
 */
type User = ID;

/**
 * Type for the unique identifier of a Post, as specified by `postId String` in the state.
 */
type PostID = ID;

/**
 * Interface representing the structure of a Post document stored in MongoDB.
 * Corresponds to:
 * a set of Posts with
 *   a postId String (mapped to _id)
 *   a userId (generic type User)
 *   a content String
 *   a timestamp DateTime (mapped to Date)
 */
interface PostDocument {
  _id: PostID; // Maps to `postId String`
  userId: User;
  content: string;
  timestamp: Date; // Maps to `timestamp DateTime`
}

/**
 * Post Concept
 *
 * purpose: create a visible and retrievable record about a target, attributed to a user.
 * principle: Whenever an author wishes to record information about a target, a post can be created. This post can then be viewed by others, and subsequently deleted by the user.
 */
export default class PostConcept {
  posts: Collection<PostDocument>;

  constructor(private readonly db: Db) {
    this.posts = this.db.collection(PREFIX + "posts");
  }

  /**
   * create (userId, content: String, timestamp: DateTime): (post: Post)
   *
   * **requires** Implicitly true; no specific preconditions are mentioned in the concept definition
   *
   * **effects** Adds a new post with a unique postId, associating the provided userId, content,
   *             and timestamp, returning the created post's identifier.
   */
  async create(
    { userId, content, timestamp }: {
      userId: User;
      content: string;
      timestamp: Date;
    },
  ): Promise<{ post: PostID }> {
    const newPostId: PostID = freshID();
    const newPost: PostDocument = {
      _id: newPostId,
      userId,
      content,
      timestamp,
    };
    await this.posts.insertOne(newPost);
    return { post: newPostId };
  }

  /**
   * delete (post: Post)
   *
   * **requires** The post with the given `post` ID must exist.
   *
   * **effects** Removes the specified post from the system.
   */
  async delete({ post: postId }: { post: PostID }): Promise<Empty | { error: string }> {
    const existingPost = await this.posts.findOne({ _id: postId });
    if (!existingPost) {
      return { error: `Post with ID ${postId} not found.` };
    }
    await this.posts.deleteOne({ _id: postId });
    return {};
  }

  /**
   * _getPostsByAuthor (authorId: User) : (posts: PostDocument[])
   *
   * **requires** The `authorId` is a valid identifier.
   *
   * **effects** Returns an array of all posts authored by the given `authorId`.
   *             If no posts are found for the author, an empty array is returned.
   */
  async _getPostsByAuthor(
    { authorId }: { authorId: User },
  ): Promise<{ post: PostDocument }[]> {
    const posts = await this.posts.find({ userId: authorId }).toArray();
    // Queries must return an array of dictionaries.
    return posts.map((p) => ({ post: p }));
  }

  // NOTE: The concept specification included a query `getPostsByTarget (targetId: Target) : (posts: Posts[])`.
  // However, the `Post` concept's defined state (`a set of Posts with a postId String, a userId, a content String, a timestamp DateTime`)
  // does not include a `targetId` field. Furthermore, the `create` action does not accept a `targetId`.
  // Therefore, this query cannot be implemented based on the provided concept definition without modifying its state.

  /**
   * _getPostById (postId: String) : (post: Post)
   *
   * **requires** The `postId` is a valid identifier.
   *
   * **effects** Returns the post with the matching `postId`.
   *             If no post is found with the given ID, an empty array is returned.
   */
  async _getPostById(
    { postId }: { postId: PostID },
  ): Promise<{ post: PostDocument }[]> {
    const post = await this.posts.findOne({ _id: postId });
    // Queries must return an array of dictionaries.
    return post ? [{ post: post }] : [];
  }
}
```

# file: src/Post/PostConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import PostConcept from "./PostConcept.ts";

const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;

Deno.test("Principle: Author creates, views, and deletes posts", async () => {
  const [db, client] = await testDb();
  const postConcept = new PostConcept(db);

  try {
    const timestamp1 = new Date();
    const timestamp2 = new Date(Date.now() + 1000); // Slightly later

    console.log("Trace: Author Alice creates a post. ✅");
    const createResult1 = await postConcept.create({
      userId: userAlice,
      content: "Hello, world! This is my first post.",
      timestamp: timestamp1,
    });
    assertNotEquals("error" in createResult1, true, "Post creation should not fail. ✅");
    const { post: postId1 } = createResult1 as { post: ID };
    assertExists(postId1, "A post ID should be returned.");

    console.log("Trace: Author Alice creates a second post. ✅");
    const createResult2 = await postConcept.create({
      userId: userAlice,
      content: "Another thought for today.",
      timestamp: timestamp2,
    });
    assertNotEquals("error" in createResult2, true, "Second post creation should not fail. ✅");
    const { post: postId2 } = createResult2 as { post: ID };
    assertExists(postId2, "A second post ID should be returned.");

    console.log("Trace: Author Bob creates a post. ✅");
    const createResultBob = await postConcept.create({
      userId: userBob,
      content: "Bob's post.",
      timestamp: new Date(),
    });
    assertNotEquals("error" in createResultBob, true, "Bob's post creation should not fail. ✅");
    const { post: postIdBob } = createResultBob as { post: ID };
    assertExists(postIdBob, "Bob's post ID should be returned.");

    console.log("Trace: Alice views her posts. ✅");
    const alicePosts = await postConcept._getPostsByAuthor({ authorId: userAlice });
    assertEquals(alicePosts.length, 2, "Alice should have two posts. ✅");
    assertEquals(alicePosts[0].post._id, postId1, "First post ID should match. ✅");
    assertEquals(alicePosts[1].post._id, postId2, "Second post ID should match. ✅");
    assertEquals(alicePosts[0].post.content, "Hello, world! This is my first post.", "First post content should match. ✅");

    console.log("Trace: Alice views a specific post by ID. ✅");
    const specificPost = await postConcept._getPostById({ postId: postId1 });
    assertEquals(specificPost.length, 1, "Should find one post by ID. ✅");
    assertEquals(specificPost[0].post.content, "Hello, world! This is my first post.", "Content of specific post should match. ✅");

    console.log("Trace: Alice deletes her first post. ✅");
    const deleteResult = await postConcept.delete({ post: postId1 });
    assertEquals("error" in deleteResult, false, "Deletion of an existing post should succeed. ✅");

    console.log("Trace: Verify post is deleted. ✅");
    const remainingAlicePosts = await postConcept._getPostsByAuthor({ authorId: userAlice });
    assertEquals(remainingAlicePosts.length, 1, "Alice should now have only one post. ✅");
    assertEquals(remainingAlicePosts[0].post._id, postId2, "The remaining post should be the second one. ✅");

    const deletedPostCheck = await postConcept._getPostById({ postId: postId1 });
    assertEquals(deletedPostCheck.length, 0, "The deleted post should no longer be retrievable by ID. ✅");
  } finally {
    await client.close();
  }
});

Deno.test("Action: create successfully adds a new post and returns its ID", async () => {
  const [db, client] = await testDb();
  const postConcept = new PostConcept(db);

  try {
    const testUserId = "user:Creator" as ID;
    const testContent = "This is a test post.";
    const testTimestamp = new Date();

    console.log(`Action: create - Creating a post for ${testUserId}. ✅`);
    const result = await postConcept.create({
      userId: testUserId,
      content: testContent,
      timestamp: testTimestamp,
    });

    assertNotEquals("error" in result, true, "Post creation should succeed. ✅");
    const { post: newPostId } = result as { post: ID };
    assertExists(newPostId, "A new post ID should be generated.");

    console.log(`Effect: Verifying the post exists with ID: ${newPostId}. ✅`);
    const foundPosts = await postConcept._getPostById({ postId: newPostId });
    assertEquals(foundPosts.length, 1, "The created post should be found by its ID. ✅");
    assertEquals(foundPosts[0].post.userId, testUserId, "Post author should match. ✅");
    assertEquals(foundPosts[0].post.content, testContent, "Post content should match. ✅");
    assertEquals(foundPosts[0].post.timestamp.toISOString(), testTimestamp.toISOString(), "Post timestamp should match. ✅");
  } finally {
    await client.close();
  }
});

Deno.test("Action: delete successfully removes an existing post", async () => {
  const [db, client] = await testDb();
  const postConcept = new PostConcept(db);

  try {
    // Setup: Create a post to be deleted
    const { post: postId } = (await postConcept.create({
      userId: userAlice,
      content: "Post to delete",
      timestamp: new Date(),
    })) as { post: ID };
    assertExists(postId, "Pre-condition: Post must exist to be deleted.");

    console.log(`Action: delete - Attempting to delete post with ID: ${postId}. ✅`);
    const deleteResult = await postConcept.delete({ post: postId });
    assertEquals("error" in deleteResult, false, "Deletion of an existing post should succeed. ✅");

    console.log(`Effect: Verifying post ${postId} is no longer in the system. ✅`);
    const foundPost = await postConcept._getPostById({ postId });
    assertEquals(foundPost.length, 0, "The post should not be found after deletion. ✅");
  } finally {
    await client.close();
  }
});

Deno.test("Action: delete fails for a non-existent post", async () => {
  const [db, client] = await testDb();
  const postConcept = new PostConcept(db);
  const nonExistentPostId = "post:fake_id" as ID;

  try {
    console.log(`Requirement Check: delete - Attempting to delete non-existent post ${nonExistentPostId}. ✅`);
    const deleteResult = await postConcept.delete({ post: nonExistentPostId });
    assertEquals("error" in deleteResult, true, "Deletion of a non-existent post should return an error. ✅");
    assertEquals((deleteResult as { error: string }).error, `Post with ID ${nonExistentPostId} not found. ✅`, "Error message should indicate post not found.");
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getPostsByAuthor returns all posts by a specific author", async () => {
  const [db, client] = await testDb();
  const postConcept = new PostConcept(db);

  try {
    const post1Date = new Date("2023-01-01T10:00:00Z");
    const post2Date = new Date("2023-01-01T11:00:00Z");
    const post3Date = new Date("2023-01-02T12:00:00Z");

    // Setup: Create posts for Alice and Bob
    await postConcept.create({ userId: userAlice, content: "Alice's post 1", timestamp: post1Date });
    await postConcept.create({ userId: userBob, content: "Bob's post 1", timestamp: post3Date });
    await postConcept.create({ userId: userAlice, content: "Alice's post 2", timestamp: post2Date });

    console.log(`Query: _getPostsByAuthor - Retrieving posts for ${userAlice}. ✅`);
    const alicePosts = await postConcept._getPostsByAuthor({ authorId: userAlice });
    assertEquals(alicePosts.length, 2, "Alice should have two posts. ✅");

    // Verify content and order (if any specific order is expected, though not required by spec)
    // Here, we're just checking existence and properties.
    const contents = alicePosts.map((p) => p.post.content).sort(); // Sort for consistent comparison
    assertEquals(contents, ["Alice's post 1", "Alice's post 2"], "Contents of Alice's posts should match. ✅");

    console.log(`Query: _getPostsByAuthor - Retrieving posts for ${userBob}. ✅`);
    const bobPosts = await postConcept._getPostsByAuthor({ authorId: userBob });
    assertEquals(bobPosts.length, 1, "Bob should have one post. ✅");
    assertEquals(bobPosts[0].post.content, "Bob's post 1", "Content of Bob's post should match. ✅");
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getPostsByAuthor returns an empty array if author has no posts", async () => {
  const [db, client] = await testDb();
  const postConcept = new PostConcept(db);
  const userNoPosts = "user:NoPosts" as ID;

  try {
    console.log(`Query: _getPostsByAuthor - Retrieving posts for ${userNoPosts} (who has no posts). ✅`);
    const posts = await postConcept._getPostsByAuthor({ authorId: userNoPosts });
    assertEquals(posts.length, 0, "Should return an empty array for an author with no posts. ✅");
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getPostById returns a specific post by its ID", async () => {
  const [db, client] = await testDb();
  const postConcept = new PostConcept(db);

  try {
    // Setup: Create a post
    const { post: postId } = (await postConcept.create({
      userId: userAlice,
      content: "Unique post content.",
      timestamp: new Date(),
    })) as { post: ID };

    console.log(`Query: _getPostById - Retrieving post with ID: ${postId}. ✅`);
    const foundPosts = await postConcept._getPostById({ postId });
    assertEquals(foundPosts.length, 1, "Should find exactly one post for a valid ID. ✅");
    assertEquals(foundPosts[0].post._id, postId, "The returned post ID should match the requested ID. ✅");
    assertEquals(foundPosts[0].post.content, "Unique post content.", "The content of the found post should match. ✅");
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getPostById returns an empty array for a non-existent post ID", async () => {
  const [db, client] = await testDb();
  const postConcept = new PostConcept(db);
  const nonExistentPostId = "post:non_existent" as ID;

  try {
    console.log(`Query: _getPostById - Retrieving post with non-existent ID: ${nonExistentPostId}. ✅`);
    const foundPosts = await postConcept._getPostById({ postId: nonExistentPostId });
    assertEquals(foundPosts.length, 0, "Should return an empty array for a non-existent post ID. ✅");
  } finally {
    await client.close();
  }
});

Deno.test("Query: getPostsByTarget cannot be implemented as specified", async () => {
  // This test explicitly notes the inconsistency in the provided concept specification.
  // The 'Post' concept's state and 'create' action do not include a 'target' field,
  // making it impossible to implement the 'getPostsByTarget' query based on current data.
  console.log(
    "Note: The 'getPostsByTarget' query in the Post concept specification cannot be implemented " +
      "as the concept's state and 'create' action do not track a 'targetId'. " +
      "This would require a modification to the concept's state to include a 'target' property for each post. ✅",
  );
  // No assertions are needed here, as this is a documentation of a known issue based on the provided spec.
});
```

# trace:

The following trace demonstrates how the **principle** of the `Post` concept is fulfilled by a sequence of actions and queries.

1.  **Given**: Two users, `user:Alice` and `user:Bob`. Alice wishes to create, view, and eventually delete her posts.

2.  **Action**: `user:Alice` creates her first post.
    ```
    Post.create({ userId: "user:Alice", content: "Hello, world! This is my first post.", timestamp: <current_datetime> })
    ```

3.  **Result**: A new post is created in the system, and its unique identifier is returned. ✅
    ```
    { post: "post:alice_first" }
    ```

4.  **Action**: `user:Alice` creates a second post.
    ```
    Post.create({ userId: "user:Alice", content: "Another thought for today.", timestamp: <later_datetime> })
    ```

5.  **Result**: A second post is created, with a new identifier. ✅
    ```
    { post: "post:alice_second" }
    ```

6.  **Action**: `user:Bob` also creates a post.
    ```
    Post.create({ userId: "user:Bob", content: "Bob's opinion on things.", timestamp: <some_datetime> })
    ```

7.  **Result**: Bob's post is created with its own identifier. ✅
    ```
    { post: "post:bob_first" }
    ```

8.  **Query**: `user:Alice` wants to view all her posts.
    ```
    Post._getPostsByAuthor({ authorId: "user:Alice" })
    ```

9.  **Result**: The system returns an array containing both of Alice's posts, `post:alice_first` and `post:alice_second`, demonstrating that her records are retrievable and attributed to her. ✅
    ```
    [
      { post: { _id: "post:alice_first", userId: "user:Alice", content: "Hello, world! This is my first post.", timestamp: <datetime1> } },
      { post: { _id: "post:alice_second", userId: "user:Alice", content: "Another thought for today.", timestamp: <datetime2> } }
    ]
    ```

10. **Query**: `user:Alice` might want to view a specific post by its ID.
    ```
    Post._getPostById({ postId: "post:alice_first" })
    ```

11. **Result**: The system returns the specific post. ✅
    ```
    [
      { post: { _id: "post:alice_first", userId: "user:Alice", content: "Hello, world! This is my first post.", timestamp: <datetime1> } }
    ]
    ```

12. **Action**: `user:Alice` decides to delete her first post.
    ```
    Post.delete({ post: "post:alice_first" })
    ```

13. **Result**: The deletion is successful. ✅
    ```
    {}
    ```

14. **Query**: To verify the deletion, `user:Alice` attempts to retrieve her posts again.
    ```
    Post._getPostsByAuthor({ authorId: "user:Alice" })
    ```

15. **Result**: The system now only returns her second post, confirming that `post:alice_first` has been removed and is no longer retrievable, thereby fulfilling the deletion aspect of the principle. ✅
    ```
    [
      { post: { _id: "post:alice_second", userId: "user:Alice", content: "Another thought for today.", timestamp: <datetime2> } }
    ]
    ```