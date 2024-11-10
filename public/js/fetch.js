// public/js/fetch.js

async function fetchInstagramPosts() {
  try {
    const response = await fetch("/get-instagram-posts");
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const posts = await response.json();

    const feedContainer = document.getElementById("instagram-feed");
    feedContainer.innerHTML = "";

    posts.forEach((post) => {
      const postElement = document.createElement("div");
      postElement.classList.add(
        "bg-white",
        "shadow-lg",
        "rounded-lg",
        "overflow-hidden",
        "w-72",
        "flex-shrink-0",
        "instagram-card",
        "transition-transform",
        "duration-300",
        "hover:scale-105"
      );

      let mediaContent = "";
      if (post.media_type === "IMAGE" || post.media_type === "CAROUSEL_ALBUM") {
        mediaContent = `
          <a href="${post.permalink}" target="_blank">
            <img src="${post.media_url}" alt="${
          post.caption || "Instagram Post"
        }" class="w-full h-72 object-cover">
          </a>
        `;
      } else if (post.media_type === "VIDEO") {
        mediaContent = `
          <a href="${post.permalink}" target="_blank">
            <video controls class="w-full h-72 object-cover">
              <source src="${post.media_url}" type="video/mp4">
            </video>
          </a>
        `;
      }

      postElement.innerHTML = `
        ${mediaContent}
        <div class="p-4">
          <p class="text-gray-700 text-sm">${
            post.caption ? post.caption.substring(0, 100) + "..." : ""
          }</p>
        </div>
      `;

      feedContainer.appendChild(postElement);
    });
  } catch (error) {
    console.error("Error fetching Instagram posts:", error);
    const feedContainer = document.getElementById("instagram-feed");
    feedContainer.innerHTML =
      "<p>Failed to load Instagram posts. Please try again later.</p>";
  }
}

document.addEventListener("DOMContentLoaded", fetchInstagramPosts);
