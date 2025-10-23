import { withPluginApi } from "discourse/lib/plugin-api";
import { action } from "@ember/object";
import { getURL } from "discourse-common/lib/get-url";

export default {
  name: "chatgif-initializer",
  
  initialize(container) {
    withPluginApi("0.11.7", (api) => {
      const siteSettings = api.container.lookup("site-settings:main");
      api.registerChatComposerButton({
        id: "chatgif",
        icon: "film",
        label: "chatgif.insert",
        position: "dropdown",
        action: (context) => {
          const composerElement = document.querySelector(".chat-composer__inner-container");
          if (!composerElement) return;

          // Create backdrop
          let backdrop = document.getElementById("chatgif-backdrop");
          if (!backdrop) {
            backdrop = document.createElement("div");
            backdrop.id = "chatgif-backdrop";
            backdrop.className = "chatgif-backdrop";
            document.body.appendChild(backdrop);
          }

          // Create GIF picker modal
          let gifPicker = document.getElementById("chatgif-picker");
          
          if (!gifPicker) {
            gifPicker = document.createElement("div");
            gifPicker.id = "chatgif-picker";
            gifPicker.className = "chatgif-picker";
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

              const renderError = (msg) => {
                resultsContainer.innerHTML = `<div class="chatgif-error">${msg}</div>`;
              };

              const renderResults = (gifs) => {
                if (!gifs || gifs.length === 0) {
                  resultsContainer.innerHTML = '<div class="chatgif-no-results">No GIFs found</div>';
                  return;
                }
                gifs.forEach((gif) => {
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
                    backdrop.classList.remove("visible");
                  });

                  resultsContainer.appendChild(gifElement);
                });
              };

              // Direct Tenor call (avoids server routing issues)
              const apiKey =
                (siteSettings && siteSettings.chatgif_tenor_api_key) || "";
              if (!apiKey) {
                loadingIndicator.style.display = "none";
                renderError("Tenor API key not configured. Set it in Admin → Settings → Plugins → chatgif_tenor_api_key");
                return;
              }

              const tenorUrl = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(
                query
              )}&key=${encodeURIComponent(
                apiKey
              )}&client_key=discourse_chatgif&limit=12&media_filter=gif&contentfilter=high`;

              (async () => {
                try {
                  const resp = await fetch(tenorUrl);
                  if (!resp.ok) {
                    const t = await resp.text();
                    throw new Error(`Tenor HTTP ${resp.status}: ${t.slice(0, 120)}`);
                  }
                  const data = await resp.json();
                  loadingIndicator.style.display = "none";
                  renderResults(data.results || []);
                } catch (e) {
                  loadingIndicator.style.display = "none";
                  renderError(`Failed to load GIFs: ${e.message}`);
                }
              })();
            };

            searchBtn.addEventListener("click", performSearch);
            searchInput.addEventListener("keypress", (e) => {
              if (e.key === "Enter") {
                performSearch();
              }
            });

            // Close picker when clicking backdrop
            backdrop.addEventListener("click", () => {
              gifPicker.style.display = "none";
              backdrop.classList.remove("visible");
            });
          }

          // Toggle picker and backdrop visibility
          const isVisible = gifPicker.style.display === "block";
          gifPicker.style.display = isVisible ? "none" : "block";
          
          if (isVisible) {
            backdrop.classList.remove("visible");
          } else {
            backdrop.classList.add("visible");
            gifPicker.querySelector(".chatgif-search-input").focus();
          }
        }
      });
    });
  }
};
