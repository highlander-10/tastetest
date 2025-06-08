// File: functions/api/admin/set-active-location.js

const EVENTS_DEFINITIONS_KEY = "EVENTS_DEFINITIONS";

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { eventId, locationId } = await request.json();

    if (!eventId || !locationId) {
      return new Response(JSON.stringify({ message: "Event ID and Location ID are required." }), { status: 400 });
    }

    // Fetch the master events object
    const eventsJson = await env.TASTE_TEST_KV.get(EVENTS_DEFINITIONS_KEY);
    if (!eventsJson) {
      return new Response(JSON.stringify({ message: "Event definitions not found." }), { status: 404 });
    }

    const allEvents = JSON.parse(eventsJson);
    const eventToUpdate = allEvents[eventId];

    if (!eventToUpdate) {
      return new Response(JSON.stringify({ message: `Event ID "${eventId}" not found.` }), { status: 404 });
    }

    // Validate that the location exists within this event before setting it as active
    const locationExists = eventToUpdate.locations?.some(loc => loc.locationId === locationId);
    if (!locationExists) {
        return new Response(JSON.stringify({ message: `Location ID "${locationId}" does not exist in this event.` }), { status: 404 });
    }

    // Set the active location ID on the event
    eventToUpdate.activeLocationId = locationId;

    // Save the entire updated object back to KV
    await env.TASTE_TEST_KV.put(EVENTS_DEFINITIONS_KEY, JSON.stringify(allEvents));

    return new Response(JSON.stringify({ message: `Location "${locationId}" is now the active location for the event.` }), { status: 200 });

  } catch (error) {
    console.error("Error in set-active-location:", error);
    return new Response(JSON.stringify({ message: "Server error while setting active location." }), { status: 500 });
  }
}