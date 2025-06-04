// functions/api/admin/get-events-definitions.js

// Define the KV Key name for consistency
const EVENTS_DEFINITIONS_KEY = "EVENTS_DEFINITIONS";

export async function onRequestGet(context) {
  // context.env contains bindings, including your KV namespace
  // Ensure TASTE_TEST_KV is bound in your Pages project settings
  const { env } = context;

  try {
    const eventsDefinitionsJSON = await env.TASTE_TEST_KV.get(EVENTS_DEFINITIONS_KEY);

    if (!eventsDefinitionsJSON) {
      // If the key doesn't exist, it means no events have been created yet.
      // Return an empty events object so the admin panel can handle it gracefully.
      console.warn("EVENTS_DEFINITIONS_KEY not found in KV. Returning empty events object.");
      return new Response(JSON.stringify({ events: {} }), {
        status: 200, // Successful response, just no data
        headers: { "Content-Type": "application/json" },
      });
    }

    // Attempt to parse the JSON string.
    let allEvents;
    try {
      allEvents = JSON.parse(eventsDefinitionsJSON);
    } catch (e) {
      console.error("Failed to parse EVENTS_DEFINITIONS_KEY from KV. Value:", eventsDefinitionsJSON, e);
      // If parsing fails, return an empty object to prevent admin panel errors and log the issue.
      return new Response(JSON.stringify({ message: "Error parsing events definitions from storage.", events: {} }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Return the parsed events object, nested under an 'events' key as expected by admin.html
    return new Response(JSON.stringify({ events: allEvents }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    // Catch-all for any other unexpected errors (e.g., KV access issues)
    console.error("Error in get-events-definitions function:", error);
    return new Response(
      JSON.stringify({ message: "Server error while fetching events definitions.", error: error.message, events: {} }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
