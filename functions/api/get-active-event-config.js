// functions/api/get-active-event-config.js

const ACTIVE_EVENT_ID_KEY = "ACTIVE_EVENT_ID";
const EVENTS_DEFINITIONS_KEY = "EVENTS_DEFINITIONS";
const TEST_DEFINITIONS_KEY = "TEST_DEFINITIONS"; // For base questions/themes

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const activeEventId = await env.TASTE_TEST_KV.get(ACTIVE_EVENT_ID_KEY);
    if (!activeEventId) {
      return new Response(JSON.stringify({ message: "No active tasting event is currently set by the admin." }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }

    const eventsDefinitionsJSON = await env.TASTE_TEST_KV.get(EVENTS_DEFINITIONS_KEY);
    if (!eventsDefinitionsJSON) {
      console.error("CRITICAL: EVENTS_DEFINITIONS_KEY not found in KV.");
      return new Response(JSON.stringify({ message: "Event definitions not found on server." }), {
        status: 500, headers: { "Content-Type": "application/json" },
      });
    }

    const allEvents = JSON.parse(eventsDefinitionsJSON);
    const activeEvent = allEvents[activeEventId];

    if (!activeEvent) {
      console.warn(`Warning: Active event ID "${activeEventId}" not found in EVENTS_DEFINITIONS.`);
      return new Response(JSON.stringify({ message: `Active event ('${activeEventId}') not found.` }), {
        status: 404, headers: { "Content-Type": "application/json" },
      });
    }

    if (!activeEvent.activeLocationId || !activeEvent.locations || !activeEvent.locations.length) {
         console.warn(`Warning: Active event "${activeEventId}" has no active location or no locations defined.`);
         return new Response(JSON.stringify({ message: `Event "${activeEvent.eventName}" has no active location set.` }), {
            status: 404, headers: { "Content-Type": "application/json" },
         });
    }

    const activeLocation = activeEvent.locations.find(loc => loc.locationId === activeEvent.activeLocationId);

    if (!activeLocation) {
        console.warn(`Warning: Active location ID "<span class="math-inline">\{activeEvent\.activeLocationId\}" not found in event "</span>{activeEventId}".`);
        return new Response(JSON.stringify({ message: `Active location for "${activeEvent.eventName}" not found.` }), {
            status: 404, headers: { "Content-Type": "application/json" },
        });
    }

    const testDefinitionsJSON = await env.TASTE_TEST_KV.get(TEST_DEFINITIONS_KEY);
    if (!testDefinitionsJSON) {
      console.error("CRITICAL: TEST_DEFINITIONS_KEY not found in KV for base questions.");
      return new Response(JSON.stringify({ message: "Base test questions/themes not found." }), {
        status: 500, headers: { "Content-Type": "application/json" },
      });
    }
    const allTestTypes = JSON.parse(testDefinitionsJSON);
    const testTypeConfig = allTestTypes[activeEvent.testTypeId];

    if (!testTypeConfig) {
      console.warn(`Warning: testTypeId "<span class="math-inline">\{activeEvent\.testTypeId\}" for event "</span>{activeEventId}" not found in TEST_DEFINITIONS.`);
      return new Response(JSON.stringify({ message: `Base questions for this test type not found.` }), {
        status: 404, headers: { "Content-Type": "application/json" },
      });
    }

    // Construct the response for the frontend
    const responsePayload = {
      config: {
        eventId: activeEvent.eventId,
        eventName: activeEvent.eventName,
        activeLocation: activeLocation, // Contains locationId, locationName, items, allowCustomItem
        testTypeConfig: testTypeConfig    // Contains id, displayName (for test type), theme, questions
      }
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200, headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in get-active-event-config:", error);
    return new Response(JSON.stringify({ message: "Server error fetching event configuration.", error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}