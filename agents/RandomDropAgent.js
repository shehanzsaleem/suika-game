/**
 * RandomDropAgent.js
 * ---------------------------------------------------------------------------
 * Auto-play agent with human-like "thinking": considers 2–5 possible drop
 * positions, jerks the preview between them (variable speed, curvature, brief
 * hesitations), then drops. Motion inspired by HumanCursor-style natural
 * cursor movement (variable speed, acceleration, slight overshoot).
 * https://github.com/riflosnake/HumanCursor
 */

(function (global) {
	'use strict';

	var gameRef = null;
	var runnerRef = null;
	var gameStatesRef = null;
	var wallPadRef = 64;
	var randomFn = null;
	var timeoutId = null;
	var animationId = null;
	/** Number of fruits dropped this run; first 20 use fast no-hesitate mode */
	var dropsCount = 0;
	var FAST_DROPS_LIMIT = 20;
	var FAST_THINK_MS = 200;
	var DELAYS_MS = [500, 1000, 1500, 2000, 3000, 2500];
	var PRE_THINK_MIN_MS = 300;
	var PRE_THINK_MAX_MS = 500;
	var AFTER_DROP_WAIT_MS = 550;
	/** How many options to "consider": 2–5 (normal); first 20 use 2 only */
	var MIN_OPTIONS = 2;
	var MAX_OPTIONS = 5;
	/** Pause at each option (hesitation), ms; 0 for first 20 drops */
	var HESITATE_MIN_MS = 80;
	var HESITATE_MAX_MS = 220;
	/** Overshoot as fraction of segment distance (human-like overshoot then correct) */
	var OVERSHOOT_FRACTION = 0.08;
	/** Max overshoot randomness */
	var OVERSHOOT_RANDOM = 0.06;

	function random() {
		return randomFn ? randomFn() : Math.random();
	}

	function randomInt(min, max) {
		return min + Math.floor(random() * (max - min + 1));
	}

	function randomInRange(min, max) {
		return min + random() * (max - min);
	}

	function randomX() {
		var pad = wallPadRef;
		var width = gameRef ? gameRef.width : 640;
		var left = pad;
		var right = width - pad;
		return left + random() * (right - left);
	}

	function pickThinkDurationMs() {
		var index = Math.floor(random() * DELAYS_MS.length);
		return DELAYS_MS[index];
	}

	function pickPreThinkDelayMs() {
		return randomInRange(PRE_THINK_MIN_MS, PRE_THINK_MAX_MS);
	}

	/**
	 * Human-like easing (HumanCursor-style): variable speed — slow start,
	 * accelerate in middle, decelerate at end. No overshoot here; we add
	 * overshoot separately so the path feels natural.
	 */
	function humanEase(t) {
		return t <= 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
	}

	/**
	 * One segment: startX → endX over durationMs with variable speed and
	 * a slight overshoot then settle (mimics real human jerk/correction).
	 */
	function moveSegment(startX, endX, durationMs, onComplete) {
		var startTime = null;
		var overshoot = OVERSHOOT_FRACTION + random() * OVERSHOOT_RANDOM;
		var direction = endX > startX ? 1 : -1;
		var distance = Math.abs(endX - startX);
		var overshootPx = distance * overshoot * direction;

		var preview = gameRef.elements.previewBall;
		if (!preview) {
			if (onComplete) onComplete();
			return;
		}

		function tick(now) {
			if (!startTime) startTime = now;
			var elapsed = now - startTime;
			var t = Math.min(elapsed / durationMs, 1);
			var e = humanEase(t);
			// Overshoot: go past target then settle (human micro-correction)
			var x = startX + (endX - startX) * e + overshootPx * Math.sin(t * Math.PI);
			preview.position.x = x;

			if (t < 1) {
				animationId = requestAnimationFrame(tick);
				return;
			}
			preview.position.x = endX;
			animationId = null;
			if (onComplete) onComplete();
		}

		animationId = requestAnimationFrame(tick);
	}

	/**
	 * Shared drop + callback: increment count, drop, then call finalCallback after wait.
	 */
	function doDrop(dropX, finalCallback) {
		if (gameRef.stateIndex === gameStatesRef.READY && runnerRef.enabled) {
			gameRef.addFruit(dropX);
		}
		dropsCount += 1;
		setTimeout(finalCallback, AFTER_DROP_WAIT_MS);
	}

	/**
	 * Fast sequence for first 20 drops: 2 options only, 200ms total, no hesitation.
	 */
	function runFastSequence(finalCallback) {
		var preview = gameRef.elements.previewBall;
		if (!gameRef || !runnerRef || !gameStatesRef || !preview) {
			if (finalCallback) finalCallback();
			return;
		}
		var numOptions = 2;
		var candidates = [randomX(), randomX()];
		var dropX = candidates[numOptions - 1];
		var segmentDuration = FAST_THINK_MS / numOptions;
		var index = 0;
		var currentX = preview.position.x;

		function runNext() {
			if (index >= numOptions) {
				doDrop(dropX, finalCallback);
				return;
			}
			var targetX = candidates[index];
			index += 1;
			moveSegment(currentX, targetX, segmentDuration, function () {
				currentX = targetX;
				runNext();
			});
		}
		runNext();
	}

	/**
	 * Full "think" sequence: 2–5 options, jerk to each with hesitation,
	 * then drop. Uses the full thinkDurationMs.
	 */
	function runThinkSequence(thinkDurationMs, finalCallback) {
		var preview = gameRef.elements.previewBall;
		if (!gameRef || !runnerRef || !gameStatesRef || !preview) {
			if (finalCallback) finalCallback();
			return;
		}

		var numOptions = randomInt(MIN_OPTIONS, MAX_OPTIONS);
		var candidates = [];
		for (var i = 0; i < numOptions; i++) {
			candidates.push(randomX());
		}
		var dropX = candidates[numOptions - 1];

		var hesitateTotal = numOptions * randomInRange(HESITATE_MIN_MS, HESITATE_MAX_MS);
		var moveTotal = Math.max(200, thinkDurationMs - hesitateTotal);
		var segmentDuration = moveTotal / numOptions;

		var index = 0;
		var currentX = preview.position.x;

		function runNext() {
			if (index >= numOptions) {
				doDrop(dropX, finalCallback);
				return;
			}

			var targetX = candidates[index];
			index += 1;

			moveSegment(currentX, targetX, segmentDuration, function () {
				currentX = targetX;
				var hesitateMs = randomInRange(HESITATE_MIN_MS, HESITATE_MAX_MS);
				setTimeout(runNext, hesitateMs);
			});
		}

		runNext();
	}

	function scheduleNext() {
		var preThinkMs = pickPreThinkDelayMs();
		var useFast = dropsCount < FAST_DROPS_LIMIT;
		timeoutId = setTimeout(function () {
			timeoutId = null;
			if (!gameRef || !runnerRef || !gameStatesRef) {
				return;
			}
			if (gameRef.stateIndex !== gameStatesRef.READY || !runnerRef.enabled) {
				scheduleNext();
				return;
			}
			if (useFast) {
				runFastSequence(scheduleNext);
			} else {
				runThinkSequence(pickThinkDurationMs(), scheduleNext);
			}
		}, preThinkMs);
	}

	function init(game, runner, gameStates, opts) {
		gameRef = game;
		runnerRef = runner;
		gameStatesRef = gameStates;
		opts = opts || {};
		wallPadRef = opts.wallPad != null ? opts.wallPad : 64;
		randomFn = opts.random || null;
	}

	function start() {
		if (timeoutId != null || animationId != null) return;
		dropsCount = 0;
		scheduleNext();
	}

	function stop() {
		if (timeoutId != null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
		if (animationId != null) {
			cancelAnimationFrame(animationId);
			animationId = null;
		}
	}

	global.RandomDropAgent = {
		init: init,
		start: start,
		stop: stop
	};
})(typeof window !== 'undefined' ? window : this);
