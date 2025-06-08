// File: functions/api/admin/toggle-custom-names.js

const EVENTS_DEFINITIONS_KEY = "EVENTS_DEFINITIONS";

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { eventId, allowCustomParticipantNames } = await request.json();

    if (!eventId || typeof allowCustomParticipantNames !== 'boolean') {
      return new Response(JSON.stringify({ message: "Event ID and a boolean 'allowCustomParticipantNames' flag are required." }), { status: 400 });
    }

    const eventsJson = await env.TASTE_TEST_KV.get(EVENTS_DEFINITIONS_KEY);
    const allEvents = JSON.parse(eventsJson || '{}');
    const eventToUpdate = allEvents[eventId];

    if (!eventToUpdate) {
      return new Response(JSON.stringify({ message: `Event ID "${eventId}" not found.` }), { status: 404 });
    }

    // Set the flag on the event object
    eventToUpdate.allowCustomParticipantNames = allowCustomParticipantNames;

    // Save the entire updated object back to KV
    await env.TASTE_TEST_KV.put(EVENTS_DEFINITIONS_KEY, JSON.stringify(allEvents));

    const status = allowCustomParticipantNames ? "enabled" : "disabled";
    return new Response(JSON.stringify({ message: `Allowing custom participant names has been ${status}.` }), { status: 200 });

  } catch (error) {
    console.error("Error in toggle-custom-names:", error);
    return new Response(JSON.stringify({ message: "Server error while updating setting." }), { status: 500 });
  }
}