// State Management
let allSources = [];
let filteredSources = [];
let loadedCount = 0;
const itemsPerPage = 40;

const state = {
  search: '',
  channels: [],
  types: [],
  tag: '',
  sort: 'newest'
};

// DOM Elements
const searchInput = document.getElementById('search-input');
const btnClearSearch = document.getElementById('btn-clear-search');
const btnResetFilters = document.getElementById('btn-reset-filters');
const channelsContainer = document.getElementById('filter-channels-container');
const typesContainer = document.getElementById('filter-types-container');
const tagsContainer = document.getElementById('preset-tags-container');
const sortSelect = document.getElementById('sort-select');
const summaryText = document.getElementById('search-summary-text');
const sourcesGrid = document.getElementById('sources-grid-container');
const btnLoadMore = document.getElementById('btn-load-more');
const loadMoreLoader = document.getElementById('load-more-loader');
const totalCountDisplay = document.getElementById('total-count-display');

// Modal Elements
const detailsModal = document.getElementById('details-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const modalTypeBadge = document.getElementById('modal-type-badge');
const modalScriptTitle = document.getElementById('modal-script-title');
const modalMetaSource = document.getElementById('modal-meta-source');
const modalMetaAuthor = document.getElementById('modal-meta-author');
const modalMetaDate = document.getElementById('modal-meta-date');
const modalMetaSize = document.getElementById('modal-meta-size');
const codeViewerContainer = document.getElementById('code-viewer-container');
const editorTitle = document.getElementById('editor-title');
const modalCodeDisplay = document.getElementById('modal-code-display');
const btnCopyCode = document.getElementById('btn-copy-code');
const copyCodeText = document.getElementById('copy-code-text');
const downloadLinkBox = document.getElementById('download-link-box');
const downloadLinkDescr = document.getElementById('download-link-descr');
const btnModalDownload = document.getElementById('btn-modal-download');
const btnCopyUrl = document.getElementById('btn-copy-url');

// Toast Notification
const toastNotify = document.getElementById('toast-notify');
const toastMessageText = document.getElementById('toast-message-text');

// Init application
document.addEventListener('DOMContentLoaded', () => {
  fetchSources();
  setupEventListeners();
});

// Fetch Database
async function fetchSources() {
  try {
    const response = await fetch('/sources.json');
    if (!response.ok) throw new Error('Database response error');
    
    allSources = await response.json();
    filteredSources = [...allSources];
    
    // Update total count
    totalCountDisplay.textContent = allSources.length.toLocaleString();
    
    // Apply filters and render
    applyFilters();
  } catch (error) {
    console.error('Error fetching source database:', error);
    summaryText.innerHTML = '<span class="text-error">Error loading index files. Please check the local data files.</span>';
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Search Input
  searchInput.addEventListener('input', (e) => {
    state.search = e.target.value.trim().toLowerCase();
    btnClearSearch.style.display = state.search ? 'block' : 'none';
    debounceApplyFilters();
  });
  
  btnClearSearch.addEventListener('click', () => {
    searchInput.value = '';
    state.search = '';
    btnClearSearch.style.display = 'none';
    applyFilters();
    searchInput.focus();
  });
  
  // Channels Filters
  channelsContainer.addEventListener('change', () => {
    const checked = Array.from(channelsContainer.querySelectorAll('input:checked'));
    state.channels = checked.map(input => input.value);
    applyFilters();
  });
  
  // Types Filters
  typesContainer.addEventListener('change', () => {
    const checked = Array.from(typesContainer.querySelectorAll('input:checked'));
    state.types = checked.map(input => input.value);
    applyFilters();
  });
  
  // Tag Preset Buttons
  tagsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.preset-tag');
    if (!btn) return;
    
    const tag = btn.dataset.tag;
    if (state.tag === tag) {
      state.tag = '';
      btn.classList.remove('active');
    } else {
      tagsContainer.querySelectorAll('.preset-tag').forEach(t => t.classList.remove('active'));
      state.tag = tag;
      btn.classList.add('active');
    }
    applyFilters();
  });
  
  // Reset Filters Button
  btnResetFilters.addEventListener('click', () => {
    // Reset search
    searchInput.value = '';
    state.search = '';
    btnClearSearch.style.display = 'none';
    
    // Reset Checkboxes
    channelsContainer.querySelectorAll('input').forEach(i => i.checked = false);
    state.channels = [];
    
    typesContainer.querySelectorAll('input').forEach(i => i.checked = false);
    state.types = [];
    
    // Reset Tags
    tagsContainer.querySelectorAll('.preset-tag').forEach(t => t.classList.remove('active'));
    state.tag = '';
    
    // Reset Sorting
    sortSelect.value = 'newest';
    state.sort = 'newest';
    
    applyFilters();
  });
  
  // Sorting Change
  sortSelect.addEventListener('change', (e) => {
    state.sort = e.target.value;
    applyFilters();
  });
  
  // Pagination Load More
  btnLoadMore.addEventListener('click', loadMoreItems);
  
  // Open Card Modal
  sourcesGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.source-card');
    if (!card) return;
    
    // Prevent opening modal if clicking the download/copy buttons directly on card
    if (e.target.closest('.btn-card-action')) return;
    
    const sourceId = card.dataset.id;
    openModal(sourceId);
  });
  
  // Close Modal
  btnCloseModal.addEventListener('click', closeModal);
  detailsModal.addEventListener('click', (e) => {
    if (e.target === detailsModal) closeModal();
  });
  
  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && detailsModal.classList.contains('active')) {
      closeModal();
    }
  });
  
  // Copy to clipboard handlers inside Modal
  let activeScriptContent = '';
  let activeScriptUrl = '';
  
  btnCopyCode.addEventListener('click', () => {
    if (!activeScriptContent) return;
    navigator.clipboard.writeText(activeScriptContent)
      .then(() => {
        copyCodeText.textContent = 'Copied!';
        btnCopyCode.style.backgroundColor = '#ffffff';
        btnCopyCode.style.color = '#000000';
        showToast('Script copied to clipboard!');
        
        setTimeout(() => {
          copyCodeText.textContent = 'Copy Script';
          btnCopyCode.style.backgroundColor = '';
          btnCopyCode.style.color = '';
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  });
  
  btnCopyUrl.addEventListener('click', () => {
    if (!activeScriptUrl) return;
    navigator.clipboard.writeText(activeScriptUrl)
      .then(() => {
        btnCopyUrl.textContent = 'Copied!';
        showToast('Link copied to clipboard!');
        
        setTimeout(() => {
          btnCopyUrl.textContent = 'Copy Link';
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy URL: ', err);
      });
  });
}

// Debounce filtering helper
let debounceTimeout;
function debounceApplyFilters() {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(applyFilters, 250);
}

// Filter and Sort Engine
function applyFilters() {
  // Reset scroll loading
  loadedCount = 0;
  
  // 1. Filter data
  filteredSources = allSources.filter(item => {
    // Search filter
    if (state.search) {
      const matchTitle = item.title.toLowerCase().includes(state.search);
      const matchAuthor = item.author.toLowerCase().includes(state.search);
      const matchContent = item.content ? item.content.toLowerCase().includes(state.search) : false;
      const matchFile = item.sourceFile.toLowerCase().includes(state.search);
      
      if (!matchTitle && !matchAuthor && !matchContent && !matchFile) return false;
    }
    
    // Channel filter
    if (state.channels.length > 0 && !state.channels.includes(item.sourceFile)) {
      return false;
    }
    
    // Type filter
    if (state.types.length > 0 && !state.types.includes(item.type)) {
      return false;
    }
    
    // Tag filter
    if (state.tag) {
      const matchTag = item.title.toLowerCase().includes(state.tag) || 
                       (item.content ? item.content.toLowerCase().includes(state.tag) : false);
      if (!matchTag) return false;
    }
    
    return true;
  });
  
  // 2. Sort data
  if (state.sort === 'newest') {
    // Discord timestamps parsed. Fallback using ID index
    filteredSources.sort((a, b) => b.id.localeCompare(a.id));
  } else if (state.sort === 'oldest') {
    filteredSources.sort((a, b) => a.id.localeCompare(b.id));
  } else if (state.sort === 'name-asc') {
    filteredSources.sort((a, b) => a.title.localeCompare(b.title));
  } else if (state.sort === 'name-desc') {
    filteredSources.sort((a, b) => b.title.localeCompare(a.title));
  }
  
  // 3. Update Summary Text
  if (allSources.length === 0) {
    summaryText.textContent = "Loading index files...";
  } else {
    summaryText.innerHTML = `Showing <strong>${filteredSources.length.toLocaleString()}</strong> of <strong>${allSources.length.toLocaleString()}</strong> scripts matching filters`;
  }
  
  // 4. Render initial items
  sourcesGrid.innerHTML = '';
  renderNextPage();
}

// Render next batch of items
function renderNextPage() {
  const start = loadedCount;
  const end = Math.min(start + itemsPerPage, filteredSources.length);
  
  if (filteredSources.length === 0) {
    sourcesGrid.innerHTML = `
      <div class="no-results">
        <span class="no-results-icon">🔍</span>
        <h3>No Scripts Found</h3>
        <p>No results match your current search query or active filter selections. Try relaxing your filters or resetting them.</p>
      </div>
    `;
    btnLoadMore.style.display = 'none';
    return;
  }
  
  const fragment = document.createDocumentFragment();
  
  for (let i = start; i < end; i++) {
    const item = filteredSources[i];
    const card = document.createElement('div');
    card.className = 'source-card';
    card.dataset.id = item.id;
    
    // Category label shorthand
    let shortFile = item.sourceFile;
    if (shortFile.includes("Elite")) shortFile = "Elite Hub";
    else if (shortFile.includes("Mega")) shortFile = "Mega Community";
    else if (shortFile.includes("Cypher")) shortFile = "Cypher";
    else if (shortFile.includes("Azure")) shortFile = "Azure Hub";
    else if (shortFile.includes("Qrypt")) shortFile = "Qrypt";
    else if (shortFile.includes("SourcesHub")) shortFile = "SourcesHub";

    // Clean timestamp format (e.g. 2026-06-05)
    let displayDate = 'Unknown';
    if (item.timestamp) {
      // Split date
      const parts = item.timestamp.split(' ');
      displayDate = parts[0] || item.timestamp;
    }
    
    // Type tags styling
    let typeName = "Code";
    if (item.type === 'attachment') typeName = "Attachment";
    if (item.type === 'external_link') typeName = "External URL";
    
    card.innerHTML = `
      <div class="card-top">
        <div class="card-origin">
          <span class="origin-badge">${shortFile}</span>
          <span class="type-pill">${typeName}</span>
        </div>
        <h3 class="card-title">${escapeHTML(item.title)}</h3>
      </div>
      <div class="card-mid">
        <div class="card-author">
          <span class="author-prefix">by</span>
          <span>${escapeHTML(item.author)}</span>
        </div>
      </div>
      <div class="card-bottom">
        <span class="card-meta">${displayDate}</span>
        <button type="button" class="btn-card-action">Inspect</button>
      </div>
    `;
    
    fragment.appendChild(card);
  }
  
  sourcesGrid.appendChild(fragment);
  loadedCount = end;
  
  // Show / hide load more button
  if (loadedCount < filteredSources.length) {
    btnLoadMore.style.display = 'flex';
  } else {
    btnLoadMore.style.display = 'none';
  }
}

// Load more trigger callback
function loadMoreItems() {
  btnLoadMore.disabled = true;
  loadMoreLoader.style.display = 'inline-block';
  
  // Delay slightly for smooth rendering layout
  setTimeout(() => {
    renderNextPage();
    btnLoadMore.disabled = false;
    loadMoreLoader.style.display = 'none';
  }, 300);
}

// Modal Controller
function openModal(id) {
  const item = allSources.find(s => s.id === id);
  if (!item) return;
  
  // Types badge and tags
  let typeName = "Code block";
  if (item.type === 'attachment') typeName = "Attachment file";
  if (item.type === 'external_link') typeName = "External website";
  modalTypeBadge.textContent = typeName;
  
  modalScriptTitle.textContent = item.title;
  modalMetaSource.textContent = item.sourceFile;
  modalMetaAuthor.textContent = item.author;
  modalMetaDate.textContent = item.timestamp || 'Unknown';
  modalMetaSize.textContent = item.size || 'N/A';
  
  // Populate body based on type
  if (item.type === 'code_block') {
    codeViewerContainer.style.display = 'flex';
    editorTitle.textContent = item.title.toLowerCase().endsWith('.lua') ? item.title : `${item.title}.lua`;
    modalCodeDisplay.textContent = item.content;
    
    // Store content for copy button
    btnCopyCode.style.display = 'flex';
    btnCopyCode.dataset.content = item.content;
    
    // Hide download box
    downloadLinkBox.style.display = 'none';
  } else {
    // For attachments or links
    // Check if there is some script text in content (e.g. if code was also extracted)
    if (item.content && item.content !== `Attachment file posted by ${item.author}. Size: ${item.size}.` && !item.content.startsWith('External link')) {
      codeViewerContainer.style.display = 'flex';
      editorTitle.textContent = item.title;
      modalCodeDisplay.textContent = item.content;
      btnCopyCode.style.display = 'flex';
      btnCopyCode.dataset.content = item.content;
    } else {
      codeViewerContainer.style.display = 'none';
    }
    
    // Configure download link box
    downloadLinkBox.style.display = 'flex';
    if (item.type === 'attachment') {
      downloadLinkDescr.textContent = `Original discord attachment source file. File name: ${item.title} (${item.size})`;
    } else {
      downloadLinkDescr.textContent = `External website paste link. URL: ${item.url}`;
    }
    
    // Handle relative vs absolute links
    let finalUrl = item.url;
    // If it's a relative link matching local exports folder
    if (item.url.includes('_Files/')) {
      // It points to a relative folder. We display it but add a warning or handle as local download.
      btnModalDownload.href = `file:///C:/Users/meqda/OneDrive/Documents/${item.url.replace(/%20/g, ' ')}`;
      downloadLinkDescr.textContent = `This attachment is a local file export. Expected path: Documents/${decodeURIComponent(item.url)}`;
    } else {
      btnModalDownload.href = item.url;
    }
    
    btnCopyUrl.dataset.url = item.url;
  }
  
  // Set active variables for copying
  btnCopyCode.clickEventValue = item.content || '';
  btnCopyUrl.clickEventValue = item.url || '';
  
  // Display Modal
  detailsModal.classList.add('active');
  detailsModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  detailsModal.classList.remove('active');
  detailsModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  
  // Clear modal contents
  setTimeout(() => {
    modalCodeDisplay.textContent = '';
  }, 250);
}

// Show Toast Alerts
function showToast(message) {
  toastMessageText.textContent = message;
  toastNotify.classList.add('active');
  
  setTimeout(() => {
    toastNotify.classList.remove('active');
  }, 2500);
}

// Helper to escape HTML tags
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Store clipboard values correctly on the element objects
Object.defineProperty(HTMLElement.prototype, 'clickEventValue', {
  get: function() { return this._val; },
  set: function(val) {
    this._val = val;
    if (this.id === 'btn-copy-code') {
      window.activeScriptContent = val;
    } else if (this.id === 'btn-copy-url') {
      window.activeScriptUrl = val;
    }
  }
});
