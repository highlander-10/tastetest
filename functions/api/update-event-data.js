export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const updatedEvent = await request.json();

        // Basic validation: ensure eventId and locations array are present
        if (!updatedEvent.eventId || !Array.isArray(updatedEvent.locations) || !updatedEvent.adminId) {
            return new Response(JSON.stringify({ error: "Invalid event data provided for update." }), {
                headers: { 'Content-Type': 'application/json' },
                status: 400
            });
        }

        // For security: In a real app, you'd verify the requesting user is the actual admin.
        // For this rollback, we're trusting the client-side 'isAdmin' flag but the worker
        // *could* add a check here against an 'admin:id' key in KV if needed.
        // For now, we'll assume the client is correctly sending the adminId.

        // Load the existing EVENTS_DEFINITIONS to update it
        const eventsDefinitionsRaw = await env.MargaritaSessionData.get("EVENTS_DEFINITIONS");
        let eventsDefinitions = {};
        if (eventsDefinitionsRaw) {
            eventsDefinitions = JSON.parse(eventsDefinitionsRaw);
        }

        // Update the specific event within the overall definitions
        eventsDefinitions[updatedEvent.eventId] = updatedEvent;

        // Save the updated EVENTS_DEFINITIONS back to KV
        await env.MargaritaSessionData.put("EVENTS_DEFINITIONS", JSON.stringify(eventsDefinitions));

        // Also ensure ACTIVE_EVENT_ID is pointing to this event if it changed or this is a new event
        // This worker could also handle setting the active event if the admin requests it.
        // For simplicity here, we assume the frontend might trigger an update if activeLocationId changes.

        return new Response(JSON.stringify({ success: true, message: "Event data updated." }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Error in update-event-data:", error);
        return new Response(JSON.stringify({ error: `Internal server error: ${error.message}` }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
}