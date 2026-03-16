/**
 * FruitProgressionPanel.js
 * ---------------------------------------------------------------------------
 * Simple UI component that shows the fruit upgrade chain under the game board.
 * This is purely informational: it reads the game's fruitSizes array and
 * renders a horizontal row of fruit icons with arrows between them.
 *
 * Where the progression panel reads fruit data:
 * - On init(), we receive a reference to the game object and read
 *   game.fruitSizes (array of { img, radius, scoreValue, ... }). We do not
 *   subscribe to changes; the order is static. If you add or reorder fruits
 *   in the game config, re-init or call render() again to refresh the panel.
 */

(function (global) {
	'use strict';

	var containerEl = null;
	var panelEl = null;
	var gameRef = null;

	var ICON_SIZE = 32;
	var ARROW_HTML = '<span class="fruit-progression-arrow" aria-hidden="true">→</span>';

	/**
	 * Builds the progression row from game.fruitSizes and appends it to the panel.
	 */
	function render() {
		if (!panelEl || !gameRef || !gameRef.fruitSizes) return;

		panelEl.innerHTML = '';
		var sizes = gameRef.fruitSizes;

		for (var i = 0; i < sizes.length; i++) {
			var item = document.createElement('span');
			item.className = 'fruit-progression-item';

			var img = document.createElement('img');
			img.src = sizes[i].img;
			img.alt = 'Fruit ' + (i + 1);
			img.width = ICON_SIZE;
			img.height = ICON_SIZE;
			img.className = 'fruit-progression-icon';
			item.appendChild(img);

			panelEl.appendChild(item);
			if (i < sizes.length - 1) {
				var arrow = document.createElement('span');
				arrow.className = 'fruit-progression-arrow';
				arrow.textContent = '→';
				arrow.setAttribute('aria-hidden', 'true');
				panelEl.appendChild(arrow);
			}
		}
	}

	/**
	 * Initializes the panel and appends it to the given container.
	 *
	 * @param {string|HTMLElement} container - Selector or element to append the panel to (e.g. '.container' or '#container')
	 * @param {Object} game - Game object with fruitSizes array
	 */
	function init(container, game) {
		gameRef = game;
		containerEl = typeof container === 'string' ? document.querySelector(container) : container;
		if (!containerEl) return;

		panelEl = document.getElementById('fruit-progression-panel');
		if (!panelEl) {
			panelEl = document.createElement('div');
			panelEl.id = 'fruit-progression-panel';
			panelEl.className = 'fruit-progression-panel';
			panelEl.setAttribute('aria-label', 'Fruit progression order');
			containerEl.appendChild(panelEl);
		}

		render();
	}

	/**
	 * Re-renders the panel (e.g. if fruitSizes changed). Uses the game reference passed at init.
	 */
	function refresh() {
		render();
	}

	global.FruitProgressionPanel = {
		init: init,
		render: render,
		refresh: refresh
	};
})(typeof window !== 'undefined' ? window : this);
