// functions/api/admin/add-item-to-location.js

const EVENTS_DEFINITIONS_KEY = "EVENTS_DEFINITIONS";

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    let requestData;
    try {
      requestData = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ message: "Invalid JSON format for request data." }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    const { eventId, locationId, itemName, allowCustomItemForLocation } = requestData; // allowCustomItemForLocation is for the location itself

    if (!eventId || !locationId || !itemName) {
      return new Response(JSON.stringify({ message: "Event ID, Location ID, and Item Name are required." }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }
     // allowCustomItemForLocation can be true or false, so check for undefined if it's meant to be optional,
     // but the admin panel sends it, so it should be present.
     if (typeof allowCustomItemForLocation !== 'boolean') {
        return new Response(JSON.stringify({ message: "The 'allow custom item for location' flag must be true or false." }), {
            status: 400, headers: { "Content-Type": "application/json" }
          });
     }


    // Fetch existing events definitions
    const eventsDefinitionsJSON = await env.TASTE_TEST_KV.get(EVENTS_DEFINITIONS_KEY);
    if (!eventsDefinitionsJSON) {
      return new Response(JSON.stringify({ message: "Events definitions not found. Cannot add item." }), {
        status: 404, headers: { "Content-Type": "application/json" }
      });
    }

    let eventsDefinitions;
    try {
      eventsDefinitions = JSON.parse(eventsDefinitionsJSON);
    } catch (e) {
      console.error("Failed to parse existing EVENTS_DEFINITIONS_KEY from KV in add-item:", e);
      return new Response(JSON.stringify({ message: "Error reading event data from storage." }), {
        status: 500, headers: { "Content-Type": "application/json" }
      });
    }

    // Find the event
    const eventToUpdate = eventsDefinitions[eventId];
    if (!eventToUpdate) {
      return new Response(JSON.stringify({ message: `Event ID "${eventId}" not found.` }), {
        status: 404, headers: { "Content-Type": "application/json" }
      });
    }

    // Find the location within the event
    if (!eventToUpdate.locations || !Array.isArray(eventToUpdate.locations)) {
        return new Response(JSON.stringify({ message: `Event "${eventId}" has no locations array defined.` }), {
            status: 404, headers: { "Content-Type": "application/json" }
        });
    }
    const locationToUpdate = eventToUpdate.locations.find(loc => loc.locationId === locationId);
    if (!locationToUpdate) {
      return new Response(JSON.stringify({ message: `Location ID "${locationId}" not found within event "${eventId}".` }), {
        status: 404, headers: { "Content-Type": "application/json" }
      });
    }

    // Ensure items array exists for the location
    if (!locationToUpdate.items) {
      locationToUpdate.items = [];
    }

    // Generate a unique item ID (simple example)
    const itemId = `item_${itemName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;

    // Add the new item object
    locationToUpdate.items.push({
      itemId: itemId,
      itemName: itemName
    });

    // Update the allowCustomItem flag for the location itself
    locationToUpdate.allowCustomItem = allowCustomItemForLocation;


    // Save the updated events definitions back to KV
    await env.TASTE_TEST_KV.put(EVENTS_DEFINITIONS_KEY, JSON.stringify(eventsDefinitions));

    return new Response(JSON.stringify({ 
        message: `Item "${itemName}" added successfully to location "${locationToUpdate.locationName}". Location 'allow custom' set to ${allowCustomItemForLocation}.`,
        itemId: itemId,
        updatedEvent: eventToUpdate // Send back the updated event for the admin panel if needed
    }), {
      status: 201, // Created
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error in add-item-to-location function:", error);
    return new Response(JSON.stringify({ message: "Server error while adding item to location.", error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
