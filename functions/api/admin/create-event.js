// functions/api/admin/create-event.js

const EVENTS_DEFINITIONS_KEY = "EVENTS_DEFINITIONS";

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    let newEventData;
    try {
      newEventData = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ message: "Invalid JSON format for new event data." }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    const { eventName, testTypeId } = newEventData;

    if (!eventName || !testTypeId) {
      return new Response(JSON.stringify({ message: "Event name and test type ID are required." }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    // Fetch existing events definitions
    let eventsDefinitions = {};
    const eventsDefinitionsJSON = await env.TASTE_TEST_KV.get(EVENTS_DEFINITIONS_KEY);
    if (eventsDefinitionsJSON) {
      try {
        eventsDefinitions = JSON.parse(eventsDefinitionsJSON);
      } catch (e) {
        console.error("Failed to parse existing EVENTS_DEFINITIONS_KEY from KV:", e);
        // Don't let unparseable existing data stop creation; treat as empty if corrupt.
        // You might want more robust error handling or recovery here in a production system.
        eventsDefinitions = {};
      }
    }

    // Generate a unique event ID (simple example)
    const eventId = `${eventName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;

    if (eventsDefinitions[eventId]) {
      // Highly unlikely with timestamp, but good to check
      return new Response(JSON.stringify({ message: "Event ID already exists. Please try a different name or try again." }), {
        status: 409, // Conflict
        headers: { "Content-Type": "application/json" }
      });
    }

    // Create the new event object structure
    eventsDefinitions[eventId] = {
      eventId: eventId,
      eventName: eventName,
      testTypeId: testTypeId,
      activeLocationId: null, // No active location initially
      locations: []           // Empty array for locations initially
    };

    // Save the updated events definitions back to KV
    await env.TASTE_TEST_KV.put(EVENTS_DEFINITIONS_KEY, JSON.stringify(eventsDefinitions));

    return new Response(JSON.stringify({ message: `Event "${eventName}" created successfully with ID: ${eventId}`, eventId: eventId }), {
      status: 201, // Created
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error in create-event function:", error);
    return new Response(JSON.stringify({ message: "Server error while creating event.", error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
