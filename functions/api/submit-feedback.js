// functions/api/submit-feedback.js

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    let submissionData;
    try {
        submissionData = await request.json();
    } catch (e) {
        console.error("Failed to parse submission JSON:", e);
        return new Response(JSON.stringify({ message: "Invalid JSON format." }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Validate crucial new fields
    if (!submissionData || typeof submissionData !== 'object' || 
        !submissionData.eventId || !submissionData.locationId || !submissionData.itemId || !submissionData.itemName ||
        !submissionData.testTypeId || !submissionData.answers || typeof submissionData.answers !== 'object') {
      return new Response(JSON.stringify({ message: "Incomplete submission data. Required event/location/item details are missing." }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    submissionData.serverSubmittedAt = new Date().toISOString();
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    // Create a more structured key, perhaps:
    // submissions/{eventId}/{locationId}/{itemId}/{timestamp}_{random}
    // For simplicity, keeping it flat for now, but consider nesting for easier querying if KV supported it directly.
    const submissionKey = `submission_${submissionData.eventId}_${submissionData.locationId}_${submissionData.itemId}_${submissionData.serverSubmittedAt}_${randomSuffix}`;

    await env.TASTE_TEST_KV.put(submissionKey, JSON.stringify(submissionData));

    return new Response(JSON.stringify({ message: "Feedback submitted successfully!" }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in submit-feedback:", error);
    return new Response(JSON.stringify({ message: "Server error submitting feedback.", error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}