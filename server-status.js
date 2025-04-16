// Configuration
const SERVER_API = {
    URL: 'https://api.mcsrvstat.us/2/heartzgens.minefort.com',
    REFRESH_INTERVAL: 60000 // 60 seconds
};

// DOM Elements
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const playerCount = document.getElementById('player-count');
const detailedStatus = document.getElementById('detailed-status');
const detailedPlayers = document.getElementById('detailed-players');
const uptime = document.getElementById('uptime');
const playerList = document.getElementById('player-list');
const refreshButton = document.getElementById('refresh-status');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchServerStatus();
    
    // Set up auto-refresh
    setInterval(fetchServerStatus, SERVER_API.REFRESH_INTERVAL);
    
    // Manual refresh
    refreshButton.addEventListener('click', () => {
        refreshButton.disabled = true;
        refreshButton.innerHTML = '<span class="refresh-icon">↻</span> Refreshing...';
        
        fetchServerStatus().finally(() => {
            setTimeout(() => {
                refreshButton.disabled = false;
                refreshButton.innerHTML = '<span class="refresh-icon">↻</span> Refresh';
            }, 2000);
        });
    });
});

// Fetch server status from API
async function fetchServerStatus() {
    try {
        // Show loading state
        setLoadingState();
        
        // Make actual API call to the Minecraft server status API
        const response = await fetch(SERVER_API.URL);
        
        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        updateServerStatus(data);
    } catch (error) {
        console.error('Error fetching server status:', error);
        setOfflineState();
    }
}

// Update UI with server status
function updateServerStatus(data) {
    if (data.online) {
        setOnlineState(data);
    } else {
        setOfflineState();
    }
}

// Set UI to loading state
function setLoadingState() {
    statusDot.className = 'status-indicator';
    statusText.textContent = 'Checking...';
    playerCount.textContent = 'Checking...';
    detailedStatus.textContent = 'CHECKING...';
    detailedPlayers.textContent = '?/?';
    uptime.textContent = 'Checking...';
    playerList.innerHTML = '<div class="player-item">Loading player data...</div>';
}

// Set UI to online state
function setOnlineState(data) {
    // Update header status indicator
    statusDot.className = 'status-indicator online';
    statusText.textContent = 'Online';
    
    // Extract player counts
    const onlinePlayers = data.players?.online || 0;
    const maxPlayers = data.players?.max || 0;
    
    playerCount.textContent = `${onlinePlayers}/${maxPlayers} Players`;
    
    // Update detailed status cards
    detailedStatus.textContent = 'ONLINE';
    detailedPlayers.textContent = `${onlinePlayers}/${maxPlayers}`;
    
    // Get server version if available
    if (data.version) {
        const versionElement = document.querySelector('.status-card:nth-child(3) .status-card-value');
        if (versionElement) {
            versionElement.textContent = data.version;
        }
    }
    
    // Calculate uptime - the mcsrvstat.us API doesn't provide uptime directly
    const serverUptime = calculateUptime(data);
    uptime.textContent = serverUptime;
    
    // Update player list with real player names if available
    updatePlayerList(data.players);
}

// Calculate uptime from API data or estimate it
function calculateUptime(data) {
    // If the API provides a start time or uptime directly
    if (data.debug?.starttime) {
        const startTime = new Date(data.debug.starttime * 1000); // Convert seconds to milliseconds
        const currentTime = new Date();
        const uptimeMs = currentTime - startTime;
        
        // Convert to hours and minutes
        const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
        const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
        
        return `${hours}h ${minutes}m`;
    }
    
    // If no start time is available but last ping available
    if (data.debug?.ping) {
        const lastPing = new Date(data.debug.ping * 1000);
        return `Online since last ping (${formatDate(lastPing)})`;
    }
    
    // If no reliable data available
    return 'Unknown';
}

// Format date for display
function formatDate(date) {
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Set UI to offline state
function setOfflineState() {
    // Update header status indicator
    statusDot.className = 'status-indicator offline';
    statusText.textContent = 'Offline';
    playerCount.textContent = '0/0 Players';
    
    // Update detailed status cards
    detailedStatus.textContent = 'OFFLINE';
    detailedPlayers.textContent = '0/0';
    uptime.textContent = 'N/A';
    
    // Update player list
    playerList.innerHTML = '<div class="player-item">Server is offline</div>';
}

// Update player list with actual player data
function updatePlayerList(playersData) {
    playerList.innerHTML = '';
    
    // Check if players exist and online count
    const onlineCount = playersData?.online || 0;
    
    if (onlineCount === 0) {
        playerList.innerHTML = '<div class="player-item">No players online</div>';
        return;
    }
    
    // If the API provides player names
    if (playersData.list && Array.isArray(playersData.list)) {
        // Display actual player names
        playersData.list.forEach(playerName => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            
            // Create player avatar using Minecraft avatar service
            const playerAvatar = document.createElement('img');
            playerAvatar.className = 'player-avatar';
            playerAvatar.src = `https://mc-heads.net/avatar/${playerName}/24`;
            playerAvatar.alt = playerName;
            
            // Player name
            const nameSpan = document.createElement('span');
            nameSpan.className = 'player-name';
            nameSpan.textContent = playerName;
            
            playerItem.appendChild(playerAvatar);
            playerItem.appendChild(nameSpan);
            playerList.appendChild(playerItem);
        });
    } else if (playersData.sample && Array.isArray(playersData.sample)) {
        // Some APIs provide player samples instead
        playersData.sample.forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            
            const playerAvatar = document.createElement('img');
            playerAvatar.className = 'player-avatar';
            
            // Extract player name (player.name) and UUID (player.id) if available
            const playerName = player.name || `Player`;
            const playerId = player.id || playerName;
            
            playerAvatar.src = `https://mc-heads.net/avatar/${playerId}/24`;
            playerAvatar.alt = playerName;
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'player-name';
            nameSpan.textContent = playerName;
            
            playerItem.appendChild(playerAvatar);
            playerItem.appendChild(nameSpan);
            playerList.appendChild(playerItem);
        });
    } else {
        // If player names are not provided, show anonymous players
        for (let i = 0; i < onlineCount; i++) {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            
            const playerAvatar = document.createElement('img');
            playerAvatar.className = 'player-avatar';
            playerAvatar.src = '/api/placeholder/24/24';
            playerAvatar.alt = 'Player';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'player-name';
            nameSpan.textContent = `Player #${i+1}`;
            
            playerItem.appendChild(playerAvatar);
            playerItem.appendChild(nameSpan);
            playerList.appendChild(playerItem);
        }
    }
    
    // Update the server statistics section if it exists
    updateServerStatistics(onlineCount);
}

// Update server statistics section with actual data
function updateServerStatistics(currentPlayers) {
    const activePlayers = document.querySelector('.stat:nth-child(1) .stat-number');
    if (activePlayers) {
        // Update active players stat if the current count is higher than displayed
        const currentDisplay = activePlayers.textContent;
        const currentNumber = parseInt(currentDisplay);
        
        if (isNaN(currentNumber) || currentPlayers > currentNumber) {
            activePlayers.textContent = `${currentPlayers}+`;
        }
    }
}
