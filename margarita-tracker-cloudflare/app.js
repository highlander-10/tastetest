// Constants
const SESSION_KEY = 'margarita-session-id';
const SESSION_DATA_KEY = 'margarita-session-data';
const REQUIRED_ELEMENTS = [
    'create-session',
    'join-session',
    'join-session-id',
    'admin-screen',
    'player-screen',
    'session-id',
    'new-location',
    'add-location',
    'reset-session',
    'rating-container',
    'submit-ratings',
    'locations-list'
];

// State management
let sessionId = null;
let isAdmin = false;
let playerName = null;
let elements = {};

// Error handling
function handleError(error, message) {
    console.error(message, error);
    alert(`Error: ${message}. Please try again.`);
    // Reset state on error
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_DATA_KEY);
    sessionId = null;
    isAdmin = false;
    playerName = null;
    window.location.href = '?session=';
}

// Helper functions
function generateSessionId() {
    try {
        return crypto.randomUUID();
    } catch (error) {
        handleError(error, 'Failed to generate session ID');
        return null;
    }
}

function getSessionId() {
    try {
        return localStorage.getItem(SESSION_KEY);
    } catch (error) {
        handleError(error, 'Failed to get session ID');
        return null;
    }
}

function setSessionId(id) {
    try {
        localStorage.setItem(SESSION_KEY, id);
        window.history.pushState({}, '', `?session=${id}&admin=${isAdmin}`);
    } catch (error) {
        handleError(error, 'Failed to set session ID');
    }
}

function getSessionData() {
    try {
        const data = localStorage.getItem(SESSION_DATA_KEY);
        if (!data) return null;
        return JSON.parse(data);
    } catch (error) {
        console.error('Error getting session data:', error);
        return null;
    }
}

function setSessionData(data) {
    try {
        localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(data));
        return true;
    } catch (error) {
        handleError(error, 'Failed to save session data');
        return false;
    }
}

