// File: functions/api/admin/add-participant.js

const EVENTS_DEFINITIONS_KEY = "EVENTS_DEFINITIONS";

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { eventId, participantName } = await request.json();

    if (!eventId || !participantName) {
      return new Response(JSON.stringify({ message: "Event ID and Participant Name are required." }), { status: 400 });
    }

    const eventsJson = await env.TASTE_TEST_KV.get(EVENTS_DEFINITIONS_KEY);
    if (!eventsJson) {
      return new Response(JSON.stringify({ message: "Event definitions not found." }), { status: 404 });
    }

    const allEvents = JSON.parse(eventsJson);
    const eventToUpdate = allEvents[eventId];

    if (!eventToUpdate) {
      return new Response(JSON.stringify({ message: `Event ID "${eventId}" not found.` }), { status: 404 });
    }

    // Initialize participants array if it doesn't exist
    if (!eventToUpdate.participants || !Array.isArray(eventToUpdate.participants)) {
      eventToUpdate.participants = [];
    }

    // Add the new participant if they are not already in the list
    if (!eventToUpdate.participants.includes(participantName)) {
      eventToUpdate.participants.push(participantName);
    } else {
       return new Response(JSON.stringify({ message: "Participant already exists in this event." }), { status: 409 }); // 409 Conflict
    }

    // Save the entire updated object back to KV
    await env.TASTE_TEST_KV.put(EVENTS_DEFINITIONS_KEY, JSON.stringify(allEvents));

    return new Response(JSON.stringify({ message: `Participant "${participantName}" added successfully.` }), { status: 200 });

  } catch (error) {
    console.error("Error in add-participant:", error);
    return new Response(JSON.stringify({ message: "Server error while adding participant." }), { status: 500 });
  }
}