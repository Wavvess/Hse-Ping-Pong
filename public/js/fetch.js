// this file is for index.html

async function fetchInstagramPosts() {
    try {
      const response = await fetch('/get-instagram-posts');  // Call your backend server to fetch posts
      const posts = await response.json();

      const feedContainer = document.getElementById("instagram-feed");
      feedContainer.innerHTML = "";

      posts.forEach(post => {
        const postElement = document.createElement("div");
        postElement.classList.add("post");

        if (post.media_type === "IMAGE" || post.media_type === "CAROUSEL_ALBUM") {
          postElement.innerHTML = `
            <a href="${post.permalink}" target="_blank">
              <img src="${post.media_url}" alt="${post.caption || 'Instagram Post'}" style="width: 100%; height: auto;">
              <p>${post.caption ? post.caption.substring(0, 100) + '...' : ''}</p>
            </a>
          `;
        } else if (post.media_type === "VIDEO") {
          postElement.innerHTML = `
            <a href="${post.permalink}" target="_blank">
              <video controls style="width: 100%; height: auto;">
                <source src="${post.media_url}" type="video/mp4">
              </video>
              <p>${post.caption ? post.caption.substring(0, 100) + '...' : ''}</p>
            </a>
          `;
        }

        feedContainer.appendChild(postElement);
      });
    } catch (error) {
      console.error("Error fetching Instagram posts:", error);
    }
  }

  document.addEventListener("DOMContentLoaded", fetchInstagramPosts);  // Fetch posts when the page is loaded