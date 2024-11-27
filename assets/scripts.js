document.addEventListener('DOMContentLoaded', async () => {
    // Define variables
    const toggleStationsButton = document.getElementById('toggle-stations');
    const stationsSidebar = document.getElementById('stations-sidebar');
    const audioPlayer = document.getElementById('audio-player');
    const stationsMenu = document.getElementById('stations-menu');
    const volumeLabel = document.getElementById('volume-label');
    const loadingScreen = document.getElementById('loading-screen');
    const songTitle = document.getElementById('song-title');
    const albumArt = document.getElementById('album-art');
    const nextSongTitle = document.getElementById('next-song-title');
    const nextSongInfo = document.getElementById('next-song-info');
    const stationElement = document.getElementById('station-name'); // Station element added here
    let currentStationId = null;
    let songEndTimeout = null;
    let nextSongTimeout = null;
    let currentStationLink = ''; // Global variable for the shareable link
    const defaultBackground = 'url("path-to-default-background-image")'; // Set your default background image path

    // Set default volume to 25%
    audioPlayer.volume = 0.25;
    volumeLabel.textContent = 'Volume: 25%';

    // Toggle sidebar visibility
    toggleStationsButton.addEventListener('click', () => {
        stationsSidebar.classList.toggle('open');
    });

    // Show the loading screen when starting to fetch data
    loadingScreen.style.display = 'flex';
    albumArt.style.display = 'none';

    // Fetch stations from AzuraCast API and play the first station by default or last played station from localStorage
    try {
        const responseStations = await fetch('https://azuracast.banabyte.com/api/stations');
        if (!responseStations.ok) {
            throw new Error(`Network response was not ok ${responseStations.statusText}`);
        }
        const stations = await responseStations.json();

        console.log('Stations data:', stations); // Log stations data
        // Display list of stations
        for (const station of stations) {
            const responseStationStatus = await fetch(`https://azuracast.banabyte.com/api/nowplaying/${station.shortcode}`);
            const stationStatus = await responseStationStatus.json();
            console.log(`station ${station.shortcode} status:`, stationStatus);
            if (stationStatus.is_online === false) continue;
            const stationItem = document.createElement('li');
            stationItem.textContent = station.name;
            stationItem.addEventListener('click', () => {
                playStation(station.id);
                localStorage.setItem('lastStationId', station.id); // Save the selected station ID
            });
            stationsMenu.appendChild(stationItem);
        }

        // Check localStorage for the last played station ID
        const lastStationId = localStorage.getItem('lastStationId');
        if (lastStationId) {
            playStation(lastStationId);
        } else if (stations.length > 0) {
            playStation(stations[0].id);
        }
    } catch (error) {
        console.error('Error fetching stations:', error);
    } finally {
        // Fade out the loading screen
        loadingScreen.classList.add('hidden');
        albumArt.classList.add('Visible');

        // Optionally, remove the loading screen from the DOM after the fade-out completes
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            albumArt.style.display = '';
        }, 500); // Match the timeout with the CSS transition duration (0.5s)
    }

    // Function to play the selected station
    function playStation(stationId) {
        if (currentStationId === stationId) return; // Prevent re-fetching if the same station is clicked

        // Clear existing timeouts to avoid overlapping
        if (songEndTimeout) {
            clearTimeout(songEndTimeout);
        }
        if (nextSongTimeout) {
            clearTimeout(nextSongTimeout);
        }

        // Hide next song info when switching stations
        hideNextSongInfo();

        currentStationId = stationId;

        // Fetch the station's streaming URL
        fetch(`https://azuracast.banabyte.com/api/station/${stationId}`)
            .then(response => response.json())
            .then(data => {
                const streamUrl = data.listen_url;

                // Update the audio player's source and play
                audioPlayer.src = streamUrl;
                audioPlayer.play();

                // Update the global station link for sharing
                currentStationLink = streamUrl;

                // Fetch the now playing information
                fetchNowPlaying(stationId);
            })
            .catch(error => {
                console.error('Error fetching station stream URL:', error);
            });
    }

    // Other functions remain unchanged...
});
