// functions/api/session/[id].js

const PHILL_ADMIN_ID = 'phill_the_admin';
const APP_PREFIX = 'margaritaTrackerV2_'; // To keep key names consistent
const LAST_SESSION_NUM_KEY_KV = `${APP_PREFIX}lastSessionNumericId_KV`; // Key for the global counter

// Helper to generate unique IDs
const generateInternalId = (length = 6) => crypto.randomUUID().replace(/-/g, '').slice(0, length);

async function getSessionData(env, sessionId) {
    if (!env.SESSION_KV) {
        console.error("FUNCTIONS: SESSION_KV binding is missing in session/[id].js getSessionData.");
        throw new Error("Server configuration error: KV binding missing.");
    }
    const sessionKey = `session-${sessionId}`;
    const sessionJson = await env.SESSION_KV.get(sessionKey);
    if (!sessionJson) {
        console.log(`FUNCTIONS: getSessionData - Session not found in KV for ID: ${sessionId}`);
        return null;
    }
    try {
        return JSON.parse(sessionJson);
    } catch (e) {
        console.error(`FUNCTIONS: getSessionData - Error parsing session JSON for ID ${sessionId}:`, e);
        return null;
    }
}

async function saveSessionData(env, sessionId, data) {
    if (!env.SESSION_KV) {
        console.error("FUNCTIONS: SESSION_KV binding is missing in session/[id].js saveSessionData.");
        throw new Error("Server configuration error: KV binding missing for save.");
    }
    const sessionKey = `session-${sessionId}`;
    data.lastUpdatedAt = new Date().toISOString();
    await env.SESSION_KV.put(sessionKey, JSON.stringify(data));
    console.log(`FUNCTIONS: saveSessionData - Session ${sessionId} data saved to KV.`);
}

