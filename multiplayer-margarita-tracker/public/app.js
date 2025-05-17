// Constants
const SESSION_ID_LENGTH = 16; // Increased for better uniqueness
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
let eventListeners = {};

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
function getElements() {
    try {
        const elements = {};
        REQUIRED_ELEMENTS.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                throw new Error(`Element not found: ${id}`);
            }
            elements[id] = element;
        });
        return elements;
    } catch (error) {
        handleError(error, 'Failed to get required elements');
        return {};
    }
}

function generateSessionId() {
    try {
        // Generate a more secure random string using crypto
        const bytes = new Uint8Array(SESSION_ID_LENGTH / 2);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    } catch (error) {
        handleError(error, 'Failed to generate session ID');
        return null;
    }
}

function getSessionId() {
    try {
        const id = localStorage.getItem(SESSION_KEY);
        if (id && id.length === SESSION_ID_LENGTH) {
            return id;
        }
        return null;
    } catch (error) {
        handleError(error, 'Failed to get session ID');
        return null;
    }
}

function setSessionId(id) {
    if (!id || typeof id !== 'string' || id.length !== SESSION_ID_LENGTH) {
        handleError(null, 'Invalid session ID format');
        return;
    }
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
        const parsedData = JSON.parse(data);
        if (!parsedData.admin || !Array.isArray(parsedData.players)) {
            throw new Error('Invalid session data format');
        }
        return parsedData;
    } catch (error) {
        console.error('Error getting session data:', error);
        return null;
    }
}

function setSessionData(data) {
    if (!data || typeof data !== 'object' || !data.admin || !Array.isArray(data.players)) {
        throw new Error('Invalid session data format');
    }
    try {
        localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(data));
        return true;
    } catch (error) {
        handleError(error, 'Failed to save session data');
        return false;
    }
}

