// functions/api/admin/set-active-location.js

const EVENTS_DEFINITIONS_KEY = "EVENTS_DEFINITIONS";

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

    const { eventId, activeLocationId } = requestData;

    if (!eventId || !activeLocationId) {
      return new Response(JSON.stringify({ message: "Event ID and Active Location ID are required." }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    // Fetch existing events definitions
    const eventsDefinitionsJSON = await env.TASTE_TEST_KV.get(EVENTS_DEFINITIONS_KEY);
    if (!eventsDefinitionsJSON) {
      return new Response(JSON.stringify({ message: "Events definitions not found. Cannot set active location." }), {
        status: 404, headers: { "Content-Type": "application/json" }
      });
    }

    let eventsDefinitions;
    try {
      eventsDefinitions = JSON.parse(eventsDefinitionsJSON);
    } catch (e) {
      console.error("Failed to parse existing EVENTS_DEFINITIONS_KEY from KV in set-active-location:", e);
      return new Response(JSON.stringify({ message: "Error reading event data from storage." }), {
        status: 500, headers: { "Content-Type": "application/json" }
      });
    }

    // Find the event to update
    const eventToUpdate = eventsDefinitions[eventId];
    if (!eventToUpdate) {
      return new Response(JSON.stringify({ message: `Event ID "${eventId}" not found.` }), {
        status: 404, headers: { "Content-Type": "application/json" }
      });
    }

    // Validate that the locationId actually exists within this event's locations
    if (eventToUpdate.locations && Array.isArray(eventToUpdate.locations)) {
        const locationExists = eventToUpdate.locations.some(loc => loc.locationId === activeLocationId);
        if (!locationExists) {
            return new Response(JSON.stringify({ message: `Location ID "${activeLocationId}" not found within event "${eventId}".` }), {
                status: 404, headers: { "Content-Type": "application/json" }
            });
        }
    } else {
        // Event has no locations array, so the activeLocationId cannot be valid
        return new Response(JSON.stringify({ message: `Event "${eventId}" has no locations defined. Cannot set active location.` }), {
            status: 404, headers: { "Content-Type": "application/json" }
        });
    }
    
    // Update the activeLocationId for this specific event
    eventToUpdate.activeLocationId = activeLocationId;

    // Save the updated events definitions back to KV
    await env.TASTE_TEST_KV.put(EVENTS_DEFINITIONS_KEY, JSON.stringify(eventsDefinitions));

    return new Response(JSON.stringify({ 
        message: `Location "${activeLocationId}" set as active for event "${eventToUpdate.eventName}".`,
        updatedEvent: eventToUpdate // Send back the updated event for the admin panel if needed
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error in set-active-location function:", error);
    return new Response(JSON.stringify({ message: "Server error while setting active location.", error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
