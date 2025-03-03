// Global variables to store the full dataset and chart instances
let allFilms = [];       // full dataset for charts (never changes)
let countryChart = null;
let topDirectorsChart = null;

/**
 * Main application initialization.
 * Loads film data, stores the full dataset, initializes filters and search,
 * and renders the charts (only once, using allFilms).
 */
document.addEventListener('DOMContentLoaded', () => {
  fetch('films.json')
    .then(response => response.json())
    .then(data => {
      // Store the full film dataset for use in charts
      allFilms = data;
      // Initially display the complete films table (table uses its own filtered array)
      displayFilms(allFilms);
      // Populate the year filter with available release years
      populateYearFilter(allFilms);
      // Set up event listeners for search and sorting that update only the table
      addSearchFunctionality();
      addSortFunctionality();
      // Render charts once using the complete dataset (charts remain unchanged)
      renderCharts(allFilms);
    })
    .catch(error => console.error('Error loading films:', error));
});

/**
 * Updates the films table based on current filter, search, and sort settings.
 * This function works on a separate (filtered) array for the table,
 * while charts always use the full dataset (allFilms).
 */
function updateTable() {
  // Start with the full dataset for the table (do not modify allFilms)
  let filteredFilms = allFilms.slice();

  // Apply year filter if selected
  const selectedYear = document.querySelector('#year-filter').value;
  if (selectedYear) {
    filteredFilms = filteredFilms.filter(film => film.release_year == selectedYear);
  }

  // Apply search filter (case-insensitive)
  const searchValue = document.querySelector('#search-input').value.toLowerCase();
  if (searchValue) {
    filteredFilms = filteredFilms.filter(film =>
      film.title.toLowerCase().includes(searchValue)
    );
  }

  // Apply sorting if a sort option is selected; otherwise, default to box office descending
  const sortValue = document.querySelector('#sort-filter').value;
  if (sortValue) {
    filteredFilms = sortFilms(filteredFilms, sortValue);
  } else {
    filteredFilms.sort((a, b) => b.box_office - a.box_office);
  }

  // Update the films table with the resulting filtered and sorted array
  // Charts are not updated here, so their canvas is never re-used
  displayFilms(filteredFilms);
}

/**
 * Displays films in a table format with rankings.
 * Each film row includes a tooltip with the film summary.
 *
 * @param {Array} films - Array of film objects (filtered for table).
 */
