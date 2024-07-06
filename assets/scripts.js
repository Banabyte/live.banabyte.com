document.addEventListener('DOMContentLoaded', function () {
    // Define variables
    let toggleStationsButton = document.getElementById('toggle-stations');
    let stationsSidebar = document.getElementById('stations-sidebar');
    let audioPlayer = document.getElementById('audio-player');
    let currentStationId = null;
    let songEndTimeout = null;
    const defaultBackground = 'url("path-to-default-background-image")'; // Set your default background image path

    // Set default volume to 25%
    audioPlayer.volume = 0.25;
    document.getElementById('volume-label').textContent = 'Volume: 25%';

    // Toggle sidebar visibility
    toggleStationsButton.addEventListener('click', function () {
        stationsSidebar.classList.toggle('open');
    });

    // Fetch stations from AzuraCast API and play the first station by default or last played station from localStorage
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
                stationItem.addEventListener('click', () => {
                    playStation(station.id);
                    localStorage.setItem('lastStationId', station.id); // Save the selected station ID
                });
                stationsMenu.appendChild(stationItem);
            });

            // Check localStorage for the last played station ID
            const lastStationId = localStorage.getItem('lastStationId');
            if (lastStationId) {
                playStation(lastStationId);
            } else if (data.length > 0) {
                playStation(data[0].id);
            }
        })
        .catch(error => console.error('Error fetching stations:', error));

    // Function to play the selected station
    function playStation(stationId) {
        if (currentStationId === stationId) return; // Prevent re-fetching if the same station is clicked

        currentStationId = stationId;
        fetchNowPlaying(stationId);
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
                const albumArt = document.getElementById('album-art');

                // Display station name
                stationName.textContent = data.station.name;

                // Display currently playing song
                if (data.now_playing) {
                    songTitle.textContent = `Now Playing: ${data.now_playing.song.title} - ${data.now_playing.song.artist}`;

                    // Set album art image
                    const albumArtUrl = data.now_playing.song.art || defaultBackground;

                    // Smooth transition for album art
                    albumArt.classList.remove('fade-in');
                    albumArt.classList.add('fade-out');
                    setTimeout(() => {
                        albumArt.src = albumArtUrl;
                        albumArt.alt = `${data.now_playing.song.artist} - ${data.now_playing.song.title}`;
                        albumArt.classList.remove('fade-out');
                        albumArt.classList.add('fade-in');
                    }, 500); // Change image mid-transition

                    // Update body background based on album art
                    document.body.style.backgroundImage = `url(${albumArtUrl})`;

                    // Set Media Session API metadata
                    if ('mediaSession' in navigator) {
                        navigator.mediaSession.metadata = new MediaMetadata({
                            title: data.now_playing.song.title,
                            artist: data.now_playing.song.artist,
                            album: data.station.name,
                            artwork: [
                                { src: albumArtUrl, sizes: '96x96', type: 'image/png' },
                                { src: albumArtUrl, sizes: '128x128', type: 'image/png' },
                                { src: albumArtUrl, sizes: '192x192', type: 'image/png' },
                                { src: albumArtUrl, sizes: '256x256', type: 'image/png' },
                                { src: albumArtUrl, sizes: '384x384', type: 'image/png' },
                                { src: albumArtUrl, sizes: '512x512', type: 'image/png' },
                            ]
                        });
                    }

                    // Clear any existing timeout
                    if (songEndTimeout) {
                        clearTimeout(songEndTimeout);
                    }

                    // Calculate remaining time and set timeout to fetch next song information
                    const startTimestamp = data.now_playing.played_at * 1000;
                    const currentTimestamp = Date.now();
                    const elapsedMs = currentTimestamp - startTimestamp;
                    const durationMs = data.now_playing.duration * 1000;
                    const remainingMs = durationMs - elapsedMs;

                    songEndTimeout = setTimeout(() => fetchNowPlaying(stationId), remainingMs);
                } else {
                    songTitle.textContent = 'No song currently playing.';
                    albumArt.src = ''; // Clear album art
                    albumArt.alt = 'No album art available';

                    // Clear Media Session API metadata
                    if ('mediaSession' in navigator) {
                        navigator.mediaSession.metadata = null;
                    }
                }

                // Play the station if not already playing
                if (audioPlayer.src !== data.station.listen_url) {
                    audioPlayer.src = data.station.listen_url;
                    audioPlayer.play();
                }

                // Update play/pause button state
                updatePlayPauseButton();
            })
            .catch(error => console.error('Error fetching now playing information:', error));
    }

    // Custom audio controls functionality
    let playPauseButton = document.getElementById('play-pause-button');
    let refreshButton = document.getElementById('refresh-button');
    let volumeSlider = document.getElementById('volume-slider');
    let volumeLabel = document.getElementById('volume-label');

    playPauseButton.addEventListener('click', function () {
        if (audioPlayer.paused) {
            audioPlayer.play();
        } else {
            audioPlayer.pause();
        }
        updatePlayPauseButton();
    });

    refreshButton.addEventListener('click', function () {
        if (audioPlayer.src) {
            audioPlayer.pause();
            audioPlayer.load(); // Reload the audio source
            audioPlayer.play();
        }
        updatePlayPauseButton();
    });

    volumeSlider.addEventListener('input', function () {
        audioPlayer.volume = volumeSlider.value;
        volumeLabel.textContent = `Volume: ${(volumeSlider.value * 100).toFixed(0)}%`;
    });

    // Function to update play/pause button state
    function updatePlayPauseButton() {
        if (audioPlayer.paused) {
            playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
        }
    }

    // Update play/pause button state on page load
    updatePlayPauseButton();
});
