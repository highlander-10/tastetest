export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const feedback = await request.json();

        // Basic validation of incoming feedback structure
        if (!feedback.eventId || !feedback.locationId || !feedback.itemId || !feedback.playerId || !feedback.ratings) {
            return new Response(JSON.stringify({ error: "Missing required feedback fields." }), {
                headers: { 'Content-Type': 'application/json' },
                status: 400
            });
        }

        // Create a unique key for each feedback submission
        // Example: feedback:<eventId>:<locationId>:<itemId>:<playerId>:<timestamp>
        const feedbackKey = `feedback:${feedback.eventId}:${feedback.locationId}:${feedback.itemId}:${feedback.playerId}:${Date.now()}`;

        // Store the feedback in KV
        await env.MargaritaSessionData.put(feedbackKey, JSON.stringify(feedback));

        return new Response(JSON.stringify({ success: true, message: "Feedback submitted." }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Error in submit-feedback:", error);
        return new Response(JSON.stringify({ error: `Internal server error: ${error.message}` }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
}