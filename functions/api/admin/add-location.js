// functions/api/admin/add-location.js

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

    const { eventId, locationName } = requestData;

    if (!eventId || !locationName) {
      return new Response(JSON.stringify({ message: "Event ID and Location Name are required." }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    // Fetch existing events definitions
    const eventsDefinitionsJSON = await env.TASTE_TEST_KV.get(EVENTS_DEFINITIONS_KEY);
    if (!eventsDefinitionsJSON) {
      // This shouldn't happen if events are being created, but handle defensively.
      return new Response(JSON.stringify({ message: "Events definitions not found. Cannot add location." }), {
        status: 404, headers: { "Content-Type": "application/json" }
      });
    }

    let eventsDefinitions;
    try {
      eventsDefinitions = JSON.parse(eventsDefinitionsJSON);
    } catch (e) {
      console.error("Failed to parse existing EVENTS_DEFINITIONS_KEY from KV in add-location:", e);
      return new Response(JSON.stringify({ message: "Error reading event data from storage." }), {
        status: 500, headers: { "Content-Type": "application/json" }
      });
    }

    // Find the event to add the location to
    const eventToUpdate = eventsDefinitions[eventId];
    if (!eventToUpdate) {
      return new Response(JSON.stringify({ message: `Event ID "${eventId}" not found. Cannot add location.` }), {
        status: 404, headers: { "Content-Type": "application/json" }
      });
    }

    // Ensure locations array exists
    if (!eventToUpdate.locations) {
      eventToUpdate.locations = [];
    }

    // Generate a unique location ID (simple example)
    const locationId = `loc_${locationName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;

    // Add the new location object
    eventToUpdate.locations.push({
      locationId: locationId,
      locationName: locationName,
      items: [], // New locations start with no items
      allowCustomItem: false // Default to not allowing custom items, admin can change this later
    });

    // Save the updated events definitions back to KV
    await env.TASTE_TEST_KV.put(EVENTS_DEFINITIONS_KEY, JSON.stringify(eventsDefinitions));

    return new Response(JSON.stringify({ 
        message: `Location "${locationName}" added successfully to event "${eventToUpdate.eventName}".`, 
        locationId: locationId,
        updatedEvent: eventToUpdate // Send back the updated event for the admin panel if needed
    }), {
      status: 201, // Created
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error in add-location function:", error);
    return new Response(JSON.stringify({ message: "Server error while adding location.", error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
