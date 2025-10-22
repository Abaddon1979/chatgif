import { apiInitializer } from "discourse/lib/api";
import { h } from "virtual-dom";
import { createPopper } from "@popperjs/core";

export default apiInitializer("0.11.7", (api) => {
  const chatService = api.container.lookup("service:chat");
  
  if (!chatService) return;

  api.modifyClass("component:chat-composer", {
    pluginId: "chatgif",

    didInsertElement() {
      this._super(...arguments);
      this._setupGifPicker();
    },

    willDestroyElement() {
      this._super(...arguments);
      if (this._gifPopper) {
        this._gifPopper.destroy();
      }
    },

    _setupGifPicker() {
      const composerElement = document.querySelector(".chat-composer__inner-container");
      if (!composerElement) return;

      // Create GIF button
      const gifButton = document.createElement("button");
      gifButton.className = "btn no-text chat-composer-button btn-transparent -gif";
      gifButton.innerHTML = `
        <svg class="fa d-icon d-icon-film svg-icon svg-string" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
          <use href="#film"></use>
        </svg>
      `;
      gifButton.title = "Insert GIF";
      gifButton.type = "button";

      // Insert GIF button before the emoji button
      const emojiButton = composerElement.querySelector(".emoji-picker-trigger");
      if (emojiButton) {
        emojiButton.parentNode.insertBefore(gifButton, emojiButton);
      }

      // Create GIF picker dropdown
      const gifPicker = document.createElement("div");
      gifPicker.className = "chatgif-picker popup-menu";
      gifPicker.style.display = "none";
      gifPicker.innerHTML = `
        <div class="chatgif-search">
          <input type="text" placeholder="Search GIFs..." class="chatgif-search-input">
          <button class="btn btn-primary chatgif-search-btn">Search</button>
        </div>
        <div class="chatgif-results"></div>
        <div class="chatgif-loading" style="display: none;">Loading...</div>
      `;

      document.body.appendChild(gifPicker);

      // Set up popper for positioning
      this._gifPopper = createPopper(gifButton, gifPicker, {
        placement: "top-start",
        modifiers: [
          {
            name: "offset",
            options: {
              offset: [0, 8],
            },
          },
        ],
      });

      // Event handlers
      gifButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const isVisible = gifPicker.style.display === "block";
        gifPicker.style.display = isVisible ? "none" : "block";
        
        if (!isVisible) {
          gifPicker.querySelector(".chatgif-search-input").focus();
        }
      });

      const searchInput = gifPicker.querySelector(".chatgif-search-input");
      const searchBtn = gifPicker.querySelector(".chatgif-search-btn");
      const resultsContainer = gifPicker.querySelector(".chatgif-results");
      const loadingIndicator = gifPicker.querySelector(".chatgif-loading");

      const performSearch = () => {
        const query = searchInput.value.trim();
        if (!query) return;

        loadingIndicator.style.display = "block";
        resultsContainer.innerHTML = "";

        fetch(`/chatgif/search?q=${encodeURIComponent(query)}&limit=12`)
          .then(response => response.json())
          .then(data => {
            loadingIndicator.style.display = "none";
            
            if (data.error) {
              resultsContainer.innerHTML = `<div class="chatgif-error">${data.error}</div>`;
              return;
            }

            const gifs = data.results || [];
            if (gifs.length === 0) {
              resultsContainer.innerHTML = '<div class="chatgif-no-results">No GIFs found</div>';
              return;
            }

            gifs.forEach(gif => {
              const gifElement = document.createElement("div");
              gifElement.className = "chatgif-item";
              gifElement.innerHTML = `
                <img src="${gif.media_formats.gif.url}" alt="${gif.content_description}" loading="lazy">
              `;
              
              gifElement.addEventListener("click", () => {
                const textarea = document.querySelector(".chat-composer__input");
                if (textarea) {
                  const gifUrl = gif.media_formats.gif.url;
                  const currentValue = textarea.value;
                  const newValue = currentValue + ` ${gifUrl} `;
                  textarea.value = newValue;
                  textarea.focus();
                  
                  // Trigger input event to update composer state
                  textarea.dispatchEvent(new Event("input", { bubbles: true }));
                }
                
                gifPicker.style.display = "none";
              });

              resultsContainer.appendChild(gifElement);
            });
          })
          .catch(error => {
            loadingIndicator.style.display = "none";
            resultsContainer.innerHTML = `<div class="chatgif-error">Failed to load GIFs: ${error.message}</div>`;
          });
      };

      searchBtn.addEventListener("click", performSearch);
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          performSearch();
        }
      });

      // Close picker when clicking outside
      document.addEventListener("click", (e) => {
        if (!gifPicker.contains(e.target) && e.target !== gifButton) {
          gifPicker.style.display = "none";
        }
      });
    },
  });
});
