/* The local time at the end of the Based row: the time in Dallas–Fort Worth to the minute, with the zone. It is filled before the
   first paint, replaced when the minute changes and when the tab becomes visible again, and nothing else on the page moves when it
   does. No seconds, no animation, no live region. Without script, and in print, the row reads "Central time" (the zone span, until data-live says the clock is running). */
(function () {
  var time = document.querySelector('[data-clock]');
  var row = document.querySelector('[data-clock-row]');
  if (!time || !row || typeof Intl === 'undefined') return;
  var format;
  try {
    format = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  } catch (error) {
    return;
  }
  var timer = 0;
  function tick() {
    var now = new Date();
    var text = format.format(now);
    // A valid global date and time string, to the minute, in UTC.
    var machine = now.toISOString().slice(0, 16) + 'Z';
    if (time.textContent !== text) time.textContent = text;
    if (time.getAttribute('datetime') !== machine) time.setAttribute('datetime', machine);
    row.setAttribute('data-live', '');
    clearTimeout(timer);
    // The next minute, with a few milliseconds of margin so a timer that fires early still reads the new minute.
    timer = setTimeout(tick, 60000 - (now.getTime() % 60000) + 50);
  }
  tick();
  document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); });
})();
