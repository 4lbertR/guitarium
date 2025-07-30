/**
 * Guitarium Multi-language Translation System
 * Supports Estonian (et) and English (en)
 * Default language: Estonian
 */

const translations = {
  et: {
    // Login page (index.html)
    'login_title': 'Guitarium Login',
    'login_heading': 'Logi sisse',
    'fullname_placeholder': 'Ees- ja perekonnanimi',
    'password_placeholder': 'Parool',
    'login_button': 'Logi sisse',
    'wrong_credentials': 'Vale nimi või parool.',
    'network_error': 'Võrguviga või serveri viga.',
    
    // Success page (success.html)
    'events_title': 'Sündmused',
    'logout_button': 'Logi välja',
    'next_lessons_heading': 'Järgmised tunnid:',
    'past_lessons_heading': 'Möödunud tunnid:',
    'loading': 'Laen...',
    'your_group': 'Sinu grupp on',
    'joined_lessons': 'Oled liitunud',
    'max_lessons': 'tunniga',
    'upcoming': 'Tulemas:',
    'past': 'Möödunud:',
    'participants': 'Osalejad:',
    'join_button': 'Liitu',
    'leave_button': 'Loobu',
    'too_late_error': 'Ei saa loobuda vähem kui 24h enne algust.',
    'overflow_error': 'Sa oled liitunud maksimaalse arvu tunniga',
    'full_error': 'Tund on täis.',
    'action_failed': 'Toiming ebaõnnestus.',
    'participants_error': 'Osalejate laadimisel tekkis viga.',
    'events_load_error': '❌ Viga sündmuste laadimisel',
    
    // Forgot password page
    'forgot_title': 'Unustasid parooli+',
    'forgot_heading': 'Unustasid parooli?',
    'forgot_text': 'Parooli taastamiseks saada e-kiri aadressile',
    
    // Admin panel
    'admin_title': 'Admin Panel',
    'create_account': 'Loo konto',
    'edit_user': 'Muuda kasutaja andmeid',
    'add_lesson': 'Lisa tund',
    'delete_group': 'Kustuta grupp',
    'import_sheets': 'Impotri google sheetsist',
    
    // Admin - Create Account
    'back_button': 'Tagasi',
    'create_new_user': 'Lisa uus kasutaja',
    'fullname_label': 'Ees- ja perekonnanimi:',
    'password_label': 'Parool:',
    'group_label': 'Kasutaja grupp (nt E1, B2):',
    'create_account_button': 'Loo konto',
    
    // Admin - Edit User
    'edit_user_data': 'Muuda kasutaja andmeid',
    'delete_user': 'Kustuta kasutaja',
    
    // Admin - Create Lesson
    'create_lesson_title': 'Lisa tund',
    'select_group': 'Vali grupp:',
    'date_label': 'Kuupäev:',
    'start_time_label': 'Algusaeg:',
    'end_time_label': 'Lõpuaeg:',
    'create_lesson_button': 'Loo tund',
    
    // Admin - Delete Group
    'delete_group_title': 'Kustuta grupp',
    'group_to_delete': 'Kustutamiseks mõeldud grupp:',
    'delete_group_button': 'Kustuta grupp',
    
    // Admin - Bulk Add
    'bulk_import_title': 'Hulgalisamine Google Sheetsist',
    'sheet_id_label': 'Sheet ID:',
    'import_button': 'Impordi',
    
    // Common messages
    'success_message': 'Toiming õnnestus!',
    'error_message': 'Tekkis viga!',
    'network_error_message': 'Võrguviga või server pole kättesaadav.',
    'unknown_error': 'Teadmatu viga.',
    
    // Language selector
    'language_label': 'Keel:',
    'estonian': 'Eesti',
    'english': 'English'
  },
  
  en: {
    // Login page (index.html)
    'login_title': 'Guitarium Login',
    'login_heading': 'Log In',
    'fullname_placeholder': 'First and Last Name',
    'password_placeholder': 'Password',
    'login_button': 'Log In',
    'wrong_credentials': 'Wrong name or password.',
    'network_error': 'Network error or server error.',
    
    // Success page (success.html)
    'events_title': 'Events',
    'logout_button': 'Log Out',
    'next_lessons_heading': 'Upcoming Lessons:',
    'past_lessons_heading': 'Past Lessons:',
    'loading': 'Loading...',
    'your_group': 'Your group is',
    'joined_lessons': 'You have joined',
    'max_lessons': 'lessons',
    'upcoming': 'Upcoming:',
    'past': 'Past:',
    'participants': 'Participants:',
    'join_button': 'Join',
    'leave_button': 'Leave',
    'too_late_error': 'Cannot cancel less than 24h before start.',
    'overflow_error': 'You have joined the maximum number of lessons',
    'full_error': 'Lesson is full.',
    'action_failed': 'Action failed.',
    'participants_error': 'Error loading participants.',
    'events_load_error': '❌ Error loading events',
    
    // Forgot password page
    'forgot_title': 'Forgot Password',
    'forgot_heading': 'Forgot Password?',
    'forgot_text': 'To reset your password, send an email to',
    
    // Admin panel
    'admin_title': 'Admin Panel',
    'create_account': 'Create Account',
    'edit_user': 'Edit User Data',
    'add_lesson': 'Add Lesson',
    'delete_group': 'Delete Group',
    'import_sheets': 'Import from Google Sheets',
    
    // Admin - Create Account
    'back_button': 'Back',
    'create_new_user': 'Add New User',
    'fullname_label': 'First and Last Name:',
    'password_label': 'Password:',
    'group_label': 'User Group (e.g., E1, B2):',
    'create_account_button': 'Create Account',
    
    // Admin - Edit User
    'edit_user_data': 'Edit User Data',
    'delete_user': 'Delete User',
    
    // Admin - Create Lesson
    'create_lesson_title': 'Add Lesson',
    'select_group': 'Select Group:',
    'date_label': 'Date:',
    'start_time_label': 'Start Time:',
    'end_time_label': 'End Time:',
    'create_lesson_button': 'Create Lesson',
    
    // Admin - Delete Group
    'delete_group_title': 'Delete Group',
    'group_to_delete': 'Group to Delete:',
    'delete_group_button': 'Delete Group',
    
    // Admin - Bulk Add
    'bulk_import_title': 'Bulk Import from Google Sheets',
    'sheet_id_label': 'Sheet ID:',
    'import_button': 'Import',
    
    // Common messages
    'success_message': 'Action successful!',
    'error_message': 'An error occurred!',
    'network_error_message': 'Network error or server unreachable.',
    'unknown_error': 'Unknown error occurred.',
    
    // Language selector
    'language_label': 'Language:',
    'estonian': 'Eesti',
    'english': 'English'
  }
};

