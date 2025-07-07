// functions/api/get-active-test-config.js

export async function onRequestGet({ env }) {
  try {
    // 1. Get the ID of the currently active event
    const activeEventId = await env.TASTE_TEST_APP_KV.get('ACTIVE_EVENT_ID');

    if (!activeEventId) {
      return new Response(JSON.stringify({ error: "No active event ID set in KV." }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Get all defined events
    const eventsDefinitionsJson = await env.TASTE_TEST_APP_KV.get('EVENTS_DEFINITIONS');
    if (!eventsDefinitionsJson) {
      return new Response(JSON.stringify({ error: "Events definitions not found in KV." }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const eventsDefinitions = JSON.parse(eventsDefinitionsJson);
    const currentEventConfig = eventsDefinitions[activeEventId];

    if (!currentEventConfig) {
      return new Response(JSON.stringify({ error: `Configuration for active event ID "${activeEventId}" not found in EVENTS_DEFINITIONS.` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Get all defined test types (which contain questions)
    const testDefinitionsJson = await env.TASTE_TEST_APP_KV.get('TEST_DEFINITIONS');
    if (!testDefinitionsJson) {
      return new Response(JSON.stringify({ error: "Test definitions not found in KV." }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const testDefinitions = JSON.parse(testDefinitionsJson);
    const testTypeConfig = testDefinitions[currentEventConfig.testTypeId];

    if (!testTypeConfig) {
      return new Response(JSON.stringify({ error: `Test type configuration for ID "${currentEventConfig.testTypeId}" not found in TEST_DEFINITIONS.` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Combine the event config with the test type config
    const fullConfigForFrontend = {
      ...currentEventConfig,
      testTypeConfig: testTypeConfig,
      // For now, feedback is not dynamically fetched here. It would be a separate worker.
      // We'll leave it as an empty array as the frontend expects this property.
      feedback: []
    };

    return new Response(JSON.stringify(fullConfigForFrontend), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error in get-active-test-config Worker:", error);
    return new Response(JSON.stringify({ error: `Internal server error: ${error.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}