async function handleGetRequest({ env, params }) {
    const sessionId = params.id;
    console.log(`FUNCTIONS: GET request for session ID: ${sessionId}`);
    try {
        if (!sessionId) {
            return new Response(JSON.stringify({ error: "Session ID is required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        const sessionData = await getSessionData(env, sessionId);
        if (!sessionData) {
            return new Response(JSON.stringify({ error: "Session not found" }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }
        console.log(`FUNCTIONS: Session found for GET ID: ${sessionId}`);
        return new Response(JSON.stringify(sessionData), { headers: { 'Content-Type': 'application/json' }, status: 200 });
    } catch (error) {
        console.error(`FUNCTIONS: Error in GET /api/session/${sessionId}:`, error.message, error.stack);
        return new Response(JSON.stringify({ error: "Failed to retrieve session", details: error.message }), {
            headers: { 'Content-Type': 'application/json' }, status: 500
        });
    }
}

async function handlePostRequest({ request, env, params }) {
    const sessionId = params.id;
    console.log(`FUNCTIONS: POST request to session ID: ${sessionId}`);
    try {
        if (!sessionId) {
            return new Response(JSON.stringify({ error: "Session ID is required" }), { status: 400 });
        }

        let sessionData = await getSessionData(env, sessionId);
        if (!sessionData) {
            return new Response(JSON.stringify({ error: "Session not found to update" }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }
        console.log(`FUNCTIONS: Loaded sessionData. Admin ID for this session is: "${sessionData.adminId}"`);

        const updatePayload = await request.json();
        console.log(`FUNCTIONS: Update action: "${updatePayload.action}" for session ${sessionId}. Payload snippet:`, JSON.stringify(updatePayload.payload).substring(0,100) + "...");

        // Check if action requires admin privileges
        const isAdminAction = ['addLocation', 'resetSession', 'updateCriteria', 'removeLocation'];
        let isAuthorizedForAction = true; // Assume authorized unless it's a specific admin action

        if (isAdminAction.includes(updatePayload.action)) {
            // For these actions, the payload.adminId (or addedBy for addLocation) must match the session's adminId
            const  payloadAdminId = updatePayload.payload.adminId || updatePayload.payload.addedBy;
            if (payloadAdminId !== sessionData.adminId || sessionData.adminId !== PHILL_ADMIN_ID) {
                isAuthorizedForAction = false;
                console.error(`FUNCTIONS: Action "${updatePayload.action}" Unauthorized. Payload adminId/addedBy: "${payloadAdminId}", Session adminId: "${sessionData.adminId}"`);
            } else {
                 console.log(`FUNCTIONS: Action "${updatePayload.action}" Admin Check Passed.`);
            }
        }
         if (!isAuthorizedForAction) {
            return new Response(JSON.stringify({ error: "Unauthorized for this action" }), { status: 403 });
        }


        switch (updatePayload.action) {
            case 'addPlayer':
                console.log("FUNCTIONS: Handling addPlayer action.");
                if (!updatePayload.payload || !updatePayload.payload.playerId || !updatePayload.payload.playerName) {
                    return new Response(JSON.stringify({ error: "Player ID and Name are required" }), { status: 400 });
                }
                const existingPlayer = sessionData.players.find(p => p.id === updatePayload.payload.playerId);
                if (!existingPlayer) {
                    sessionData.players.push({
                        id: updatePayload.payload.playerId,
                        name: updatePayload.payload.playerName,
                        isAdmin: updatePayload.payload.playerId === PHILL_ADMIN_ID 
                    });
                     console.log("FUNCTIONS: New player added:", updatePayload.payload.playerName);
                } else {
                    existingPlayer.name = updatePayload.payload.playerName;
                    console.log("FUNCTIONS: Existing player name updated:", updatePayload.payload.playerName);
                }
                break;

            case 'addLocation':
                console.log("FUNCTIONS: Handling addLocation action (auth check passed).");
                if (!updatePayload.payload || !updatePayload.payload.name ) {
                    console.error("FUNCTIONS: AddLocation error - Location name is missing in payload.");
                    return new Response(JSON.stringify({ error: "Location name is required" }), { status: 400 });
                }
                const newLocation = {
                    id: `loc_${generateInternalId(6)}`,
                    name: updatePayload.payload.name.trim(),
                    ratings: [],
                    addedBy: sessionData.adminId, 
                    addedAt: new Date().toISOString()
                };
                sessionData.locations.push(newLocation);
                console.log("FUNCTIONS: New location added:", newLocation.name);
                break;

            case 'addRating':
                console.log("FUNCTIONS: Handling addRating action.");
                if (!updatePayload.payload || !updatePayload.payload.locationId || !updatePayload.payload.ratings || !updatePayload.payload.playerId) {
                    return new Response(JSON.stringify({ error: "Missing data for rating" }), { status: 400 });
                }
                const locationToRate = sessionData.locations.find(loc => loc.id === updatePayload.payload.locationId);
                if (!locationToRate) {
                    return new Response(JSON.stringify({ error: "Location not found for rating" }), { status: 404 });
                }
                const existingRatingIndex = locationToRate.ratings.findIndex(r => r.playerId === updatePayload.payload.playerId);
                const ratingData = {
                    playerId: updatePayload.payload.playerId,
                    criteria: updatePayload.payload.ratings,
                    comments: updatePayload.payload.comments || "",
                    submittedAt: new Date().toISOString()
                };
                if (existingRatingIndex > -1) {
                    locationToRate.ratings[existingRatingIndex] = { ...locationToRate.ratings[existingRatingIndex], ...ratingData, updatedAt: new Date().toISOString() };
                    console.log("FUNCTIONS: Rating updated for player:", updatePayload.payload.playerId);
                } else {
                    locationToRate.ratings.push(ratingData);
                    console.log("FUNCTIONS: New rating added for player:", updatePayload.payload.playerId);
                }
                break;

            case 'resetSession':
                console.log("FUNCTIONS: Handling resetSession action (auth check passed).");
                sessionData.locations = [];
                sessionData.players = sessionData.players.filter(p => p.id === sessionData.adminId && p.isAdmin);
                
                if (env.SESSION_KV) {
                    await env.SESSION_KV.put(LAST_SESSION_NUM_KEY_KV, "0");
                    console.log("FUNCTIONS: Global session ID counter has been reset to 0.");
                } else {
                    console.error("FUNCTIONS: SESSION_KV binding missing, cannot reset global session counter for resetSession.");
                }
                console.log(`FUNCTIONS: Session ${sessionId} data contents have been reset.`);
                break;
            
            case 'updateCriteria':
                console.log("FUNCTIONS: Handling updateCriteria action (auth check passed).");
                if (!updatePayload.payload || !Array.isArray(updatePayload.payload.criteria)) {
                    return new Response(JSON.stringify({ error: "Criteria data is invalid" }), { status: 400 });
                }
                const hasRatings = sessionData.locations.some(loc => loc.ratings && loc.ratings.length > 0);
                if (hasRatings) {
                    console.warn(`FUNCTIONS: Attempt to change criteria for session ${sessionId} after ratings started. Denied.`);
                    return new Response(JSON.stringify({ error: "Cannot change criteria after ratings have started" }), { status: 403 });
                }
                sessionData.ratingCriteria = updatePayload.payload.criteria.map(c => ({ id: c.id || `crit_${generateInternalId(4)}`, text: c.text }));
                console.log(`FUNCTIONS: Criteria updated for session ${sessionId}`);
                break;

            case 'removeLocation':
                console.log("FUNCTIONS: Handling removeLocation action (auth check passed).");
                if (!updatePayload.payload || !updatePayload.payload.locationId) {
                    console.error("FUNCTIONS: RemoveLocation error - locationId missing.");
                    return new Response(JSON.stringify({ error: "Location ID is required" }), { status: 400 });
                }
                const initialLocCount = sessionData.locations.length;
                sessionData.locations = sessionData.locations.filter(loc => loc.id !== updatePayload.payload.locationId);
                if (sessionData.locations.length < initialLocCount) {
                    console.log("FUNCTIONS: Location removed:", updatePayload.payload.locationId);
                } else {
                     console.warn("FUNCTIONS: RemoveLocation - Location ID not found for removal:", updatePayload.payload.locationId);
                }
                break;

            default:
                console.warn(`FUNCTIONS: Unknown action received: "${updatePayload.action}"`);
                return new Response(JSON.stringify({ error: `Unknown action: ${updatePayload.action}` }), { status: 400 });
        }

        await saveSessionData(env, sessionId, sessionData);
        console.log(`FUNCTIONS: Session ${sessionId} successfully updated in KV after action: "${updatePayload.action}"`);

        return new Response(JSON.stringify(sessionData), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        let action = "unknown_action_in_catch";
        try { if(request && typeof request.json === 'function') { const p = await request.clone().json(); action = p.action || action;} } catch(e){}
        console.error(`FUNCTIONS: Error in POST /api/session/${sessionId} (Action: ${action}):`, error.message, error.stack);
        return new Response(JSON.stringify({ error: "Failed to update session", details: error.message }), {
            headers: { 'Content-Type': 'application/json' }, status: 500
        });
    }
}

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
            console.log(`FUNCTIONS: Method ${request.method} Not Allowed for /api/session/[id]`);
            return new Response('Method Not Allowed', { status: 405, headers: { 'Allow': 'GET, POST' } });
    }
}