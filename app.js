(function () {
  'use strict';

  var app = document.getElementById('app');
  var song = document.getElementById('song');
  var mainPlay = document.getElementById('main-play');
  var controls = document.getElementById('controls');
  var pausePlay = document.getElementById('pause-play');
  var restart = document.getElementById('restart');
  var wakeLock = null;

  function requestFullscreen() {
    var request = app.requestFullscreen || app.webkitRequestFullscreen || app.mozRequestFullScreen;

    if (request && !document.fullscreenElement && !document.webkitFullscreenElement) {
      try {
        var result = request.call(app);
        if (result && typeof result.catch === 'function') {
          result.catch(function () {});
        }
      } catch (error) {
        // Fullscreen is an enhancement; playback should still continue.
      }
    }
  }

  function requestWakeLock() {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') {
      return;
    }

    navigator.wakeLock.request('screen').then(function (lock) {
      wakeLock = lock;
      lock.addEventListener('release', function () {
        wakeLock = null;
      });
    }).catch(function () {});
  }

  function releaseWakeLock() {
    if (!wakeLock) {
      return;
    }

    wakeLock.release().catch(function () {});
    wakeLock = null;
  }

  function showPlaybackControls() {
    mainPlay.classList.add('is-hidden');
    controls.classList.add('is-visible');
    controls.setAttribute('aria-hidden', 'false');
  }

  function updatePauseButton() {
    var paused = song.paused;
    pausePlay.classList.toggle('is-paused', paused);
    pausePlay.setAttribute('aria-label', paused ? 'Play song' : 'Pause song');
  }

  function resetToReady() {
    song.currentTime = 0;
    mainPlay.classList.remove('is-hidden');
    controls.classList.remove('is-visible');
    controls.setAttribute('aria-hidden', 'true');
    updatePauseButton();
    releaseWakeLock();
  }

  function playSong() {
    var promise = song.play();

    if (promise && typeof promise.then === 'function') {
      promise.then(function () {
        showPlaybackControls();
        requestWakeLock();
      }).catch(function () {
        resetToReady();
      });
    } else {
      showPlaybackControls();
      requestWakeLock();
    }
  }

  mainPlay.addEventListener('click', function () {
    requestFullscreen();
    playSong();
  });

  pausePlay.addEventListener('click', function () {
    if (song.paused) {
      playSong();
    } else {
      song.pause();
      releaseWakeLock();
    }
  });

  restart.addEventListener('click', function () {
    song.currentTime = 0;
    playSong();
  });

  song.addEventListener('play', updatePauseButton);
  song.addEventListener('pause', updatePauseButton);
  song.addEventListener('ended', resetToReady);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && !song.paused) {
      requestWakeLock();
    }
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
}());
