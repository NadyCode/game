/* main.js — Entry point: init, input, render loop. */

(function() {
  const canvas = document.getElementById('game');
  const renderer = new Renderer(canvas);
  const game = new Game();

  // Pre-generate sprites
  initSprites();

  // Initial render
  renderer.render(game);

  // ---- Input handling ----
  document.addEventListener('keydown', (e) => {
    let key = e.key;

    // Prevent browser defaults for game keys
    const prevent = [
      'ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
      ' ', 'Enter',
    ];
    if (prevent.includes(key)) e.preventDefault();

    // Normalize
    if (key === ' ') key = ' ';

    game.handleKey(key);
    renderer.render(game);
  });

  // ---- Also support click-to-start on title ----
  canvas.addEventListener('click', () => {
    if (game.state === STATE.TITLE) {
      game.handleKey('Enter');
      renderer.render(game);
    }
  });
})();
