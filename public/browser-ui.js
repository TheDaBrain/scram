"use strict";

/**
 * Browser UI Controller
 * Manages the browser-like interface with address bar and navigation controls
 */

class BrowserUI {
	constructor() {
		this.container = document.getElementById("browser-container");
		this.landingPage = document.getElementById("landing-page");
		this.frameContainer = document.getElementById("sj-frame-container");
		this.addressBar = document.getElementById("address-bar");
		this.btnEnter = document.getElementById("btn-enter");
		this.btnBack = document.getElementById("btn-back");
		this.btnForward = document.getElementById("btn-forward");
		this.btnRefresh = document.getElementById("btn-refresh");
		this.currentFrame = null;
		this.history = [];
		this.historyIndex = -1;

		this.setupEventListeners();
	}

	setupEventListeners() {
		// Enter button click
		this.btnEnter.addEventListener("click", () => this.navigate());

		// Address bar Enter key
		this.addressBar.addEventListener("keypress", (e) => {
			if (e.key === "Enter") {
				this.navigate();
			}
		});

		// Navigation buttons
		this.btnBack.addEventListener("click", () => this.goBack());
		this.btnForward.addEventListener("click", () => this.goForward());
		this.btnRefresh.addEventListener("click", () => this.refresh());

		// Update address bar when frame navigates
		this.frameContainer.addEventListener("message", (e) => {
			if (e.data && e.data.url) {
				this.addressBar.value = e.data.url;
			}
		}, false);
	}

	/**
	 * Show the browser UI and hide landing page
	 */
	show() {
		this.landingPage.style.display = "none";
		this.container.classList.remove("browser-hidden");
	}

	/**
	 * Hide the browser UI and show landing page
	 */
	hide() {
		this.container.classList.add("browser-hidden");
		this.landingPage.style.display = "flex";
		this.clearFrame();
	}

	/**
	 * Navigate to URL or search term
	 */
	async navigate() {
		const input = this.addressBar.value.trim();
		if (!input) return;

		// Get search engine template
		const searchEngine = document.getElementById("sj-search-engine").value;
		const url = search(input, searchEngine);

		// Add to history
		if (this.historyIndex < this.history.length - 1) {
			this.history = this.history.slice(0, this.historyIndex + 1);
		}
		this.history.push(url);
		this.historyIndex = this.history.length - 1;

		// Update address bar
		this.addressBar.value = url;

		// Load in frame
		await this.loadFrame(url);

		// Update button states
		this.updateButtonStates();
	}

	/**
	 * Load URL in the Scramjet frame
	 */
	async loadFrame(url) {
		this.show();

		try {
			// Register service worker if needed
			await registerSW();

			// Setup Scramjet frame
			const frame = scramjet.createFrame();
			frame.frame.id = "sj-frame";
			frame.frame.class = "sj-frame";

			// Replace existing frame
			this.clearFrame();
			this.frameContainer.appendChild(frame.frame);
			this.currentFrame = frame;

			// Navigate
			frame.go(url);
		} catch (err) {
			console.error("Failed to load frame:", err);
			const error = document.getElementById("sj-error");
			error.textContent = "Failed to load page.";
		}
	}

	/**
	 * Clear current frame
	 */
	clearFrame() {
		if (this.currentFrame) {
			const frame = document.getElementById("sj-frame");
			if (frame) frame.remove();
			this.currentFrame = null;
		}
	}

	/**
	 * Navigate back in history
	 */
	goBack() {
		if (this.historyIndex > 0) {
			this.historyIndex--;
			this.addressBar.value = this.history[this.historyIndex];
			this.loadFrame(this.history[this.historyIndex]);
			this.updateButtonStates();
		}
	}

	/**
	 * Navigate forward in history
	 */
	goForward() {
		if (this.historyIndex < this.history.length - 1) {
			this.historyIndex++;
			this.addressBar.value = this.history[this.historyIndex];
			this.loadFrame(this.history[this.historyIndex]);
			this.updateButtonStates();
		}
	}

	/**
	 * Refresh current page
	 */
	refresh() {
		if (this.currentFrame) {
			this.currentFrame.go(this.history[this.historyIndex]);
		}
	}

	/**
	 * Update button states based on history
	 */
	updateButtonStates() {
		this.btnBack.disabled = this.historyIndex <= 0;
		this.btnForward.disabled = this.historyIndex >= this.history.length - 1;
	}
}

// Create global browser UI instance
window.browserUI = new BrowserUI();