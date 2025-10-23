import { withPluginApi } from "discourse/lib/plugin-api";
import { action } from "@ember/object";

export default {
  name: "chatgif-initializer",
  
  initialize(container) {
    withPluginApi("0.11.7", (api) => {
      api.registerChatComposerButton({
        id: "chatgif",
        icon: "film",
        label: "chatgif.insert",
        position: "dropdown",
        action: (context) => {
          const composerElement = document.querySelector(".chat-composer__inner-container");
          if (!composerElement) return;

          // Create GIF picker dropdown
          let gifPicker = document.getElementById("chatgif-picker");
          
          if (!gifPicker) {
            gifPicker = document.createElement("div");
            gifPicker.id = "chatgif-picker";
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
              if (!gifPicker.contains(e.target)) {
                gifPicker.style.display = "none";
              }
            });
          }

          // Toggle picker visibility
          const isVisible = gifPicker.style.display === "block";
          gifPicker.style.display = isVisible ? "none" : "block";
          
          if (!isVisible) {
            gifPicker.querySelector(".chatgif-search-input").focus();
          }
        }
      });
    });
  }
};
