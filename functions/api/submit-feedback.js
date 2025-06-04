// functions/api/submit-feedback.js

export async function onRequestPost(context) {
  // context.env contains bindings, including your KV namespace
  // Ensure TASTE_TEST_KV is bound in your Pages project settings to your KV namespace
  const { request, env } = context;

  try {
    // Attempt to parse the JSON body from the request
    let submissionData;
    try {
        submissionData = await request.json();
    } catch (e) {
        console.error("Failed to parse submission JSON:", e);
        return new Response(
            JSON.stringify({ message: "Invalid JSON format in submission." }),
            { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }


    // Basic validation of the received data
    if (!submissionData || typeof submissionData !== 'object' || !submissionData.testId || !submissionData.answers || typeof submissionData.answers !== 'object') {
      return new Response(
        JSON.stringify({ message: "Invalid or incomplete submission data. 'testId' and 'answers' are required." }),
        {
          status: 400, // Bad Request
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Add a server-side timestamp for more reliability and consistency
    submissionData.serverSubmittedAt = new Date().toISOString();

    // Generate a unique key for the submission to avoid overwrites
    // Example: submission_margaritas_2025-06-03T12:30:00.000Z_abc123xyz
    const randomSuffix = Math.random().toString(36).substring(2, 10); // Simple random string
    const submissionKey = `submission_${submissionData.testId}_${submissionData.serverSubmittedAt}_${randomSuffix}`;

    // Store the submission data in KV. The value must be a string.
    await env.TASTE_TEST_KV.put(submissionKey, JSON.stringify(submissionData));

    // Send a success response back to the client
    return new Response(
      JSON.stringify({ message: "Feedback submitted successfully!" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    // Catch-all for unexpected errors during processing or KV interaction
    console.error("Error in submit-feedback function:", error);
    return new Response(
      JSON.stringify({ message: "An unexpected server error occurred while submitting feedback.", error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
