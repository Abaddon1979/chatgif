import { withPluginApi } from "discourse/lib/plugin-api";
import { action } from "@ember/object";
import { getURL } from "discourse-common/lib/get-url";

export default {
  name: "chatgif-initializer",
  
  initialize(container) {
    withPluginApi("0.11.7", (api) => {
      const siteSettings = api.container.lookup("site-settings:main");

      // Normalize URL path (ignore host and trailing slashes) for robust comparisons
      const normalizePath = (u) => {
        try {
          const url = new URL(u, window.location.origin);
          return url.pathname.replace(/\/+$/, "");
        } catch (_e) {
          return (u || "").replace(/https?:\/\/[^/]+/, "").replace(/\/+$/, "");
        }
      };

      // Hide duplicate link previews when a oneboxed link is followed by the same image.
      // This removes the top hyperlink (anchor.onebox) and keeps just the image.
      const processChatForDuplicateLinkPreviews = (root = document) => {
        const anchors = Array.from(
          root.querySelectorAll?.(
            '.chat-message a[href], .chat-message-container a[href], .tc-message a[href], .cooked a[href], a.onebox[href]'
          ) || []
        );
        anchors.forEach((a) => {
          const href = a.getAttribute('href') || '';
          const isImageLike =
            /\.(gif|png|jpe?g|webp)(\?.*)?$/i.test(href) ||
            href.includes('tenor.com') ||
            href.includes('giphy.com') ||
            href.includes('media.tenor.com') ||
            href.includes('media.giphy.com');

          const imgInside = a.querySelector('img');

          // Try to scope to a single chat message container
          const messageEl =
            a.closest('.chat-message, .chat-message-container, .chat-message-text, .message, .tc-message, .cooked') || a.parentElement;

          // Find any image in the same message and compare normalized paths
          const imgsInMsg = Array.from(messageEl?.querySelectorAll?.('img[src]') || []);
          const hrefPath = normalizePath(href);
          const hasSameImage = imgsInMsg.some((img) => {
            const src = img.getAttribute('src') || '';
            const srcPath = normalizePath(src);
            return (
              src === href ||
              srcPath === hrefPath ||
              srcPath.endsWith(hrefPath) ||
              hrefPath.endsWith(srcPath)
            );
          });

          if (isImageLike) {
            // Helper to hide nearby caret toggles
            const hideCaret = () => {
              const maybeCarets = [
                a.previousElementSibling,
                a.nextElementSibling,
                ...(messageEl?.querySelectorAll?.('svg.d-icon-caret-right') || []),
              ].filter(Boolean);
              maybeCarets.forEach((el) => {
                if (el && el.tagName === 'SVG' && el.classList.contains('d-icon-caret-right')) {
                  el.style.display = 'none';
                  el.classList.add('chatgif-hidden-caret');
                }
              });
            };

            if (imgInside) {
              // Unwrap: keep the image but remove its hyperlink wrapper
              a.replaceWith(imgInside);
              hideCaret();
            } else if (hasSameImage) {
              // Hide only the hyperlink line if the same image is elsewhere in the message
              a.style.display = 'none';
              a.classList.add('chatgif-hidden-onebox');
              hideCaret();
            }
          }
        });
        
        // Also hide carets in messages where a link line has been hidden
        const carets = Array.from(root.querySelectorAll?.('svg.d-icon-caret-right') || []);
        carets.forEach((svg) => {
          const msg = svg.closest('.chat-message, .chat-message-container, .chat-message-text, .message, .tc-message, .cooked');
          if (msg && msg.querySelector('a.chatgif-hidden-onebox')) {
            svg.style.display = 'none';
            svg.classList.add('chatgif-hidden-caret');
          }
        });
      };

      // Run once at startup in case messages are already present
      processChatForDuplicateLinkPreviews(document);

      // Inline image preview for image URLs typed into the chat composer
      const attachPreviewToComposer = (inputEl) => {
        if (!inputEl || inputEl.dataset.chatgifPreviewAttached) return;
        inputEl.dataset.chatgifPreviewAttached = "true";

        const container = inputEl.closest(".chat-composer__input-container");
        if (!container) return;

        let preview = container.querySelector(".chatgif-inline-preview");
        if (!preview) {
          preview = document.createElement("div");
          preview.className = "chatgif-inline-preview";
          preview.style.display = "none";
          container.appendChild(preview);
        }

        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const isImageUrl = (u) => /\.(gif|png|jpe?g|webp)(\?.*)?$/i.test(u);

        const updatePreview = () => {
          let value = inputEl.value || "";

          // If markdown image token is present, strip it and keep URL hidden for preview/sending
          const mdMatch = value.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/);
          if (mdMatch && mdMatch[1]) {
            inputEl.dataset.chatgifHiddenUrl = mdMatch[1];
            value = value
              .replace(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g, "")
              .replace(/\s{2,}/g, " ")
              .trimStart();
            inputEl.value = value;
          }

          const urls = (value.match(urlRegex) || []).filter(isImageUrl);
          const candidate = inputEl.dataset.chatgifHiddenUrl || urls[0];

          preview.innerHTML = "";
          if (!candidate) {
            preview.style.display = "none";
            // remove padding shift when no preview
            container.classList.remove("chatgif-has-preview");
            container.style.removeProperty("--chatgif-preview-h");
            return;
          }
          // show only the chosen image URL (hidden or first detected)
          const u = candidate;

          // Hide the raw URL in the input so only the image is shown while composing.
          // We'll convert to markdown image right before sending.
          if (urls[0] && value.includes(urls[0]) && inputEl.dataset.chatgifHiddenUrl !== urls[0]) {
            inputEl.dataset.chatgifHiddenUrl = urls[0];
            inputEl.value = value.replace(urls[0], "").replace(/\s{2,}/g, " ").trimStart();
          }

          const img = document.createElement("img");
          img.src = u;
          img.alt = "preview";
          img.loading = "lazy";
          // scale preview down in composer (avoid gigantic preview)
          img.style.maxHeight = "120px";
          img.style.width = "auto";
          img.style.maxWidth = "100%";
          // when image loads, measure and push textarea content below so the link isn't visible
          img.addEventListener("load", () => {
            // ensure container is marked so CSS can apply padding
            container.classList.add("chatgif-has-preview");
            // give the browser a tick to layout the image
            requestAnimationFrame(() => {
              const h = Math.min(preview.getBoundingClientRect().height || img.naturalHeight || 0, 120);
              container.style.setProperty("--chatgif-preview-h", `${Math.max(0, Math.round(h))}px`);
            });
          });
          preview.appendChild(img);
          // show the overlay
          preview.style.display = "block";
        };

        inputEl.addEventListener("input", updatePreview);
        inputEl.addEventListener("paste", () => setTimeout(updatePreview, 0));

        // before sending, re-append hidden URL so message contains the image link
        const appendHiddenUrlBeforeSend = () => {
          const hidden = inputEl.dataset.chatgifHiddenUrl;
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          const isImageUrl = (u) => /\.(gif|png|jpe?g|webp)(\?.*)?$/i.test(u);

          const current = inputEl.value || "";
          // collect all image URLs currently in the text plus the hidden one
          const foundUrls = (current.match(urlRegex) || []).filter(isImageUrl);
          const all = Array.from(new Set([...(hidden ? [hidden] : []), ...foundUrls]));

          // strip all raw URLs from the text so no link gets posted
          let textOnly = current.replace(urlRegex, "").replace(/\s{2,}/g, " ").trim();

          // Rebuild message using ONLY raw image URLs so chat oneboxes to an image.
          // The UI hook will hide the separate hyperlink line if an image follows.
          const rawUrls = all.join("\n");
          inputEl.value = [textOnly, rawUrls].filter(Boolean).join(textOnly ? "\n" : "");
          inputEl.dispatchEvent(new Event("input", { bubbles: true }));

          // Immediately send to avoid a visible intermediate "link text" state in the composer
          const composerRootEl = container.closest(".chat-composer__inner-container");
          const sendBtnEl = composerRootEl?.querySelector(".chat-composer-button.-send");
          if (sendBtnEl) {
            setTimeout(() => {
              try {
                sendBtnEl.click();
              } catch (_e) {}
            }, 0);
          }

          // Defer clearing preview so user doesn't see link text flicker before post
          setTimeout(() => {
            delete inputEl.dataset.chatgifHiddenUrl;
            preview.style.display = "none";
            preview.innerHTML = "";
            container.classList.remove("chatgif-has-preview");
            container.style.removeProperty("--chatgif-preview-h");
          }, 300);
        };

        // handle Enter to send (without Shift)
        inputEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            appendHiddenUrlBeforeSend();
          }
        });

        // handle clicking the send button
        const composerRoot = container.closest(".chat-composer__inner-container");
        const sendBtn = composerRoot?.querySelector(".chat-composer-button.-send");
        if (sendBtn && !sendBtn.dataset.chatgifHooked) {
          sendBtn.dataset.chatgifHooked = "true";
          // mousedown runs before the click triggers send
          sendBtn.addEventListener("mousedown", appendHiddenUrlBeforeSend);
        }

        updatePreview();
      };

      // Attach to existing and future chat composers
      const initExistingInputs = () => {
        document
          .querySelectorAll(".chat-composer__input")
          .forEach((el) => attachPreviewToComposer(el));
      };
      initExistingInputs();

      const mo = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.addedNodes || []) {
            if (!(node instanceof HTMLElement)) continue;
            if (node.matches && node.matches(".chat-composer__input")) {
              attachPreviewToComposer(node);
            }
            node
              .querySelectorAll?.(".chat-composer__input")
              .forEach((el) => attachPreviewToComposer(el));

            // Clean up duplicate link + image combos in newly added chat content
            processChatForDuplicateLinkPreviews(node);
          }
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });

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
                      // do not insert visible text; store URL for preview and send
                      textarea.dataset.chatgifHiddenUrl = gifUrl;
                      // trigger preview update
                      textarea.dispatchEvent(new Event("input", { bubbles: true }));
                      textarea.focus();
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
