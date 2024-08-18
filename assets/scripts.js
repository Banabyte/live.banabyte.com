document.addEventListener('DOMContentLoaded', async () => {
    // Define variables
    const toggleStationsButton = document.getElementById('toggle-stations');
    const stationsSidebar = document.getElementById('stations-sidebar');
    const audioPlayer = document.getElementById('audio-player');
    const stationsMenu = document.getElementById('stations-menu');
    const volumeLabel = document.getElementById('volume-label');
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

    // Fetch stations from AzuraCast API and play the first station by default or last played station from localStorage
    try {
        const responseStations = await fetch('https://radio.banabyte.com/api/stations');
        if (!responseStations.ok) {
            throw new Error(`Network response was not ok ${response.statusText}`);
        }
        const stations = await responseStations.json();
        console.log('Stations data:', stations); // Log stations data
        // Display list of stations
        for (const station of stations) {
            const responseStationStatus = await fetch(`https://radio.banabyte.com/api/nowplaying/${station.shortcode}`);
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
    }
    catch (error) {
        console.error('Error fetching stations:', error)
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
        fetchNowPlaying(stationId);
    }

    // Function to hide next song info with animation
    function hideNextSongInfo() {
        const nextSongInfo = document.getElementById('next-song-info');
        nextSongInfo.classList.remove('visible');
        nextSongInfo.classList.add('hidden');
        setTimeout(() => {
            nextSongInfo.style.display = 'none';
        }, 300); // Delay for slide down animation to complete
    }

    // Function to show next song info with animation
    function showNextSongInfo(title) {
        const nextSongInfo = document.getElementById('next-song-info');
        document.getElementById('next-song-title').textContent = title;
        nextSongInfo.style.display = 'block';
        setTimeout(() => {
            nextSongInfo.classList.remove('hidden');
            nextSongInfo.classList.add('visible');
        }, 10); // Trigger CSS transition
    }

    // Function to clear next song info
    function clearNextSongInfo() {
        const nextSongInfo = document.getElementById('next-song-info');
        nextSongInfo.classList.remove('visible');
        nextSongInfo.classList.add('hidden');
        setTimeout(() => {
            nextSongInfo.style.display = 'none';
        }, 300); // Delay for slide down animation to complete
        document.getElementById('next-song-title').textContent = ''; // Clear the next song title
    }

    // Function to fetch and display the currently playing song
    function fetchNowPlaying(stationId) {
        fetch(`https://radio.banabyte.com/api/nowplaying/${stationId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Network response was not ok ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Now playing data:', data); // Log now playing data
                if (currentStationId !== stationId) return; // Ensure the data corresponds to the current station

                const stationName = document.getElementById('station-name');
                const songTitle = document.getElementById('song-title');
                const albumArt = document.getElementById('album-art');
                const nextSongTitle = document.getElementById('next-song-title');
                const nextSongInfo = document.getElementById('next-song-info');

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

                    // Calculate remaining time and set timeout to fetch next song information
                    const startTimestamp = data.now_playing.played_at * 1000;
                    const currentTimestamp = Date.now();
                    const elapsedMs = currentTimestamp - startTimestamp;
                    const durationMs = data.now_playing.duration * 1000;
                    const remainingMs = durationMs - elapsedMs;

                    const showNextSongMs = remainingMs - 20000; // 20 seconds before end

                    // Show next song info 20 seconds before the current song ends
                    if (data.playing_next) {
                        nextSongTimeout = setTimeout(() => {
                            if (currentStationId === stationId) { // Ensure the station is still the current one
                                showNextSongInfo(`Next: ${data.playing_next.song.title} - ${data.playing_next.song.artist}`);
                            }
                        }, showNextSongMs);
                    }

                    // Set timeout to fetch new now playing data and hide the next song info
                    songEndTimeout = setTimeout(() => {
                        if (currentStationId === stationId) { // Ensure the station is still the current one
                            fetchNowPlaying(stationId);
                            clearNextSongInfo();
                        }
                    }, remainingMs);
                } else {
                    songTitle.textContent = 'No song currently playing.';
                    albumArt.src = ''; // Clear album art
                    albumArt.alt = 'No album art available';

                    // Clear Media Session API metadata
                    if ('mediaSession' in navigator) {
                        navigator.mediaSession.metadata = null;
                    }
                }

                // Set the shareable link for the current station
                currentStationLink = `https://radio.banabyte.com/listen/${data.station.shortcode}/radio.mp3`;

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
    const playPauseButton = document.getElementById('play-pause-button');
    const refreshButton = document.getElementById('refresh-button');
    const volumeSlider = document.getElementById('volume-slider');

    playPauseButton.addEventListener('click', () => {
        if (audioPlayer.paused) {
            audioPlayer.play();
        } else {
            audioPlayer.pause();
        }
        updatePlayPauseButton();
    });

    refreshButton.addEventListener('click', () => {
        if (audioPlayer.src) {
            audioPlayer.pause();
            audioPlayer.load(); // Reload the audio source
            audioPlayer.play();
        }
        updatePlayPauseButton();
    });

    volumeSlider.addEventListener('input', () => {
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

    // Event listener for share button
    document.getElementById('share-button').addEventListener('click', () => {
        if (navigator.share) {
            navigator.share({
                title: document.getElementById('station-name').textContent,
                url: currentStationLink
            }).catch(error => console.error('Error sharing:', error));
        } else {
            prompt('Copy this link to share:', currentStationLink);
        }
    });

    // Auto-hide stations sidebar on window resize if width is greater than 768px
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            stationsSidebar.classList.remove('open');
        }
    });
});