// Global translation system
let currentLanguage = 'et'; // Default to Estonian

/**
 * Initialize language from URL parameter or default
 */
function initializeLanguage() {
  const urlParams = new URLSearchParams(window.location.search);
  const langParam = urlParams.get('lang');
  
  if (langParam && (langParam === 'en' || langParam === 'et')) {
    currentLanguage = langParam;
  } else {
    currentLanguage = 'et'; // Default to Estonian
  }
  
  // Update page language attribute
  document.documentElement.lang = currentLanguage;
}

/**
 * Get translated text for a key
 * @param {string} key - Translation key
 * @returns {string} Translated text or key if not found
 */
function t(key) {
  const lang = translations[currentLanguage];
  if (lang && lang[key]) {
    return lang[key];
  }
  
  // Fallback to Estonian if key not found in current language
  const fallback = translations['et'];
  if (fallback && fallback[key]) {
    return fallback[key];
  }
  
  // Return key itself if translation not found
  console.warn(`Translation missing for key: ${key} in language: ${currentLanguage}`);
  return key;
}

/**
 * Apply translations to elements with data-translate attribute
 */
function applyTranslations() {
  const elements = document.querySelectorAll('[data-translate]');
  elements.forEach(element => {
    const key = element.getAttribute('data-translate');
    const translated = t(key);
    
    // Check if element has data-translate-attr to translate an attribute instead of content
    const attr = element.getAttribute('data-translate-attr');
    if (attr) {
      element.setAttribute(attr, translated);
    } else {
      element.textContent = translated;
    }
  });
}

/**
 * Apply translations to elements with placeholders
 */
function applyPlaceholderTranslations() {
  const elements = document.querySelectorAll('[data-translate-placeholder]');
  elements.forEach(element => {
    const key = element.getAttribute('data-translate-placeholder');
    element.placeholder = t(key);
  });
}

/**
 * Change language and reload page
 * @param {string} lang - Language code ('en' or 'et')
 */
function changeLanguage(lang) {
  if (lang !== 'en' && lang !== 'et') return;
  
  const url = new URL(window.location);
  if (lang === 'et') {
    // Remove lang parameter for Estonian (default)
    url.searchParams.delete('lang');
  } else {
    url.searchParams.set('lang', lang);
  }
  
  window.location.href = url.toString();
}

/**
 * Create and insert language selector
 */
function createLanguageSelector() {
  const selector = document.createElement('div');
  selector.className = 'language-selector';
  selector.innerHTML = `
    <label for="languageSelect" data-translate="language_label">Keel:</label>
    <select id="languageSelect" onchange="changeLanguage(this.value)">
      <option value="et" ${currentLanguage === 'et' ? 'selected' : ''} data-translate="estonian">Eesti</option>
      <option value="en" ${currentLanguage === 'en' ? 'selected' : ''} data-translate="english">English</option>
    </select>
  `;
  
  return selector;
}

/**
 * Initialize language selector in header or body
 */
function initializeLanguageSelector() {
  // Try to find header first, otherwise add to top of body
  let container = document.querySelector('header');
  if (!container) {
    container = document.body;
  }
  
  const selector = createLanguageSelector();
  
  if (container === document.body) {
    // Insert at the beginning of body
    container.insertBefore(selector, container.firstChild);
  } else {
    // Add to header
    container.appendChild(selector);
  }
}

/**
 * Initialize the translation system when DOM is loaded
 */
function initializeTranslationSystem() {
  initializeLanguage();
  initializeLanguageSelector();
  applyTranslations();
  applyPlaceholderTranslations();
}

// Initialize when DOM content is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTranslationSystem);
} else {
  initializeTranslationSystem();
}