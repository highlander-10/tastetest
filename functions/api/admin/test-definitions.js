// File: functions/api/admin/test-definitions.js

const TEST_DEFINITIONS_KEY = "TEST_DEFINITIONS";

// Handles GET requests to list all test definitions
export async function onRequestGet(context) {
  const { env } = context;
  try {
    const definitionsJSON = await env.TASTE_TEST_KV.get(TEST_DEFINITIONS_KEY);
    const definitions = definitionsJSON ? JSON.parse(definitionsJSON) : {};
    return new Response(JSON.stringify({ definitions: definitions }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching test definitions:", error);
    return new Response(JSON.stringify({ message: "Server error fetching test definitions." }), { status: 500 });
  }
}

// Handles POST requests to create or update a test definition
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const newTestData = await request.json();

    if (!newTestData || !newTestData.id || !newTestData.displayName || !Array.isArray(newTestData.questions)) {
      return new Response(JSON.stringify({ message: "Invalid test data. ID, Display Name, and Questions are required." }), { status: 400 });
    }

    // Get the existing definitions object, or create a new one
    const definitionsJSON = await env.TASTE_TEST_KV.get(TEST_DEFINITIONS_KEY);
    const allDefinitions = definitionsJSON ? JSON.parse(definitionsJSON) : {};

    // Add or update the definition using its ID as the key
    allDefinitions[newTestData.id] = newTestData;

    // Save the entire updated object back to KV
    await env.TASTE_TEST_KV.put(TEST_DEFINITIONS_KEY, JSON.stringify(allDefinitions));

    return new Response(JSON.stringify({ message: `Test Type "${newTestData.displayName}" saved successfully!` }), {
      status: 201, // 201 Created or Updated
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error saving test definition:", error);
    return new Response(JSON.stringify({ message: "Server error saving test definition." }), { status: 500 });
  }
}