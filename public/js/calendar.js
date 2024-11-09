// Define meeting dates and details
const meetings = [
  {
    date: new Date(2024, 10, 15),
    details:
      "Ping Pong during Pathways A and B in Frau Reigle's Room: ENL Department",
  },
  {
    date: new Date(2024, 11, 6),
    details:
      "Ping Pong during Pathways A and B in Frau Reigle's Room: ENL Department",
  },
  {
    date: new Date(2024, 11, 16),
    details:
      "Ping Pong during Pathways A and B in Frau Reigle's Room: ENL Department",
  },
  {
    date: new Date(2025, 0, 10),
    details:
      "Ping Pong during Pathways A and B in Frau Reigle's Room: ENL Department",
  },
  {
    date: new Date(2025, 0, 31),
    details:
      "Ping Pong during Pathways A and B in Frau Reigle's Room: ENL Department",
  },
  {
    date: new Date(2025, 1, 14),
    details:
      "Ping Pong during Pathways A and B in Frau Reigle's Room: ENL Department",
  },
  {
    date: new Date(2025, 1, 28),
    details:
      "Ping Pong during Pathways A and B in Frau Reigle's Room: ENL Department",
  },
  {
    date: new Date(2025, 2, 7),
    details:
      "Ping Pong during Pathways A and B in Frau Reigle's Room: ENL Department",
  },
  {
    date: new Date(2025, 2, 14),
    details:
      "Ping Pong during Pathways A and B in Frau Reigle's Room: ENL Department",
  },
  {
    date: new Date(2025, 2, 28),
    details:
      "Ping Pong during Pathways A and B in Frau Reigle's Room: ENL Department",
  },
  {
    date: new Date(2025, 4, 2),
    details:
      "Ping Pong during Pathways A and B in Frau Reigle's Room: ENL Department",
  },
  {
    date: new Date(2025, 4, 16),
    details:
      "Ping Pong during Pathways A and B in Frau Reigle's Room: ENL Department",
  },
];

const calendarDays = document.getElementById("calendar-days");
const monthYear = document.getElementById("month-year");
const currentDate = new Date();
let displayedMonth = currentDate.getMonth();
let displayedYear = currentDate.getFullYear();

// Elements for the popup box
const popupBox = document.getElementById("popup-box");
const popupDate = document.getElementById("popup-date");
const popupDetails = document.getElementById("popup-details");

// Function to show meeting details in the popup box
function showMeetingDetails(meeting, dayElement) {
  const options = { month: "long", day: "numeric", year: "numeric" };
  popupDate.textContent = meeting.date.toLocaleDateString("en-US", options);
  popupDetails.textContent = meeting.details;

  // Get position of the clicked day element within the calendar
  const rect = dayElement.getBoundingClientRect();
  const calendarRect = calendarDays.getBoundingClientRect();
  const popupWidth = popupBox.offsetWidth;
  const buffer = 20; // spacing between date and popup box

  // Check if screen is smaller than or equal to 768px
  if (window.matchMedia("(max-width: 768px)").matches) {
    // Centered positioning for smaller screens
    popupBox.style.top = `${
      rect.bottom - calendarRect.top + window.scrollY + 10
    }px`; // 10px below date
    popupBox.style.left = `50%`; // Centered horizontally
    popupBox.style.transform = `translateX(-50%)`; // Centered alignment

    // Remove tooltip on smaller screens
    const tooltip = dayElement.querySelector(".tooltip");
    if (tooltip) tooltip.style.display = "none"; // Hide tooltip
  } else {
    // Position to the side for larger screens
    popupBox.style.top = `${
      rect.top - calendarRect.top + window.scrollY + rect.height / 2
    }px`;

    // Adjust left or right of the date based on space available
    if (rect.left + popupWidth + buffer < calendarRect.right) {
      popupBox.style.left = `${rect.right - calendarRect.left + buffer}px`; // Right of the date
    } else {
      popupBox.style.left = `${
        rect.left - calendarRect.left - popupWidth - buffer
      }px`; // Left if right space is insufficient
    }

    // Show tooltip again for larger screens (in case it was hidden on mobile)
    const tooltip = dayElement.querySelector(".tooltip");
    if (tooltip) tooltip.style.display = "block"; // Show tooltip
  }

  // Show popup box with transition
  popupBox.classList.add("show");
}

// Close the popup box
function closePopup() {
  popupBox.classList.remove("show");
  popupBox.style.left = ""; // Reset left positioning for next usage
  popupBox.style.top = ""; // Reset top positioning for next usage
}

// Attach event listeners to meeting days
function renderCalendar(month, year) {
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  calendarDays.innerHTML = "";

  // Update month-year header
  const options = { month: "long", year: "numeric" };
  monthYear.textContent = new Date(year, month).toLocaleDateString(
    "en-US",
    options
  );

  // Render empty days for the first week
  for (let i = 0; i < firstDayOfMonth; i++) {
    const emptyDiv = document.createElement("div");
    calendarDays.appendChild(emptyDiv);
  }

  // Render each day in the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDiv = document.createElement("div");
    dayDiv.classList.add(
      "day",
      "bg-gray-100",
      "rounded-lg",
      "p-2",
      "text-gray-800"
    );
    dayDiv.textContent = day;

    // Check if the day has a meeting
    const meeting = meetings.find(
      (m) =>
        m.date.getFullYear() === year &&
        m.date.getMonth() === month &&
        m.date.getDate() === day
    );

    if (meeting) {
      dayDiv.classList.add("meeting-day");

      // Add tooltip
      const tooltip = document.createElement("span");
      tooltip.classList.add("tooltip");
      tooltip.textContent = "Click for details";
      dayDiv.appendChild(tooltip);

      // Add event listener to show details on click
      dayDiv.addEventListener("click", () =>
        showMeetingDetails(meeting, dayDiv)
      );
    }

    calendarDays.appendChild(dayDiv);
  }
}

// Month navigation
document.getElementById("prev-month").addEventListener("click", () => {
  displayedMonth--;
  if (displayedMonth < 0) {
    displayedMonth = 11;
    displayedYear--;
  }
  renderCalendar(displayedMonth, displayedYear);
});

document.getElementById("next-month").addEventListener("click", () => {
  displayedMonth++;
  if (displayedMonth > 11) {
    displayedMonth = 0;
    displayedYear++;
  }
  renderCalendar(displayedMonth, displayedYear);
});

// Initial render
renderCalendar(displayedMonth, displayedYear);
