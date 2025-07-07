export async function onRequest(context) {
    console.log("Worker: get-active-test-config function invoked!");
    const { env } = context;

    try {
        // 1. Get the active event ID
        console.log("Worker: Attempting to get ACTIVE_EVENT_ID from KV.");
        const activeEventId = await env.MargaritaSessionData.get("ACTIVE_EVENT_ID");
        if (!activeEventId) {
            console.error("Worker Error: ACTIVE_EVENT_ID not found in KV!");
            return new Response(JSON.stringify({ error: "No active event configured." }), {
                headers: { 'Content-Type': 'application/json' },
                status: 404
            });
        }
        console.log(`Worker: ACTIVE_EVENT_ID found: ${activeEventId}`);

        // 2. Get all event definitions
        console.log("Worker: Attempting to get EVENTS_DEFINITIONS from KV.");
        const eventsDefinitionsRaw = await env.MargaritaSessionData.get("EVENTS_DEFINITIONS");
        if (!eventsDefinitionsRaw) {
            console.error("Worker Error: EVENTS_DEFINITIONS not found in KV!");
            return new Response(JSON.stringify({ error: "EVENTS_DEFINITIONS not found in KV." }), {
                headers: { 'Content-Type': 'application/json' },
                status: 404
            });
        }
        const eventsDefinitions = JSON.parse(eventsDefinitionsRaw);
        console.log("Worker: EVENTS_DEFINITIONS parsed successfully.");
        const activeEvent = eventsDefinitions[activeEventId];

        if (!activeEvent) {
            console.error(`Worker Error: Active event '${activeEventId}' not found in EVENTS_DEFINITIONS object.`);
            return new Response(JSON.stringify({ error: `Active event '${activeEventId}' not found in EVENTS_DEFINITIONS.` }), {
                headers: { 'Content-Type': 'application/json' },
                status: 404
            });
        }
        console.log(`Worker: Active event '${activeEventId}' found and parsed.`);


        // 3. Get all test definitions
        console.log("Worker: Attempting to get TEST_DEFINITIONS from KV.");
        const testDefinitionsRaw = await env.MargaritaSessionData.get("TEST_DEFINITIONS");
        if (!testDefinitionsRaw) {
            console.error("Worker Error: TEST_DEFINITIONS not found in KV!");
            return new Response(JSON.stringify({ error: "TEST_DEFINITIONS not found in KV." }), {
                headers: { 'Content-Type': 'application/json' },
                status: 404
            });
        }
        const testDefinitions = JSON.parse(testDefinitionsRaw);
        console.log("Worker: TEST_DEFINITIONS parsed successfully.");
        const testTypeConfig = testDefinitions[activeEvent.testTypeId];

        if (!testTypeConfig) {
            console.error(`Worker Error: Test type '${activeEvent.testTypeId}' not found in TEST_DEFINITIONS object.`);
            return new Response(JSON.stringify({ error: `Test type '${activeEvent.testTypeId}' not found in TEST_DEFINITIONS.` }), {
                headers: { 'Content-Type': 'application/json' },
                status: 404
            });
        }
        console.log(`Worker: Test type '${activeEvent.testTypeId}' found and parsed.`);


        // 4. Get all feedback (ratings) for this active event
        console.log(`Worker: Listing feedback keys for prefix: feedback:${activeEventId}:`);
        const feedbackKeys = await env.MargaritaSessionData.list({ prefix: `feedback:${activeEventId}:` });
        console.log(`Worker: Found ${feedbackKeys.keys.length} feedback keys.`);
        const feedbackPromises = feedbackKeys.keys.map(key => env.MargaritaSessionData.get(key.name));
        const allFeedbackRaw = await Promise.all(feedbackPromises);
        const feedbackData = allFeedbackRaw.map(raw => JSON.parse(raw));
        console.log("Worker: All feedback data fetched and parsed.");


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

        console.log("Worker: Full config prepared. Sending JSON response.");
        return new Response(JSON.stringify(fullConfig), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Worker FATAL Error in get-active-test-config:", error.message, error.stack); // More verbose error logging
        return new Response(JSON.stringify({ error: `Internal server error: ${error.message}. Check Worker logs.` }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
}