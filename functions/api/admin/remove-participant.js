// File: functions/api/admin/remove-participant.js

const EVENTS_DEFINITIONS_KEY = "EVENTS_DEFINITIONS";
const DEFAULT_PARTICIPANT = "Phill"; // Match the admin panel's default

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { eventId, participantName } = await request.json();

    if (!eventId || !participantName) {
      return new Response(JSON.stringify({ message: "Event ID and Participant Name are required." }), { status: 400 });
    }
    
    // Prevent removal of the default admin/participant
    if (participantName === DEFAULT_PARTICIPANT) {
        return new Response(JSON.stringify({ message: "The default participant cannot be removed." }), { status: 403 }); // Forbidden
    }

    const eventsJson = await env.TASTE_TEST_KV.get(EVENTS_DEFINITIONS_KEY);
    const allEvents = JSON.parse(eventsJson || '{}');
    const eventToUpdate = allEvents[eventId];

    if (!eventToUpdate || !eventToUpdate.participants) {
      return new Response(JSON.stringify({ message: "Event or participant list not found." }), { status: 404 });
    }

    // Filter out the participant to remove
    eventToUpdate.participants = eventToUpdate.participants.filter(p => p !== participantName);

    // Save the entire updated object back to KV
    await env.TASTE_TEST_KV.put(EVENTS_DEFINITIONS_KEY, JSON.stringify(allEvents));

    return new Response(JSON.stringify({ message: `Participant "${participantName}" removed successfully.` }), { status: 200 });

  } catch (error) {
    console.error("Error in remove-participant:", error);
    return new Response(JSON.stringify({ message: "Server error while removing participant." }), { status: 500 });
  }
}