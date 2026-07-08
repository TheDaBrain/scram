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
		this.isNavigating = false;

		this.setupEventListeners();
		this.startUrlUpdateInterval();
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
	 * Start polling for URL changes in the frame
	 * This detects when user clicks links inside Scramjet
	 */
	startUrlUpdateInterval() {
		setInterval(() => {
			if (this.currentFrame && !this.isNavigating) {
				try {
					// Try to get the current URL from the frame
					const frameUrl = this.getCurrentFrameUrl();
					if (frameUrl && frameUrl !== this.addressBar.value) {
						this.updateUrlFromFrame(frameUrl);
					}
				} catch (err) {
					// Silently fail - cross-origin issues are expected
				}
			}
		}, 500);
	}

	/**
	 * Try to get current URL from the Scramjet frame
	 */
	getCurrentFrameUrl() {
		if (!this.currentFrame) return null;

		try {
			// Scramjet exposes the current URL through its API
			if (this.currentFrame.url) {
				return this.currentFrame.url;
			}
			
			// Try to access through window property if available
			if (this.currentFrame.frame && this.currentFrame.frame.contentWindow) {
				const frameWindow = this.currentFrame.frame.contentWindow;
				if (frameWindow.location && frameWindow.location.href) {
					return frameWindow.location.href;
				}
			}
		} catch (err) {
			// Cross-origin or other error
		}
		
		return null;
	}

	/**
	 * Update URL from frame navigation
	 */
	updateUrlFromFrame(url) {
		if (!url || url === "about:blank") return;

		// Update address bar
		this.addressBar.value = url;

		// Only add to history if it's different from current history entry
		const currentHistoryUrl = this.history[this.historyIndex];
		if (url !== currentHistoryUrl) {
			// Trim future history if we navigated forward before
			if (this.historyIndex < this.history.length - 1) {
				this.history = this.history.slice(0, this.historyIndex + 1);
			}
			// Add new URL to history
			this.history.push(url);
			this.historyIndex = this.history.length - 1;
			// Update button states
			this.updateButtonStates();
		}
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

		this.isNavigating = true;

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

		this.isNavigating = false;
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

			// Keep navigating flag true for 2 seconds to prevent polling from adding duplicates
			await new Promise(resolve => setTimeout(resolve, 2000));
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
			this.isNavigating = true;
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
			this.isNavigating = true;
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
			this.isNavigating = true;
			this.currentFrame.go(this.history[this.historyIndex]);
			setTimeout(() => {
				this.isNavigating = false;
			}, 2000);
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