function displayFilms(films) {
  const tbody = document.querySelector('#films-table tbody');
  tbody.innerHTML = '';

  // Create table rows for each film
  films.forEach((film, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td class="film-title" data-summary="${film.summary}">
        <a href="${film.film_url}" target="_blank">${film.title}</a>
      </td>
      <td>${film.release_year}</td>
      <td>${film.director}</td>
      <td>$${film.box_office.toLocaleString()}</td>
      <td>${film.country}</td>
    `;
    tbody.appendChild(row);
  });

  // Setup tooltip for film summaries
  const titleCells = document.querySelectorAll('.film-title');
  let tooltip = document.querySelector('.tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.classList.add('tooltip');
    document.body.appendChild(tooltip);
  }
  titleCells.forEach(cell => {
    cell.addEventListener('mouseover', (e) => {
      tooltip.textContent = e.target.getAttribute('data-summary');
      tooltip.style.opacity = 1;
    });
    cell.addEventListener('mousemove', (e) => {
      const mouseX = e.pageX + 15;
      const mouseY = e.pageY + 15;
      tooltip.style.left = `${mouseX}px`;
      tooltip.style.top = `${mouseY}px`;
    });
    cell.addEventListener('mouseout', () => {
      tooltip.style.opacity = 0;
    });
  });
}

/**
 * Populates the year filter dropdown with unique, sorted release years.
 *
 * @param {Array} films - Array of film objects.
 */
function populateYearFilter(films) {
  const yearFilter = document.querySelector('#year-filter');
  // Extract unique years and sort them
  const years = [...new Set(films.map(film => film.release_year))].sort((a, b) => a - b);
  // Clear previous options and add a default option
  yearFilter.innerHTML = '<option value="">Select Year</option>';
  years.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearFilter.appendChild(option);
  });
  // When the year filter changes, update only the table
  yearFilter.addEventListener('change', updateTable);
}

/**
 * Sets up sorting functionality for the films table.
 * Sorting is applied based on user selection and updates only the table.
 */
function addSortFunctionality() {
  const sortFilter = document.querySelector('#sort-filter');
  sortFilter.addEventListener('change', updateTable);
}

/**
 * Sets up real-time search functionality for the films table.
 */
function addSearchFunctionality() {
  const searchInput = document.querySelector('#search-input');
  searchInput.addEventListener('input', updateTable);
}

/**
 * Sorts films based on the selected criteria.
 *
 * @param {Array} films - Array of film objects.
 * @param {string} sortBy - Sorting criteria.
 * @returns {Array} Sorted array of films.
 */
function sortFilms(films, sortBy) {
  switch (sortBy) {
    case 'title-asc':
      return [...films].sort((a, b) => a.title.localeCompare(b.title));
    case 'title-desc':
      return [...films].sort((a, b) => b.title.localeCompare(a.title));
    case 'year-asc':
      return [...films].sort((a, b) => a.release_year - b.release_year);
    case 'year-desc':
      return [...films].sort((a, b) => b.release_year - a.release_year);
    case 'box-asc':
      return [...films].sort((a, b) => a.box_office - b.box_office);
    case 'box-desc':
      return [...films].sort((a, b) => b.box_office - a.box_office);
    default:
      return films;
  }
}

/**
 * Renders all visualization charts using the full dataset.
 * Charts are rendered only once during initialization and are not updated by table changes.
 *
 * @param {Array} films - Array of film objects (the full dataset for charts).
 */
function renderCharts(films) {
  renderCountryChart(films);
  renderTopDirectorsChart(films);
}

/**
 * Renders a pie chart showing film distribution by country.
 * Destroys any previous chart instance before rendering a new chart.
 *
 * @param {Array} films - Array of film objects.
 */
function renderCountryChart(films) {
  const ctx = document.getElementById('country-chart').getContext('2d');
  // Ensure any existing chart on this canvas is destroyed
  if (countryChart) {
    countryChart.destroy();
  }
  // Count films per country
  const countryCounts = films.reduce((acc, film) => {
    acc[film.country] = (acc[film.country] || 0) + 1;
    return acc;
  }, {});
  // Create a new pie chart instance and store it in the global variable
  countryChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(countryCounts),
      datasets: [{
        label: 'Number of Films',
        data: Object.values(countryCounts),
        backgroundColor: [
          'rgba(93, 64, 55, 0.6)',
          'rgba(141, 110, 99, 0.6)',
          'rgba(188, 170, 164, 0.6)',
          'rgba(215, 204, 200, 0.6)',
          'rgba(239, 235, 233, 0.6)'
        ],
        borderColor: [
          'rgba(93, 64, 55, 1)',
          'rgba(141, 110, 99, 1)',
          'rgba(188, 170, 164, 1)',
          'rgba(215, 204, 200, 1)',
          'rgba(239, 235, 233, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: 'bottom'
        }
      },
      aspectRatio: 1.5
    }
  });
}

/**
 * Renders a pie chart of the top 5 directors by total revenue.
 * Includes a tooltip showing total revenue and film count.
 * Destroys any previous chart instance before rendering a new chart.
 *
 * @param {Array} films - Array of film objects.
 */
function renderTopDirectorsChart(films) {
  const ctx = document.getElementById('top-directors-chart').getContext('2d');
  if (topDirectorsChart) {
    topDirectorsChart.destroy();
  }
  // Aggregate revenue and film count per director
  const directorData = films.reduce((acc, film) => {
    if (!acc[film.director]) {
      acc[film.director] = { revenue: 0, films: 0 };
    }
    acc[film.director].revenue += film.box_office;
    acc[film.director].films += 1;
    return acc;
  }, {});
  // Sort directors by revenue descending and take the top 5
  const topDirectors = Object.entries(directorData)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);
  // Create a new pie chart instance for top directors
  topDirectorsChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: topDirectors.map(d => d[0]),
      datasets: [{
        data: topDirectors.map(d => d[1].revenue),
        backgroundColor: [
          'rgba(93, 64, 55, 0.6)',
          'rgba(141, 110, 99, 0.6)',
          'rgba(188, 170, 164, 0.6)',
          'rgba(215, 204, 200, 0.6)',
          'rgba(239, 235, 233, 0.6)'
        ],
        borderColor: [
          'rgba(93, 64, 55, 1)',
          'rgba(141, 110, 99, 1)',
          'rgba(188, 170, 164, 1)',
          'rgba(215, 204, 200, 1)',
          'rgba(239, 235, 233, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            // Custom tooltip to display director revenue and film count
            label: function(tooltipItem) {
              const director = topDirectors[tooltipItem.dataIndex];
              return `${director[0]}: $${director[1].revenue.toLocaleString()} (${director[1].films} films)`;
            }
          }
        },
        legend: {
          display: true,
          position: 'bottom'
        }
      },
      aspectRatio: 1.5
    }
  });
}
