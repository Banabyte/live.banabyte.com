document.addEventListener('DOMContentLoaded', function () {
    let currentStationId = null;
    let fetchInterval = null;
    const defaultBackground = 'url("path-to-default-background-image")'; // Set your default background image path

    // Fetch stations from AzuraCast API
    fetch('https://radio.banabyte.com/api/stations')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            console.log('Stations data:', data); // Log stations data
            // Display list of stations
            const stationsMenu = document.getElementById('stations-menu');
            data.forEach(station => {
                const stationItem = document.createElement('li');
                stationItem.textContent = station.name;
                stationItem.addEventListener('click', () => playStation(station.id));
                stationsMenu.appendChild(stationItem);
            });

            // Display information about currently playing song for the first station
            if (data.length > 0) {
                playStation(data[0].id);
            }
        })
        .catch(error => console.error('Error fetching stations:', error));

    // Function to play the selected station
    function playStation(stationId) {
        if (currentStationId === stationId) return; // Prevent re-fetching if the same station is clicked

        currentStationId = stationId;
        fetchNowPlaying(stationId);

        // Clear any existing interval
        if (fetchInterval) {
            clearInterval(fetchInterval);
        }

        // Set interval to fetch now playing information every 10 seconds
        fetchInterval = setInterval(() => fetchNowPlaying(stationId), 10000);
    }

    // Function to fetch and display the currently playing song
    function fetchNowPlaying(stationId) {
        fetch(`https://radio.banabyte.com/api/nowplaying/${stationId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                console.log('Now playing data:', data); // Log now playing data
                if (currentStationId !== stationId) return; // Ensure the data corresponds to the current station

                const stationName = document.getElementById('station-name');
                const songTitle = document.getElementById('song-title');
                const audioPlayer = document.getElementById('audio-player');
                const albumArt = document.getElementById('album-art');

                // Display station name
                stationName.textContent = data.station.name;

                // Display currently playing song
                if (data.now_playing) {
                    songTitle.textContent = `Now Playing: ${data.now_playing.song.title} - ${data.now_playing.song.artist}`;

                    // Set album art image
                    const albumArtUrl = data.now_playing.song.art || defaultBackground;
                    albumArt.src = albumArtUrl;
                    albumArt.alt = `${data.now_playing.song.artist} - ${data.now_playing.song.title}`;
                } else {
                    songTitle.textContent = 'No song currently playing.';
                    albumArt.src = ''; // Clear album art
                    albumArt.alt = 'No album art available';
                }

                // Play the station if not already playing
                if (audioPlayer.src !== data.station.listen_url) {
                    audioPlayer.src = data.station.listen_url;
                    audioPlayer.play();
                }
            })
            .catch(error => console.error('Error fetching now playing information:', error));
    }
});
