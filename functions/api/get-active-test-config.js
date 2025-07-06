export async function onRequest(context) {
    const { env } = context;

    try {
        // 1. Get the active event ID
        const activeEventId = await env.MargaritaSessionData.get("ACTIVE_EVENT_ID");
        if (!activeEventId) {
            return new Response(JSON.stringify({ error: "No active event configured." }), {
                headers: { 'Content-Type': 'application/json' },
                status: 404
            });
        }

        // 2. Get all event definitions (assuming it's a single JSON blob for now, as per your past setup)
        // In a more scalable setup, these would be individual keys like "event:id"
        const eventsDefinitionsRaw = await env.MargaritaSessionData.get("EVENTS_DEFINITIONS");
        if (!eventsDefinitionsRaw) {
            return new Response(JSON.stringify({ error: "EVENTS_DEFINITIONS not found in KV." }), {
                headers: { 'Content-Type': 'application/json' },
                status: 404
            });
        }
        const eventsDefinitions = JSON.parse(eventsDefinitionsRaw);
        const activeEvent = eventsDefinitions[activeEventId];

        if (!activeEvent) {
            return new Response(JSON.stringify({ error: `Active event '${activeEventId}' not found in EVENTS_DEFINITIONS.` }), {
                headers: { 'Content-Type': 'application/json' },
                status: 404
            });
        }

        // 3. Get all test definitions (assuming single JSON blob)
        // In a more scalable setup, these would be individual keys like "test:id"
        const testDefinitionsRaw = await env.MargaritaSessionData.get("TEST_DEFINITIONS");
        if (!testDefinitionsRaw) {
            return new Response(JSON.stringify({ error: "TEST_DEFINITIONS not found in KV." }), {
                headers: { 'Content-Type': 'application/json' },
                status: 404
            });
        }
        const testDefinitions = JSON.parse(testDefinitionsRaw);
        const testTypeConfig = testDefinitions[activeEvent.testTypeId];

        if (!testTypeConfig) {
            return new Response(JSON.stringify({ error: `Test type '${activeEvent.testTypeId}' not found in TEST_DEFINITIONS.` }), {
                headers: { 'Content-Type': 'application/json' },
                status: 404
            });
        }

        // 4. Get all feedback (ratings) for this active event
        // Assuming feedback is stored with a prefix like 'feedback:<eventId>:<locationId>:<itemId>:<playerId>' or aggregated under 'event_feedback:<eventId>'
        // For simplicity with this rollback, let's assume feedback keys are 'feedback:<eventId>:<submissionId>' or similar
        // For truly aggregating ALL feedback for an event, we need to list keys and filter.
        // Let's refine the feedback storage for this. The `submit-feedback.js` will store it differently.
        // For now, this worker will try to fetch ALL feedback for the given event.

        const feedbackKeys = await env.MargaritaSessionData.list({ prefix: `feedback:${activeEventId}:` });
        const feedbackPromises = feedbackKeys.keys.map(key => env.MargaritaSessionData.get(key.name));
        const allFeedbackRaw = await Promise.all(feedbackPromises);
        const feedbackData = allFeedbackRaw.map(raw => JSON.parse(raw));

        // Combine all data into a single object for the frontend
        const fullConfig = {
            eventId: activeEvent.eventId,
            eventName: activeEvent.eventName,
            adminId: activeEvent.adminId, // Ensure adminId is included
            activeLocationId: activeEvent.activeLocationId,
            locations: activeEvent.locations,
            testTypeConfig: testTypeConfig, // Contains questions and explanation
            feedback: feedbackData // All submitted feedback for this event
        };

        return new Response(JSON.stringify(fullConfig), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Error in get-active-test-config:", error);
        return new Response(JSON.stringify({ error: `Internal server error: ${error.message}` }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
}