// UI functions
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function updateUI(data) {
    // Update session ID display
    if (elements['session-id']) {
        elements['session-id'].textContent = sessionId;
    }

    // Update locations list
    if (elements['locations-list']) {
        elements['locations-list'].innerHTML = data.locations.map(location => `
            <div class="p-4 border rounded bg-gray-50">
                <h3 class="font-semibold">${location.name}</h3>
                <div class="mt-2">
                    ${location.ratings.map(rating => `
                        <p class="text-sm text-gray-600">
                            ${rating.player}: ${rating.ratings.taste}/5 Taste
                        </p>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    // Update rating container
    if (elements['rating-container']) {
        elements['rating-container'].innerHTML = data.locations.map(location => `
            <div class="bg-gray-50 p-4 rounded">
                <h3 class="font-semibold mb-2">${location.name}</h3>
                <div class="space-y-2">
                    <div>
                        <label class="block text-sm mb-1">Taste</label>
                        <select name="${location.name}-taste" class="w-full">
                            <option value="">Select rating</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                        </select>
                    </div>
                    <!-- Add other rating fields here -->
                </div>
            </div>
        `).join('');
    }
}

// Event handlers
function createSessionHandler() {
    try {
        // Clear existing session data
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_DATA_KEY);
        sessionId = null;
        isAdmin = false;
        playerName = null;

        // Generate new session ID
        const newSessionId = generateSessionId();
        if (!newSessionId) {
            throw new Error('Failed to generate session ID');
        }

        // Get player name
        playerName = prompt('Enter your name (Admin):');
        if (!playerName || playerName.trim() === '') {
            throw new Error('Player name is required');
        }

        // Create initial session data
        const sessionData = {
            players: [{ id: newSessionId, name: playerName, isAdmin: true }],
            locations: [],
            ratings: {},
            admin: newSessionId,
            state: 'waiting',
            createdAt: new Date().toISOString()
        };

        // Save and update
        setSessionData(sessionData);
        setSessionId(newSessionId);
        sessionId = newSessionId;
        isAdmin = true;
        showScreen('admin-screen');
        updateUI(sessionData);

        // Broadcast session creation
        broadcastEvent('session-created', { sessionId: newSessionId });

    } catch (error) {
        handleError(error, 'Failed to create new session');
    }
}

function joinSessionHandler() {
    try {
        const sessionId = elements['join-session-id'].value.trim();
        if (!sessionId) {
            throw new Error('Session ID is required');
        }

        // Get player name
        playerName = prompt('Enter your name:');
        if (!playerName || playerName.trim() === '') {
            throw new Error('Player name is required');
        }

        // Get session data
        const sessionData = getSessionData();
        if (!sessionData) {
            throw new Error('Session not found');
        }

        // Add player
        sessionData.players.push({
            id: generateSessionId(),
            name: playerName,
            isAdmin: false,
            joinedAt: new Date().toISOString()
        });

        // Save and update
        setSessionData(sessionData);
        setSessionId(sessionId);
        isAdmin = false;
        showScreen('player-screen');
        updateUI(sessionData);

        // Broadcast player join
        broadcastEvent('player-joined', { playerId: sessionId, playerName });

    } catch (error) {
        handleError(error, 'Failed to join session');
    }
}

function addLocationHandler() {
    try {
        if (!isAdmin) {
            throw new Error('Only admin can add locations');
        }

        const locationName = elements['new-location'].value.trim();
        if (!locationName) {
            throw new Error('Location name is required');
        }

        const sessionData = getSessionData();
        if (!sessionData) {
            throw new Error('No session data found');
        }

        sessionData.locations.push({
            name: locationName,
            ratings: [],
            addedAt: new Date().toISOString()
        });

        setSessionData(sessionData);
        elements['new-location'].value = '';
        updateUI(sessionData);

        // Broadcast location added
        broadcastEvent('location-added', { locationName });

    } catch (error) {
        handleError(error, 'Failed to add location');
    }
}

function resetSessionHandler() {
    try {
        if (!isAdmin) {
            throw new Error('Only admin can reset session');
        }

        if (!confirm('Are you sure you want to reset the session?')) {
            return;
        }

        const sessionData = getSessionData();
        if (!sessionData) {
            throw new Error('No session data found');
        }

        // Reset data while keeping players
        const resetData = {
            players: sessionData.players,
            locations: [],
            ratings: {},
            admin: sessionData.admin,
            state: 'waiting',
            createdAt: sessionData.createdAt
        };

        setSessionData(resetData);
        updateUI(resetData);

        // Broadcast session reset
        broadcastEvent('session-reset', {});

    } catch (error) {
        handleError(error, 'Failed to reset session');
    }
}

// Broadcast events for multiplayer
function broadcastEvent(eventName, data) {
    const event = new CustomEvent(eventName, {
        detail: {
            sessionId,
            data
        }
    });
    window.dispatchEvent(event);
}

// Listen for events from other players
window.addEventListener('storage', (event) => {
    if (event.key === SESSION_DATA_KEY) {
        const newData = getSessionData();
        if (newData) {
            updateUI(newData);
        }
    }
});

// Initialize app
function initializeApp() {
    try {
        // Get all required DOM elements
        elements = {};
        REQUIRED_ELEMENTS.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                throw new Error(`Element not found: ${id}`);
            }
            elements[id] = element;
        });

        // Initialize session
        function initializeSession() {
            try {
                // Check URL parameters
                const urlParams = new URLSearchParams(window.location.search);
                const sessionParam = urlParams.get('session');
                const adminParam = urlParams.get('admin');
                
                // Validate URL parameters
                if (sessionParam && adminParam !== 'true' && adminParam !== 'false') {
                    throw new Error('Invalid admin parameter');
                }

                // Set session ID and admin status
                sessionId = sessionParam;
                isAdmin = adminParam === 'true';

                // Get existing session data
                const sessionData = getSessionData();
                if (sessionData) {
                    // Validate session data
                    if (!sessionData.admin || !Array.isArray(sessionData.players)) {
                        throw new Error('Invalid session data');
                    }
                    
                    // Update UI
                    updateUI(sessionData);
                    
                    // Show appropriate screen
                    if (isAdmin) {
                        showScreen('admin-screen');
                        elements['new-location'].value = '';
                    } else if (sessionId) {
                        showScreen('player-screen');
                    }
                } else {
                    // No existing session, show welcome screen
                    showScreen('welcome-screen');
                }

                // Set up event listeners
                elements['create-session'].addEventListener('click', createSessionHandler);
                elements['join-session'].addEventListener('click', joinSessionHandler);

                if (isAdmin) {
                    elements['add-location'].addEventListener('click', addLocationHandler);
                    elements['reset-session'].addEventListener('click', resetSessionHandler);
                }

            } catch (error) {
                handleError(error, 'Failed to initialize session');
                return false;
            }
            return true;
        }

        return initializeSession();

    } catch (error) {
        handleError(error, 'Failed to initialize application');
        return false;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);
