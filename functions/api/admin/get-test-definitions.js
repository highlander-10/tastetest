// functions/api/admin/get-test-definitions.js

// Define the KV Key name for consistency
const TEST_DEFINITIONS_KEY = "TEST_DEFINITIONS";

export async function onRequestGet(context) {
  // context.env contains bindings, including your KV namespace
  // Ensure TASTE_TEST_KV is bound in your Pages project settings
  const { env } = context;

  try {
    const testDefinitionsJSON = await env.TASTE_TEST_KV.get(TEST_DEFINITIONS_KEY);

    if (!testDefinitionsJSON) {
      // If the key doesn't exist, it's likely not initialized yet.
      // Return an empty definitions object so the admin panel doesn't break.
      console.warn("TEST_DEFINITIONS_KEY not found in KV. Returning empty definitions.");
      return new Response(JSON.stringify({ definitions: {} }), {
        status: 200, // Still a success, just no data
        headers: { "Content-Type": "application/json" },
      });
    }

    // Attempt to parse, though it should be stored as a valid JSON string
    let definitions;
    try {
        definitions = JSON.parse(testDefinitionsJSON);
    } catch (e) {
        console.error("Failed to parse TEST_DEFINITIONS_KEY from KV. Value:", testDefinitionsJSON, e);
        // Return empty if parsing fails to prevent admin panel errors
        return new Response(JSON.stringify({ message: "Error parsing test definitions from storage.", definitions: {} }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ definitions: definitions }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in get-test-definitions function:", error);
    return new Response(
      JSON.stringify({ message: "Server error while fetching test type definitions.", error: error.message, definitions: {} }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