// DOM helpers
function getElements() {
    try {
        const elements = {};
        REQUIRED_ELEMENTS.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                throw new Error(`Element not found: ${id}`);
            }
            elements[id] = element;
        });
        return elements;
    } catch (error) {
        handleError(error, 'Failed to get required elements');
        return {};
    }
    const requiredElements = [
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

    const elements = {};
    requiredElements.forEach(id => {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Missing required element: ${id}`);
        }
        elements[id] = element;
    });
    return elements;
}

// UI functions
function showScreen(screenId) {
    try {
        const screen = document.getElementById(screenId);
        if (!screen) throw new Error(`Screen not found: ${screenId}`);
        
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        screen.classList.add('active');
        
    } catch (error) {
        console.error('Error showing screen:', error);
        throw error;
    }
}

function updateUI(data) {
    if (!data) return;
    
    try {
        // Update admin screen
        if (elements['admin-screen'].classList.contains('active')) {
            const locationsList = elements['locations-list'];
            locationsList.innerHTML = data.locations.map(location => 
                `<div class="location-item p-4 border rounded mb-4">
                    <h3 class="font-bold">${location.name}</h3>
                    <p>${location.ratings.length} ratings</p>
                </div>`
            ).join('');
        }
        
        // Update player screen
        if (elements['player-screen'].classList.contains('active')) {
            const ratingContainer = elements['rating-container'];
            ratingContainer.innerHTML = data.locations.map(location => 
                `<div class="location-rating mb-8">
                    <h3 class="font-bold mb-4">${location.name}</h3>
                    <div class="space-y-4">
                        <div>
                            <label>Taste</label>
                            <input type="range" name="${location.name}-taste" min="0" max="10">
                        </div>
                        <div>
                            <label>Salt</label>
                            <input type="range" name="${location.name}-salt" min="0" max="10">
                        </div>
                        <div>
                            <label>Value</label>
                            <input type="range" name="${location.name}-value" min="0" max="10">
                        </div>
                        <div>
                            <label>Atmosphere</label>
                            <input type="range" name="${location.name}-atmosphere" min="0" max="10">
                        </div>
                        <div>
                            <label>Service</label>
                            <input type="range" name="${location.name}-service" min="0" max="10">
                        </div>
                        <div>
                            <label>Comments</label>
                            <textarea name="${location.name}-comments" rows="3"></textarea>
                        </div>
                    </div>
                </div>`
            ).join('');
        }
    } catch (error) {
        console.error('Error updating UI:', error);
        throw error;
    }
}

// Session management
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

        // Get player name with validation
        playerName = prompt('Enter your name (Admin):');
        if (!playerName || playerName.trim() === '') {
            throw new Error('Player name is required');
        }

        // Create initial session data
        const sessionData = {
            players: [{ 
                id: newSessionId, 
                name: playerName, 
                isAdmin: true,
                joinedAt: new Date().toISOString()
            }],
            locations: [],
            ratings: {},
            admin: newSessionId,
            state: 'waiting',
            createdAt: new Date().toISOString(),
            joinedAt: new Date().toISOString()
        };

        // Store session data
        if (!setSessionData(sessionData)) {
            throw new Error('Failed to save session data');
        }
        setSessionId(newSessionId);

        // Update state
        sessionId = newSessionId;
        isAdmin = true;

        // Update URL and UI
        window.history.pushState({}, '', `?session=${newSessionId}&admin=true`);
        showScreen('admin-screen');
        updateUI(sessionData);

        console.log('New session created successfully:', {
            sessionId: newSessionId,
            playerName: playerName,
            isAdmin: true,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        handleError(error, 'Failed to create new session');
        return false;
    }
    return true;
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

        // Get player name with validation
        playerName = prompt('Enter your name (Admin):');
        if (!playerName || playerName.trim() === '') {
            throw new Error('Player name is required');
        }

        // Create initial session data
        const sessionData = {
            players: [{ 
                id: newSessionId, 
                name: playerName, 
                isAdmin: true,
                joinedAt: new Date().toISOString()
            }],
            locations: [],
            ratings: {},
            admin: newSessionId,
            state: 'waiting',
            createdAt: new Date().toISOString(),
            joinedAt: new Date().toISOString()
        };

        // Store session data
        if (!setSessionData(sessionData)) {
            throw new Error('Failed to save session data');
        }
        setSessionId(newSessionId);

        // Update state
        sessionId = newSessionId;
        isAdmin = true;

        // Update URL and UI
        window.history.pushState({}, '', `?session=${newSessionId}&admin=true`);
        showScreen('admin-screen');
        updateUI(sessionData);

        console.log('New session created successfully:', {
            sessionId: newSessionId,
            playerName: playerName,
            isAdmin: true,
            timestamp: new Date().toISOString()
        });

        return true;
    } catch (error) {
        handleError(error, 'Failed to create new session');
        return false;
    }
}

function joinSessionHandler() {
    try {
        const sessionId = elements['join-session-id'].value.trim();
        if (!sessionId) {
            throw new Error('Session ID is required');
        }

        // Set session ID
        setSessionId(sessionId);
        
        // Update URL
        window.history.pushState({}, '', `?session=${sessionId}`);
        
        // Show player screen
        showScreen('player-screen');
        
        // Get player name
        playerName = prompt('Enter your name:');
        if (!playerName || playerName.trim() === '') {
            throw new Error('Player name is required');
        }

        // Update session data
        const sessionData = getSessionData();
        if (sessionData) {
            sessionData.players.push({
                id: sessionId,
                name: playerName,
                isAdmin: false,
                joinedAt: new Date().toISOString()
            });
            setSessionData(sessionData);
            updateUI(sessionData);
        }

        return true;
    } catch (error) {
        handleError(error, 'Failed to join session');
        return false;
    }
}

function addLocationHandler() {
    try {
        // Verify admin status
        if (!isAdmin) {
            alert('Only admin can add locations');
            return false;
        }

        // Get location input
        const newLocationInput = elements['new-location'];
        if (!newLocationInput) {
            throw new Error('Missing required element: new-location');
        }
        const locationName = newLocationInput.value.trim();
        if (!locationName) {
            alert('Please enter a location name');
            return false;
        }

        // Get session data
        const sessionData = getSessionData();
        if (!sessionData) {
            throw new Error('No session data found');
        }

        // Verify admin status again with session data
        if (sessionData.admin !== sessionId) {
            alert('Only admin can add locations');
            return false;
        }

        // Add location
        sessionData.locations.push({ 
            name: locationName, 
            ratings: [],
            createdAt: new Date().toISOString()
        });

        // Save and update UI
        setSessionData(sessionData);
        updateUI(sessionData);
        newLocationInput.value = '';
        
        // Show success message
        alert('Location added successfully!');
        return true;
    } catch (error) {
        console.error('Error adding location:', error);
        handleError(error, 'Failed to add location');
        return false;
    }
}

function resetSessionHandler() {
    try {
        // Verify admin status
        if (!isAdmin) {
            alert('Only admin can reset session');
            return false;
        }

        // Confirm reset
        if (!confirm('Are you sure you want to reset the session?')) {
            return false;
        }

        // Get session data
        const sessionData = getSessionData();
        if (!sessionData) {
            throw new Error('No session data found');
        }

        // Verify admin status again with session data
        if (sessionData.admin !== sessionId) {
            alert('Only admin can reset session');
            return false;
        }

        // Reset session data
        const resetData = {
            players: sessionData.players, // Keep players
            locations: [],
            ratings: {},
            admin: sessionId,
            state: 'waiting',
            createdAt: sessionData.createdAt,
            joinedAt: sessionData.joinedAt
        };

        // Save and update UI
        setSessionData(resetData);
        updateUI(resetData);
        
        // Show success message
        alert('Session reset successfully!');
        return true;
    } catch (error) {
        console.error('Error resetting session:', error);
        handleError(error, 'Failed to reset session');
        return false;
    }
}

function submitRatingsHandler() {
    try {
        const currentData = getSessionData();
        if (!currentData) {
            throw new Error('No session data found');
        }

        const ratings = {};
        currentData.locations.forEach(location => {
            ratings[location.name] = {
                taste: document.querySelector(`[name="${location.name}-taste"]`).value,
                salt: document.querySelector(`[name="${location.name}-salt"]`).value,
                value: document.querySelector(`[name="${location.name}-value"]`).value,
                atmosphere: document.querySelector(`[name="${location.name}-atmosphere"]`).value,
                service: document.querySelector(`[name="${location.name}-service"]`).value,
                comments: document.querySelector(`[name="${location.name}-comments"]`).value
            };
        });

        // Validate ratings
        const hasEmptyRatings = Object.values(ratings).some(r => 
            Object.values(r).some(value => !value)
        );

        if (hasEmptyRatings) {
            alert('Please fill in all rating fields before submitting.');
            return false;
        }

        // Save ratings
        const playerIndex = currentData.players.findIndex(p => p.id === sessionId);
        if (playerIndex === -1) {
            throw new Error('Player not found in session');
        }

        currentData.locations.forEach(location => {
            location.ratings.push({
                player: currentData.players[playerIndex].name,
                ratings: ratings[location.name],
                timestamp: new Date()
            });
        });

        setSessionData(currentData);
        updateUI(currentData);
        alert('Ratings submitted successfully!');
        return true;
    } catch (error) {
        console.error('Error submitting ratings:', error);
        alert('Error submitting ratings. Please try again.');
        return false;
    }
}

// Initialize app
function initializeApp() {
    try {
        // Get all required DOM elements
        elements = getElements();
        console.log('Elements initialized:', Object.keys(elements));

        // Verify all required elements exist
        const missingElements = REQUIRED_ELEMENTS.filter(id => !elements[id]);
        if (missingElements.length > 0) {
            throw new Error(`Missing required elements: ${missingElements.join(', ')}`);
        }

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
                        // Initialize admin screen elements
                        if (elements['new-location']) {
                            elements['new-location'].value = '';
                        }
                    } else if (sessionId) {
                        showScreen('player-screen');
                    }
                } else {
                    // No existing session, show welcome screen
                    showScreen('welcome-screen');
                }

                // Set up event listeners immediately after session is initialized
                if (!setupEventListeners()) {
                    throw new Error('Failed to set up event listeners');
                }

            } catch (error) {
                handleError(error, 'Failed to initialize session');
                return false;
            }
            return true;
        }

        // Set up event listeners
        function setupEventListeners() {
            try {
                // Welcome screen handlers
                if (elements['create-session']) {
                    console.log('Setting up create-session listener');
                    elements['create-session'].addEventListener('click', createSessionHandler);
                }
                if (elements['join-session']) {
                    console.log('Setting up join-session listener');
                    elements['join-session'].addEventListener('click', joinSessionHandler);
                }

                // Admin screen handlers
                if (isAdmin && elements['admin-screen'].classList.contains('active')) {
                    if (elements['add-location']) {
                        console.log('Setting up add-location listener');
                        elements['add-location'].addEventListener('click', () => {
                            console.log('Add location button clicked');
                            addLocationHandler();
                        });
                    }
                    if (elements['reset-session']) {
                        console.log('Setting up reset-session listener');
                        elements['reset-session'].addEventListener('click', () => {
                            console.log('Reset session button clicked');
                            resetSessionHandler();
                        });
                    }
                }

                // Player screen handlers
                if (!isAdmin && sessionId && elements['player-screen'].classList.contains('active')) {
                    if (elements['submit-ratings']) {
                        console.log('Setting up submit-ratings listener');
                        elements['submit-ratings'].addEventListener('click', submitRatingsHandler);
                    }
                }

                // Verify listeners are set up
                console.log('Event listeners set up:', {
                    isAdmin,
                    hasAddLocation: elements['add-location']?.addEventListener,
                    hasResetSession: elements['reset-session']?.addEventListener,
                    hasSubmitRatings: elements['submit-ratings']?.addEventListener
                });

            } catch (error) {
                handleError(error, 'Failed to set up event listeners');
                return false;
            }
            return true;
        }

        // Initialize the app
        if (!initializeSession()) {
            throw new Error('Failed to initialize session');
            return false;
        }

        return true;
    } catch (error) {
        handleError(error, 'Failed to initialize application');
        return false;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Update UI based on session state
function updateUI(sessionData) {
    // Update admin screen
    if (isAdmin) {
        const locationsList = document.getElementById('locations-list');
        if (locationsList) {
            locationsList.innerHTML = sessionData.locations.map((location, index) => `
                <div class="border-b pb-4 last:border-0">
                    <div class="flex justify-between items-start">
                        <h3 class="font-semibold">${location.name}</h3>
                        <p class="text-sm text-gray-600">${location.ratings.length} ratings</p>
                    </div>
                </div>
            `).join('');
        }
    }

    // Update player screen
    const ratingContainer = document.getElementById('rating-container');
    if (!ratingContainer) return;

    if (!sessionData.locations || sessionData.locations.length === 0) {
        ratingContainer.innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-600">No locations added yet. Please wait for the admin to add locations.</p>
            </div>
        `;
        return;
    }

    ratingContainer.innerHTML = sessionData.locations.map(location => `
        <div class="border-b pb-6 last:border-0">
            <h3 class="font-semibold mb-4">${location.name}</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Taste</label>
                    <select class="w-full p-2 border rounded" name="${location.name}-taste">
                        <option value="">Select rating...</option>
                        <option value="1">Terrible</option>
                        <option value="2">Bad</option>
                        <option value="3">Average</option>
                        <option value="4">Good</option>
                        <option value="5">Amazing</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Salt Rim</label>
                    <select class="w-full p-2 border rounded" name="${location.name}-salt">
                        <option value="">Select rating...</option>
                        <option value="1">Too Much</option>
                        <option value="2">Just Right</option>
                        <option value="3">Not Enough</option>
                        <option value="4">No Salt</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Value for Money</label>
                    <select class="w-full p-2 border rounded" name="${location.name}-value">
                        <option value="">Select rating...</option>
                        <option value="1">Very Expensive</option>
                        <option value="2">Expensive</option>
                        <option value="3">Fair</option>
                        <option value="4">Good Value</option>
                        <option value="5">Great Value</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Atmosphere</label>
                    <select class="w-full p-2 border rounded" name="${location.name}-atmosphere">
                        <option value="">Select rating...</option>
                        <option value="1">Terrible</option>
                        <option value="2">Bad</option>
                        <option value="3">Average</option>
                        <option value="4">Good</option>
                        <option value="5">Amazing</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Service</label>
                    <select class="w-full p-2 border rounded" name="${location.name}-service">
                        <option value="">Select rating...</option>
                        <option value="1">Terrible</option>
                        <option value="2">Bad</option>
                        <option value="3">Average</option>
                        <option value="4">Good</option>
                        <option value="5">Amazing</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Comments</label>
                    <textarea class="w-full p-2 border rounded" name="${location.name}-comments" rows="3"></textarea>
                </div>
            </div>
        </div>
    `).join('');

    // Add submit ratings event listener
    const submitBtn = document.getElementById('submit-ratings');
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            const ratings = {};
            sessionData.locations.forEach(location => {
                const locRatings = {
                    taste: document.querySelector(`[name="${location.name}-taste"]`).value,
                    salt: document.querySelector(`[name="${location.name}-salt"]`).value,
                    value: document.querySelector(`[name="${location.name}-value"]`).value,
                    atmosphere: document.querySelector(`[name="${location.name}-atmosphere"]`).value,
                    service: document.querySelector(`[name="${location.name}-service"]`).value,
                    comments: document.querySelector(`[name="${location.name}-comments"]`).value
                };
                ratings[location.name] = locRatings;
            });

            // Validate ratings
            const hasEmptyRatings = Object.values(ratings).some(r => 
                Object.values(r).some(value => !value)
            );

            if (hasEmptyRatings) {
                alert('Please fill in all rating fields before submitting.');
                return;
            }

            // Save ratings
            const playerIndex = sessionData.players.findIndex(p => p.id === sessionId);
            if (playerIndex !== -1) {
                sessionData.locations.forEach(location => {
                    location.ratings.push({
                        player: sessionData.players[playerIndex].name,
                        ratings: ratings[location.name],
                        timestamp: new Date()
                    });
                });
                setSessionData(sessionData);
                updateUI(sessionData);
                alert('Ratings submitted successfully!');
            }
        });
    }
}

// Show a specific screen
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('active');
    }
}
