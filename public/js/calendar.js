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

// Define special days with red highlights and unique messages
const specialDays = [
  { date: new Date(2024, 10, 20), message: "Special Event: Ping Pong Tournament!" },
  { date: new Date(2024, 11, 25), message: "Holiday Break - No Meetings Today!" },
  // Add more special dates as needed
];

const calendarDays = document.getElementById("calendar-days");
const monthYear = document.getElementById("month-year");
const currentDate = new Date();
let displayedMonth = currentDate.getMonth();
let displayedYear = currentDate.getFullYear();

// Popup Elements
const popupBox = document.getElementById("popup-box");
const popupDate = document.getElementById("popup-date");
const popupDetails = document.getElementById("popup-details");

// Function to show meeting or special day details in the popup box
function showMeetingDetails(eventInfo, dayElement) {
  const options = { month: "long", day: "numeric", year: "numeric" };
  popupDate.textContent = eventInfo.date.toLocaleDateString("en-US", options);
  popupDetails.textContent = eventInfo.details || eventInfo.message;

  // Check if the clicked day is a special day
  if (dayElement.classList.contains("special-day")) {
    popupBox.classList.add("special-day-popup"); // Add red styling
  } else {
    popupBox.classList.remove("special-day-popup"); // Remove red styling if not a special day
  }

  const rect = dayElement.getBoundingClientRect();
  const calendarRect = calendarDays.getBoundingClientRect();
  const popupWidth = popupBox.offsetWidth;
  const buffer = 20;

  if (window.matchMedia("(max-width: 768px)").matches) {
    popupBox.style.top = `${rect.bottom - calendarRect.top + window.scrollY + 10}px`;
    popupBox.style.left = `50%`;
    popupBox.style.transform = `translateX(-50%)`;
  } else {
    popupBox.style.top = `${rect.top - calendarRect.top + window.scrollY + rect.height / 2}px`;
    if (rect.left + popupWidth + buffer < calendarRect.right) {
      popupBox.style.left = `${rect.right - calendarRect.left + buffer}px`;
    } else {
      popupBox.style.left = `${rect.left - calendarRect.left - popupWidth - buffer}px`;
    }
  }

  popupBox.classList.add("show");
}


// Close the popup box
window.closePopup = function () {
  popupBox.classList.remove("show");
  popupBox.style.left = "";
  popupBox.style.top = "";
};

// Attach event listeners to meeting and special days
function renderCalendar(month, year) {
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  calendarDays.innerHTML = "";

  const options = { month: "long", year: "numeric" };
  monthYear.textContent = new Date(year, month).toLocaleDateString("en-US", options);

  for (let i = 0; i < firstDayOfMonth; i++) {
    const emptyDiv = document.createElement("div");
    calendarDays.appendChild(emptyDiv);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayDiv = document.createElement("div");
    dayDiv.classList.add("day", "bg-gray-100", "rounded-lg", "p-2", "text-gray-800");
    dayDiv.textContent = day;

    const meeting = meetings.find(
      (m) => m.date.getFullYear() === year && m.date.getMonth() === month && m.date.getDate() === day
    );

    const specialDay = specialDays.find(
      (s) => s.date.getFullYear() === year && s.date.getMonth() === month && s.date.getDate() === day
    );

    if (meeting) {
      dayDiv.classList.add("meeting-day", "bg-blue-100");
      const tooltip = document.createElement("span");
      tooltip.classList.add("tooltip");
      tooltip.textContent = "Click for details";
      dayDiv.appendChild(tooltip);
      dayDiv.addEventListener("click", () => showMeetingDetails(meeting, dayDiv));
    } else if (specialDay) {
      dayDiv.classList.add("special-day", "bg-red-100", "text-red-700");
      const tooltip = document.createElement("span");
      tooltip.classList.add("tooltip");
      tooltip.textContent = "Click for details";
      dayDiv.appendChild(tooltip);
      dayDiv.addEventListener("click", () => showMeetingDetails(specialDay, dayDiv));
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
