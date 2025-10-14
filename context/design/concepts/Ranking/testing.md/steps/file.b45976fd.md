---
timestamp: 'Tue Oct 14 2025 01:38:14 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_013814.779fe778.md]]'
content_id: b45976fdb58cf02e88d106644386a1623dbeec3f2bbb8188a0534e291b8724fd
---

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
    console.log("--- Starting LikertSurvey Principle Test ---");

    // 1. Author creates a survey with a 1-5 scale
    console.log("Action: Author creates a survey 'Customer Satisfaction' (scale 1-5).");
    const createSurveyResult = await surveyConcept.createSurvey({ author: authorA, title: "Customer Satisfaction", scaleMin: 1, scaleMax: 5 });
    assertEquals("error" in createSurveyResult, false, `✅ Survey creation should not fail. Error: ${JSON.stringify(createSurveyResult)}`);
    const { survey } = createSurveyResult as { survey: ID };
    assertExists(survey, "✅ Survey ID should be returned.");
    console.log(`Result: Survey created with ID: ${survey}`);

    // 2. Author adds several questions
    console.log("Action: Author adds question 1: 'How satisfied are you...?'");
    const addQ1Result = await surveyConcept.addQuestion({ survey, text: "How satisfied are you with our product?" });
    assertEquals("error" in addQ1Result, false, `✅ Adding question 1 should not fail. Error: ${JSON.stringify(addQ1Result)}`);
    const { question: q1 } = addQ1Result as { question: ID };
    assertExists(q1, "✅ Question 1 ID should be returned.");
    console.log(`Result: Question 1 added with ID: ${q1}`);

    console.log("Action: Author adds question 2: 'How likely are you...?'");
    const addQ2Result = await surveyConcept.addQuestion({ survey, text: "How likely are you to recommend us?" });
    assertEquals("error" in addQ2Result, false, `✅ Adding question 2 should not fail. Error: ${JSON.stringify(addQ2Result)}`);
    const { question: q2 } = addQ2Result as { question: ID };
    assertExists(q2, "✅ Question 2 ID should be returned.");
    console.log(`Result: Question 2 added with ID: ${q2}`);

    const questions = await surveyConcept._getSurveyQuestions({ survey }) as { error?: string } & any[];
    assertEquals("error" in questions, false, `✅ Getting survey questions should not fail. Error: ${JSON.stringify(questions)}`);
    assertEquals(questions.length, 2, "✅ There should be two questions in the survey.");
    console.log(`Verification: Survey has ${questions.length} questions.`);

    // 3. A respondent submits their answers to those questions
    console.log(`Action: Respondent Bob submits response 5 for question ${q1}.`);
    const submitR1Result = await surveyConcept.submitResponse({ respondent: respondentB, question: q1, value: 5 });
    assertEquals("error" in submitR1Result, false, `✅ Submitting response 1 should succeed. Error: ${JSON.stringify(submitR1Result)}`);
    console.log("Result: Response 1 submitted successfully.");

    console.log(`Action: Respondent Bob submits response 4 for question ${q2}.`);
    const submitR2Result = await surveyConcept.submitResponse({ respondent: respondentB, question: q2, value: 4 });
    assertEquals("error" in submitR2Result, false, `✅ Submitting response 2 should succeed. Error: ${JSON.stringify(submitR2Result)}`);
    console.log("Result: Response 2 submitted successfully.");

    // 4. The author can view the collected responses
    console.log("\nAction: Author queries for collected responses for the survey.");
    const surveyResponses = await surveyConcept._getSurveyResponses({ survey }) as { error?: string } & any[];
    assertEquals("error" in surveyResponses, false, `✅ Getting survey responses should not fail. Error: ${JSON.stringify(surveyResponses)}`);
    assertEquals(surveyResponses.length, 2, "✅ There should be two responses for the survey.");
    assertEquals(surveyResponses.find((r) => r.question === q1)?.value, 5, "✅ Response for Q1 should be 5.");
    assertEquals(surveyResponses.find((r) => r.question === q2)?.value, 4, "✅ Response for Q2 should be 4.");
    console.log(`Verification: Survey responses collected: ${JSON.stringify(surveyResponses)}`);

    console.log("\nAction: Author queries for Bob's answers.");
    const respondentAnswers = await surveyConcept._getRespondentAnswers({ respondent: respondentB });
    assertEquals(respondentAnswers.length, 2, "✅ The respondent should have two answers recorded.");
    console.log(`Verification: Bob's answers: ${JSON.stringify(respondentAnswers)}`);

    console.log("--- LikertSurvey Principle Test Completed Successfully ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: createSurvey requires scaleMin < scaleMax", async () => {
  const [db, client] = await testDb();
  const surveyConcept = new LikertSurveyConcept(db);

  try {
    console.log("\n--- Testing createSurvey requirements ---");
    console.log("Action: Attempt to create survey with scaleMin > scaleMax.");
    const invalidResult = await surveyConcept.createSurvey({ author: authorA, title: "Invalid Survey 1", scaleMin: 5, scaleMax: 1 });
    assertEquals("error" in invalidResult, true, "✅ Should fail when scaleMin > scaleMax.");
    console.log(`Result: Expected error caught: ${(invalidResult as { error: string }).error}`);

    console.log("Action: Attempt to create survey with scaleMin == scaleMax.");
    const equalResult = await surveyConcept.createSurvey({ author: authorA, title: "Invalid Survey 2", scaleMin: 3, scaleMax: 3 });
    assertEquals("error" in equalResult, true, "✅ Should fail when scaleMin == scaleMax.");
    console.log(`Result: Expected error caught: ${(equalResult as { error: string }).error}`);
    console.log("--- createSurvey requirements tests completed ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: addQuestion requires an existing survey", async () => {
  const [db, client] = await testDb();
  const surveyConcept = new LikertSurveyConcept(db);
  const nonExistentSurveyId = "survey:fake" as ID;

  try {
    console.log("\n--- Testing addQuestion requirements ---");
    console.log(`Action: Attempt to add question to non-existent survey '${nonExistentSurveyId}'.`);
    const result = await surveyConcept.addQuestion({ survey: nonExistentSurveyId, text: "This will fail" });
    assertEquals("error" in result, true, "✅ Adding a question to a non-existent survey should fail.");
    console.log(`Result: Expected error caught: ${(result as { error: string }).error}`);
    console.log("--- addQuestion requirements tests completed ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: submitResponse requirements are enforced", async () => {
  const [db, client] = await testDb();
  const surveyConcept = new LikertSurveyConcept(db);

  try {
    console.log("\n--- Testing submitResponse requirements ---");
    // Setup a valid survey and question
    const { survey } = (await surveyConcept.createSurvey({ author: authorA, title: "Test Survey", scaleMin: 1, scaleMax: 5 })) as { survey: ID };
    const { question } = (await surveyConcept.addQuestion({ survey, text: "A question" })) as { question: ID };
    console.log(`Setup: Survey '${survey}' and Question '${question}' created.`);

    // Requires: question must exist
    const nonExistentQuestionId = "question:fake" as ID;
    console.log(`Action: Attempt to submit response to non-existent question '${nonExistentQuestionId}'.`);
    const res1 = await surveyConcept.submitResponse({ respondent: respondentB, question: nonExistentQuestionId, value: 3 });
    assertEquals("error" in res1, true, "✅ Submitting a response to a non-existent question should fail.");
    console.log(`Result: Expected error caught: ${(res1 as { error: string }).error}`);

    // Requires: respondent must not have already submitted a response
    console.log(`Action: Respondent Bob submits first response to question '${question}'.`);
    await surveyConcept.submitResponse({ respondent: respondentB, question, value: 3 }); // First submission is OK
    console.log(`Result: First response successful. Value: 3`);

    console.log(`Action: Respondent Bob attempts to submit second response to question '${question}'.`);
    const res2 = await surveyConcept.submitResponse({ respondent: respondentB, question, value: 4 }); // Second submission fails
    assertEquals("error" in res2, true, "✅ Submitting a response twice for the same question should fail.");
    assertEquals((res2 as { error: string }).error, "Respondent has already answered this question. Use updateResponse to change it.", "✅ Specific error message for double submission.");
    console.log(`Result: Expected error caught: ${(res2 as { error: string }).error}`);

    // Requires: value must be within survey's scale
    console.log(`Action: Respondent Charlie submits value 0 (below min scale) for question '${question}'.`);
    const res3 = await surveyConcept.submitResponse({ respondent: respondentC, question, value: 0 }); // Below min
    assertEquals("error" in res3, true, "✅ Submitting a value below the minimum scale should fail.");
    console.log(`Result: Expected error caught: ${(res3 as { error: string }).error}`);

    console.log(`Action: Respondent Charlie submits value 6 (above max scale) for question '${question}'.`);
    const res4 = await surveyConcept.submitResponse({ respondent: respondentC, question, value: 6 }); // Above max
    assertEquals("error" in res4, true, "✅ Submitting a value above the maximum scale should fail.");
    console.log(`Result: Expected error caught: ${(res4 as { error: string }).error}`);
    console.log("--- submitResponse requirements tests completed ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: updateResponse successfully updates a response and enforces requirements", async () => {
  const [db, client] = await testDb();
  const surveyConcept = new LikertSurveyConcept(db);
  try {
    console.log("\n--- Testing updateResponse actions and requirements ---");
    // Setup
    const { survey } = (await surveyConcept.createSurvey({ author: authorA, title: "Test Survey", scaleMin: 1, scaleMax: 5 })) as { survey: ID };
    const { question } = (await surveyConcept.addQuestion({ survey, text: "A question" })) as { question: ID };
    await surveyConcept.submitResponse({ respondent: respondentB, question, value: 3 });
    console.log(`Setup: Survey '${survey}', Question '${question}' created. Respondent Bob submitted initial response '3'.`);

    // Requires: A response must already exist to be updated
    console.log(`Action: Attempt to update response for Respondent Charlie (no existing response).`);
    const res1 = await surveyConcept.updateResponse({ respondent: respondentC, question, value: 4 });
    assertEquals("error" in res1, true, "✅ Updating a non-existent response should fail.");
    assertEquals((res1 as { error: string }).error, "No existing response found to update. Use submitResponse to create one.", "✅ Specific error message for no existing response.");
    console.log(`Result: Expected error caught: ${(res1 as { error: string }).error}`);

    // Requires: value must be within survey's scale
    console.log(`Action: Respondent Bob attempts to update response with value 6 (outside scale).`);
    const res2 = await surveyConcept.updateResponse({ respondent: respondentB, question, value: 6 });
    assertEquals("error" in res2, true, "✅ Updating with a value outside the scale should fail.");
    console.log(`Result: Expected error caught: ${(res2 as { error: string }).error}`);

    // Successful update
    console.log(`Action: Respondent Bob successfully updates response for question '${question}' to value 5.`);
    const successResult = await surveyConcept.updateResponse({ respondent: respondentB, question, value: 5 });
    assertEquals("error" in successResult, false, "✅ A valid update should succeed.");
    console.log("Result: Update successful.");

    // Verify the update
    console.log("Verification: Querying Bob's answers to confirm update.");
    const answers = await surveyConcept._getRespondentAnswers({ respondent: respondentB });
    assertEquals(answers.length, 1, "✅ There should still be only one answer.");
    assertEquals(answers[0].value, 5, "✅ The answer's value should be updated to 5.");
    console.log(`Verification: Bob's updated answer: ${JSON.stringify(answers[0])}`);
    console.log("--- updateResponse tests completed ---");
  } finally {
    await client.close();
  }
});
```
