// functions/api/admin/set-active-event.js

const ACTIVE_EVENT_ID_KEY = "ACTIVE_EVENT_ID";
const EVENTS_DEFINITIONS_KEY = "EVENTS_DEFINITIONS"; // To optionally validate event existence

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    let requestData;
    try {
      requestData = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ message: "Invalid JSON format for request data." }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    const { activeEventId } = requestData;

    if (!activeEventId) {
      return new Response(JSON.stringify({ message: "Active Event ID is required." }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    // Optional: Validate if the eventId actually exists in EVENTS_DEFINITIONS
    // This adds an extra KV read but ensures integrity.
    const eventsDefinitionsJSON = await env.TASTE_TEST_KV.get(EVENTS_DEFINITIONS_KEY);
    if (eventsDefinitionsJSON) {
      try {
        const eventsDefinitions = JSON.parse(eventsDefinitionsJSON);
        if (!eventsDefinitions[activeEventId]) {
          return new Response(JSON.stringify({ message: `Event ID "${activeEventId}" not found in defined events.` }), {
            status: 404, // Not Found
            headers: { "Content-Type": "application/json" }
          });
        }
      } catch (e) {
        console.error("Failed to parse EVENTS_DEFINITIONS_KEY for validation in set-active-event:", e);
        // Proceed with setting if parsing fails, but log it. Could be risky if definitions are corrupt.
      }
    } else {
        // If EVENTS_DEFINITIONS doesn't exist, we can't validate.
        // Depending on strictness, you might choose to error here or proceed.
        console.warn("EVENTS_DEFINITIONS_KEY not found for validation in set-active-event. Proceeding without validation.");
    }


    // Set the active event ID in KV
    await env.TASTE_TEST_KV.put(ACTIVE_EVENT_ID_KEY, activeEventId);

    return new Response(JSON.stringify({ message: `Event "${activeEventId}" set as active successfully.` }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error in set-active-event function:", error);
    return new Response(JSON.stringify({ message: "Server error while setting active event.", error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
