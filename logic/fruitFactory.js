/**
 * fruitFactory.js
 * ---------------------------------------------------------------------------
 * Creates the fruit (ball) physics bodies used in the game. Each fruit is a
 * Matter.js circle body with game-specific properties attached. This module
 * is the single place where fruits are created so that id, type, radius,
 * score value, and next merge type are always set consistently.
 *
 * How fruits are created:
 * - create() is called with position (x, y), size index, and optional
 *   Matter.js config (e.g. isStatic for the preview ball). It uses the
 *   game's fruitSizes table to get radius, score value, and image.
 *
 * How they are inserted into the physics world:
 * - The caller (Game.addFruit or merge logic) is responsible for
 *   Composite.add(engine.world, body). We only return the body here.
 *
 * How they are removed during merges:
 * - Merge logic in index.js removes two bodies with Composite.remove and
 *   adds one new body from create(). We do not remove bodies in this file.
 */

(function (global) {
	'use strict';

	var _fruitIdCounter = 0;

	/**
	 * Creates a fruit physics body with full game properties.
	 * Uses the same Matter.js engine and friction as the rest of the game
	 * so fruits fall, bounce, roll, and stack naturally.
	 *
	 * @param {Object} game - Game object with fruitSizes and defaultFriction
	 * @param {number} x - World x position
	 * @param {number} y - World y position
	 * @param {number} sizeIndex - Index into game.fruitSizes (fruit type)
	 * @param {Object} extraConfig - Optional Matter body options (e.g. isStatic, collisionFilter)
	 * @returns {Object} Matter.js body (circle) with: id, fruitType, radius, scoreValue, nextFruitType, sizeIndex, popped
	 */
	function create(game, x, y, sizeIndex, extraConfig) {
		extraConfig = extraConfig || {};
		var sizes = game.fruitSizes;
		var size = sizes[sizeIndex];
		var frictionConfig = game.defaultFriction || {
			friction: 0.006,
			frictionStatic: 0.006,
			frictionAir: 0,
			restitution: 0.1
		};

		var body = Matter.Bodies.circle(x, y, size.radius, {
			...frictionConfig,
			...extraConfig,
			render: {
				sprite: {
					texture: size.img,
					xScale: size.radius / 512,
					yScale: size.radius / 512
				}
			}
		});

		// Unique id for this fruit instance (used by danger line and debugging).
		body.id = 'fruit_' + (++_fruitIdCounter);

		// fruitType: same as sizeIndex; used for merge chain and UI.
		body.fruitType = sizeIndex;

		// radius: used by merge logic and rendering (Matter also sets body.circleRadius).
		body.radius = size.radius;

		// scoreValue: points awarded when this fruit is merged.
		body.scoreValue = size.scoreValue;

		// nextFruitType: size index of the fruit created when this one merges with same size.
		body.nextFruitType = sizeIndex >= sizes.length - 1 ? 0 : sizeIndex + 1;

		// Existing game logic expects sizeIndex and popped.
		body.sizeIndex = sizeIndex;
		body.popped = false;

		return body;
	}

	/**
	 * Resets the internal id counter (e.g. when starting a new game).
	 * Optional; ids only need to be unique per session.
	 */
	function resetIdCounter() {
		_fruitIdCounter = 0;
	}

	global.FruitFactory = {
		create: create,
		resetIdCounter: resetIdCounter
	};
})(typeof window !== 'undefined' ? window : this);
