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

                const stationName = data.station.name;
                const songTitle = data.now_playing ? `${data.now_playing.song.title} - ${data.now_playing.song.artist}` : 'No song currently playing';
                const albumArt = data.now_playing && data.now_playing.song.art ? data.now_playing.song.art : null;
                const listenUrl = data.station.listen_url;

                // Update Media Session API information
                if ('mediaSession' in navigator) {
                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: songTitle,
                        artist: data.now_playing.song.artist,
                        album: data.now_playing.song.album,
                        artwork: [
                            { src: albumArt, sizes: '256x256', type: 'image/png' }
                        ]
                    });

                    navigator.mediaSession.setActionHandler('play', function() {
                        audioPlayer.play();
                    });

                    navigator.mediaSession.setActionHandler('pause', function() {
                        audioPlayer.pause();
                    });

                    navigator.mediaSession.setActionHandler('seekbackward', function() {
                        audioPlayer.currentTime -= 10;
                    });

                    navigator.mediaSession.setActionHandler('seekforward', function() {
                        audioPlayer.currentTime += 10;
                    });
                }

                // Display information on the webpage
                const stationNameElement = document.getElementById('station-name');
                const songTitleElement = document.getElementById('song-title');
                const audioPlayer = document.getElementById('audio-player');
                const albumArtElement = document.getElementById('album-art');

                stationNameElement.textContent = stationName;
                songTitleElement.textContent = songTitle;
                audioPlayer.src = listenUrl;

                if (albumArt) {
                    albumArtElement.src = albumArt;
                    albumArtElement.alt = `${data.now_playing.song.artist} - ${data.now_playing.song.title}`;
                    albumArtElement.style.display = 'block';
                } else {
                    albumArtElement.style.display = 'none';
                }

                if (data.now_playing) {
                    audioPlayer.play();
                } else {
                    audioPlayer.pause();
                }

                // Set background image to a specific URL
                document.body.style.backgroundImage = 'url("https://radio.banabyte.com/static/uploads/banabyte_radio/background.1700689313.png")';
            })
            .catch(error => console.error('Error fetching now playing information:', error));
    }
});
