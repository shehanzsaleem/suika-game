/**
 * dangerLineLogic.js
 * ---------------------------------------------------------------------------
 * Implements the loss condition based on a "danger line" near the top of the
 * container. Overflow detection uses a grace-period timer so that brief
 * bounces above the line do not immediately end the game.
 *
 * How the danger line timer works:
 * - Each physics tick (afterUpdate), we scan all non-static bodies that
 *   look like fruits (have circleRadius). If a fruit's top (position.y - radius)
 *   is above DANGER_LINE_Y, we record the first time it crossed (or keep the
 *   existing time). If it has been above the line for longer than GRACE_PERIOD_MS,
 *   we call game.loseGame() and stop. If a fruit drops back below the line,
 *   we remove it from the "above line" set so the timer is reset for that fruit.
 * - Only one fruit needs to stay above the line for the full grace period to
 *   trigger game over. This prevents unfair losses from small physics bounces.
 */

(function (global) {
	'use strict';

	var engine = null;
	var game = null;
	var options = {};
	var aboveLineSince = {}; // bodyId -> timestamp when first seen above line
	var dangerLineEl = null;

	var DANGER_LINE_Y_DEFAULT = 120;
	var GRACE_PERIOD_MS_DEFAULT = 1500;

	/**
	 * Returns the y position (in game coordinates) of the danger line.
	 * Used by the UI to draw the line and by the overflow check.
	 */
	function getDangerLineY() {
		return (options && options.dangerLineY != null) ? options.dangerLineY : DANGER_LINE_Y_DEFAULT;
	}

	/**
	 * Overflow detection: check each fruit body. If above the line, track time;
	 * if above for longer than grace period, end game. If below, clear tracking.
	 */
	function checkOverflow() {
		if (!engine || !game || game.stateIndex === 3) return; // 3 = LOSE

		var world = engine.world;
		var bodies = Matter.Composite.allBodies(world);
		var lineY = getDangerLineY();
		var graceMs = (options && options.gracePeriodMs != null) ? options.gracePeriodMs : GRACE_PERIOD_MS_DEFAULT;
		var now = Date.now();

		for (var i = 0; i < bodies.length; i++) {
			var b = bodies[i];
			if (b.isStatic) continue;
			if (b.circleRadius == null) continue; // only care about fruit circles

			var topY = b.position.y - b.circleRadius;
			var isAbove = topY < lineY;

			if (isAbove) {
				if (!aboveLineSince[b.id]) {
					aboveLineSince[b.id] = now;
				}
				if (now - aboveLineSince[b.id] >= graceMs) {
					game.loseGame();
					return;
				}
			} else {
				delete aboveLineSince[b.id];
			}
		}
	}

	function onAfterUpdate() {
		checkOverflow();
	}

	/**
	 * Initializes the danger line logic and optionally a visible line element.
	 *
	 * @param {Object} eng - Matter.js engine
	 * @param {Object} gameRef - Game object (must have loseGame() and stateIndex)
	 * @param {Object} opts - { dangerLineY?: number, gracePeriodMs?: number, dangerLineElementId?: string }
	 */
	function init(eng, gameRef, opts) {
		engine = eng;
		game = gameRef;
		options = opts || {};
		aboveLineSince = {};

		Matter.Events.on(engine, 'afterUpdate', onAfterUpdate);

		var elId = options.dangerLineElementId || 'danger-line';
		dangerLineEl = document.getElementById(elId);
		if (dangerLineEl) {
			dangerLineEl.style.top = getDangerLineY() + 'px';
			dangerLineEl.style.display = 'block';
		}
	}

	/**
	 * Call when starting a new game so the timer state is fresh.
	 */
	function reset() {
		aboveLineSince = {};
	}

	/**
	 * Detach from engine and hide the line. Call when leaving the game or reinitializing.
	 */
	function destroy() {
		if (engine) {
			Matter.Events.off(engine, 'afterUpdate', onAfterUpdate);
		}
		if (dangerLineEl) {
			dangerLineEl.style.display = 'none';
		}
		engine = null;
		game = null;
		aboveLineSince = {};
	}

	global.DangerLineLogic = {
		init: init,
		reset: reset,
		destroy: destroy,
		getDangerLineY: getDangerLineY
	};
})(typeof window !== 'undefined' ? window : this);
