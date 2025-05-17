// functions/api/session/[id].js

const PHILL_ADMIN_ID = 'phill_the_admin'; // Ensure this matches client-side

// Helper to generate unique IDs (if needed server-side for new sub-items)
const generateInternalId = (length = 6) => crypto.randomUUID().replace(/-/g, '').slice(0, length);

async function getSessionData(env, sessionId) {
    if (!env.SESSION_KV) {
        console.error("FUNCTIONS: SESSION_KV binding is missing in session/[id].js. Check Pages project settings.");
        throw new Error("Server configuration error: KV binding missing.");
    }
    const sessionKey = `session-${sessionId}`;
    const sessionJson = await env.SESSION_KV.get(sessionKey);
    if (!sessionJson) return null;
    return JSON.parse(sessionJson);
}

async function saveSessionData(env, sessionId, data) {
    if (!env.SESSION_KV) {
        console.error("FUNCTIONS: SESSION_KV binding is missing. Cannot save.");
        throw new Error("Server configuration error: KV binding missing for save.");
    }
    const sessionKey = `session-${sessionId}`;
    data.lastUpdatedAt = new Date().toISOString();
    await env.SESSION_KV.put(sessionKey, JSON.stringify(data));
}


export async function onRequestGet({ env, params }) {
    try {
        const sessionId = params.id;
        console.log(`FUNCTIONS: GET request for session ID: ${sessionId}`);

        if (!sessionId) {
            return new Response(JSON.stringify({ error: "Session ID is required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const sessionData = await getSessionData(env, sessionId);

        if (!sessionData) {
            console.log(`FUNCTIONS: Session not found in KV for ID: ${sessionId}`);
            return new Response(JSON.stringify({ error: "Session not found" }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        console.log(`FUNCTIONS: Session found for ID: ${sessionId}`);
        return new Response(JSON.stringify(sessionData), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        console.error(`FUNCTIONS: Error in GET /api/session/${params.id}:`, error.message, error.stack);
        return new Response(JSON.stringify({ error: "Failed to retrieve session", details: error.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
}

export async function onRequestPost({ request, env, params }) {
    try {
        const sessionId = params.id;
        console.log(`FUNCTIONS: POST request to session ID: ${sessionId}`);

        if (!sessionId) {
            return new Response(JSON.stringify({ error: "Session ID is required" }), { status: 400 });
        }

        let sessionData = await getSessionData(env, sessionId);
        if (!sessionData) {
            return new Response(JSON.stringify({ error: "Session not found to update" }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        const updatePayload = await request.json();
        console.log(`FUNCTIONS: Update action: ${updatePayload.action} for session ${sessionId}. Payload:`, JSON.stringify(updatePayload.payload).substring(0,100) + "...");

        // Simple check: is the action from the admin of this session?
        const isActionByAdmin = updatePayload.payload && updatePayload.payload.playerId === sessionData.adminId;

        switch (updatePayload.action) {
            case 'addPlayer':
                if (!updatePayload.payload || !updatePayload.payload.playerId || !updatePayload.payload.playerName) {
                    return new Response(JSON.stringify({ error: "Player ID and Name are required" }), { status: 400 });
                }
                const existingPlayer = sessionData.players.find(p => p.id === updatePayload.payload.playerId);
                if (!existingPlayer) {
                    sessionData.players.push({
                        id: updatePayload.payload.playerId,
                        name: updatePayload.payload.playerName,
                        isAdmin: updatePayload.payload.playerId === PHILL_ADMIN_ID // Only Phill can be admin
                    });
                } else {
                    existingPlayer.name = updatePayload.payload.playerName; // Update name if rejoining
                }
                break;

            case 'addLocation':
                if (!isActionByAdmin) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
                if (!updatePayload.payload || !updatePayload.payload.name ) { // addedBy comes from currentPlayerId on client, which is admin
                    return new Response(JSON.stringify({ error: "Location name is required" }), { status: 400 });
                }
                const newLocation = {
                    id: `loc_${generateInternalId(6)}`,
                    name: updatePayload.payload.name.trim(),
                    ratings: [],
                    addedBy: sessionData.adminId, // Ensure adminId from sessionData
                    addedAt: new Date().toISOString()
                };
                sessionData.locations.push(newLocation);
                break;

            case 'addRating':
                if (!updatePayload.payload || !updatePayload.payload.locationId || !updatePayload.payload.ratings || !updatePayload.payload.playerId) {
                    return new Response(JSON.stringify({ error: "Missing data for rating" }), { status: 400 });
                }
                const location = sessionData.locations.find(loc => loc.id === updatePayload.payload.locationId);
                if (!location) {
                    return new Response(JSON.stringify({ error: "Location not found for rating" }), { status: 404 });
                }
                const existingRatingIndex = location.ratings.findIndex(r => r.playerId === updatePayload.payload.playerId);
                const ratingData = {
                    playerId: updatePayload.payload.playerId,
                    criteria: updatePayload.payload.ratings,
                    comments: updatePayload.payload.comments || "",
                    submittedAt: new Date().toISOString()
                };
                if (existingRatingIndex > -1) {
                    location.ratings[existingRatingIndex] = { ...location.ratings[existingRatingIndex], ...ratingData, updatedAt: new Date().toISOString() };
                } else {
                    location.ratings.push(ratingData);
                }
                break;

            case 'resetSession':
                if (!isActionByAdmin) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
                sessionData.locations = [];
                sessionData.players = sessionData.players.filter(p => p.id === sessionData.adminId && p.isAdmin); // Keep only admin
                // Criteria are typically not reset unless explicitly told to
                console.log(`FUNCTIONS: Session ${sessionId} reset`);
                break;
            
            case 'updateCriteria':
                if (!isActionByAdmin) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
                if (!updatePayload.payload || !Array.isArray(updatePayload.payload.criteria)) {
                    return new Response(JSON.stringify({ error: "Criteria data is invalid" }), { status: 400 });
                }
                const hasRatings = sessionData.locations.some(loc => loc.ratings && loc.ratings.length > 0);
                if (hasRatings) {
                    // For simplicity, prevent criteria change if ratings exist.
                    // A more complex app might archive old ratings or map them.
                    return new Response(JSON.stringify({ error: "Cannot change criteria after ratings have started" }), { status: 403 });
                }
                sessionData.ratingCriteria = updatePayload.payload.criteria;
                console.log(`FUNCTIONS: Criteria updated for session ${sessionId}`);
                break;

            default:
                console.warn(`FUNCTIONS: Unknown action: ${updatePayload.action}`);
                return new Response(JSON.stringify({ error: `Unknown action: ${updatePayload.action}` }), { status: 400 });
        }

        await saveSessionData(env, sessionId, sessionData);
        console.log(`FUNCTIONS: Session ${sessionId} updated in KV. Action: ${updatePayload.action}`);

        return new Response(JSON.stringify(sessionData), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        let action = "unknown";
        try {
            if (request && request.body) {
                const clonedRequest = request.clone(); // Clone before consuming body
                const payload = await clonedRequest.json();
                action = payload.action || "unknown";
            }
        } catch (e) { /* ignore if can't get action */ }

        console.error(`FUNCTIONS: Error in POST /api/session/${params.id} for action ${action}:`, error.message, error.stack);
        return new Response(JSON.stringify({ error: "Failed to update session", details: error.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
}

// This handles all methods for /api/session/[id]. Cloudflare Pages will call the appropriate function.
export async function onRequest({ request, env, params }) {
    if (!env.SESSION_KV) {
        console.error("FUNCTIONS: SESSION_KV binding is missing in session/[id].js onRequest. Check Pages project settings.");
        return new Response(JSON.stringify({ error: "Server configuration error: KV binding missing." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    switch (request.method) {
        case 'GET':
            return await handleGetRequest({ env, params });
        case 'POST':
            return await handlePostRequest({ request, env, params });
        default:
            return new Response('Method Not Allowed', { status: 405 });
    }
}