---
timestamp: 'Tue Oct 14 2025 01:09:55 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_010955.e1142c4f.md]]'
content_id: 99dff8b626db49042360318f4788e69ba1d7ec7f3d3892c7152567685932c37d
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
