// functions/api/create-session.js

const DEFAULT_RATING_CRITERIA_TEXT = [
    'Taste', 'Sweetness', 'Spiciness (if any)', 'Overall Quality',
    'Service Efficiency', 'Atmosphere', 'Value for Cost'
];
const PHILL_ADMIN_ID = 'phill_the_admin'; // Ensure this matches your client-side constant
const APP_PREFIX = 'margaritaTrackerV2_'; // Consistent prefix
const LAST_SESSION_NUM_KEY_KV = `${APP_PREFIX}lastSessionNumericId_KV`; // KV specific key for the counter

// Helper to generate unique IDs for criteria, locations etc.
const generateInternalId = (length = 6) => crypto.randomUUID().replace(/-/g, '').slice(0, length);

export async function onRequestPost({ env }) {
    try {
        console.log("FUNCTIONS: /api/create-session POST request received");

        if (!env.SESSION_KV) {
            console.error("FUNCTIONS: SESSION_KV binding is missing in create-session.js. Check Pages project settings -> Functions -> KV namespace bindings. Variable name should be SESSION_KV.");
            return new Response(JSON.stringify({ error: "Server configuration error: KV binding missing." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }

        let lastNumericIdStr = await env.SESSION_KV.get(LAST_SESSION_NUM_KEY_KV);
        let lastNumericId = parseInt(lastNumericIdStr, 10) || 0;
        const newNumericSessionId = lastNumericId + 1;
        await env.SESSION_KV.put(LAST_SESSION_NUM_KEY_KV, newNumericSessionId.toString());
        const currentSessionIdStr = String(newNumericSessionId);

        console.log("FUNCTIONS: New Numeric Session ID:", currentSessionIdStr);

        const defaultCriteria = DEFAULT_RATING_CRITERIA_TEXT.map((text, index) => ({
            id: `crit_${generateInternalId(4)}_${index}`, text: text
        }));

        const sessionData = {
            sessionId: currentSessionIdStr,
            adminId: PHILL_ADMIN_ID,
            players: [{ id: PHILL_ADMIN_ID, name: "Phill (Admin)", isAdmin: true }],
            locations: [],
            ratingCriteria: defaultCriteria,
            state: 'active',
            createdAt: new Date().toISOString(),
            lastUpdatedAt: new Date().toISOString(),
        };

        // Store the main session data under a key like "session-1", "session-2", etc.
        await env.SESSION_KV.put(`session-${currentSessionIdStr}`, JSON.stringify(sessionData));
        console.log("FUNCTIONS: Session data created and saved to KV for session:", currentSessionIdStr);

        return new Response(JSON.stringify(sessionData), {
            headers: { 'Content-Type': 'application/json' },
            status: 201 // 201 Created
        });

    } catch (error) {
        console.error("FUNCTIONS: Error in /api/create-session:", error.message, error.stack);
        return new Response(JSON.stringify({ error: "Failed to create session", details: error.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
}