// functions/api/get-active-test-config.js

// Define KV Key names for consistency
const ACTIVE_TEST_ID_KEY = "ACTIVE_TEST_ID";
const TEST_DEFINITIONS_KEY = "TEST_DEFINITIONS";

export async function onRequestGet(context) {
  // context.env contains bindings, including your KV namespace
  // Ensure TASTE_TEST_KV is bound in your Pages project settings to your KV namespace
  const { env } = context;

  try {
    // 1. Get the ID of the currently active test from KV
    const activeTestId = await env.TASTE_TEST_KV.get(ACTIVE_TEST_ID_KEY);

    if (!activeTestId) {
      // If no active test ID is set, inform the client.
      return new Response(
        JSON.stringify({ message: "No active taste test is currently selected by the admin." }),
        {
          status: 200, // It's not an error, just no active test.
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 2. Get all test definitions from KV
    const testDefinitionsJSON = await env.TASTE_TEST_KV.get(TEST_DEFINITIONS_KEY);
    if (!testDefinitionsJSON) {
      // This is a server-side configuration issue if definitions are missing.
      console.error("CRITICAL: TEST_DEFINITIONS_KEY not found in KV.");
      return new Response(
        JSON.stringify({ message: "Test definitions not found on the server. Please contact an admin." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    let allTestDefinitions;
    try {
      allTestDefinitions = JSON.parse(testDefinitionsJSON);
    } catch (parseError) {
      console.error("CRITICAL: Failed to parse TEST_DEFINITIONS_KEY from KV.", parseError);
      return new Response(
        JSON.stringify({ message: "Error reading test definitions on the server. Please contact an admin." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    const activeConfig = allTestDefinitions[activeTestId];

    if (!activeConfig) {
      // The activeTestId from KV doesn't match any key in the definitions.
      console.warn(`Warning: Active test ID "${activeTestId}" not found in TEST_DEFINITIONS.`);
      return new Response(
        JSON.stringify({ message: `The currently selected active test ('${activeTestId}') could not be found in the definitions. Please contact an admin.` }),
        {
          status: 404, // Not Found - the specific configuration for the active ID is missing
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. Return the specific configuration for the active test
    // The frontend expects the config object directly under a 'config' key
    return new Response(JSON.stringify({ config: activeConfig }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    // Catch-all for unexpected errors during KV access or processing
    console.error("Error in get-active-test-config function:", error);
    return new Response(
      JSON.stringify({ message: "An unexpected server error occurred while fetching test configuration.", error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
