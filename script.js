/**
 * Enhanced Markslip Entry System - Frontend JavaScript
 * Separated from Google Apps Script for GitHub hosting
 */

// ==================== CONFIGURATION ====================
// IMPORTANT: Update this with your Google Apps Script deployment URL
// 1. Deploy your Google Apps Script as a web app
// 2. Set execution to "Anyone" and access to "Anyone with the link"
// 3. Copy the deployment URL and replace the URL below
// Example: 'https://script.google.com/macros/s/AKfycbx.../exec'

const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbwLs3sIovpf14q4TbzHFmIf86Eq9hbpXUPH1_3y34mki8bamEIa4glagK-VWUMHgZ7_/exec';

// For local testing, you can use this mock URL (will show configuration instructions)
const IS_DEVELOPMENT = BACKEND_URL.includes('https://script.google.com/macros/s/AKfycbwLs3sIovpf14q4TbzHFmIf86Eq9hbpXUPH1_3y34mki8bamEIa4glagK-VWUMHgZ7_/exec');

// ==================== CONFIGURATION INSTRUCTIONS ====================
if (IS_DEVELOPMENT) {
  console.warn(`
  ⚠️  CONFIGURATION REQUIRED ⚠️
  
  To connect your frontend to Google Apps Script backend:
  
  1. Open Google Apps Script (script.google.com)
  2. Create a new project and paste the code.gs content
  3. Save and deploy as web app:
     - Execute as: Me (your email)
     - Who has access: Anyone
  4. Copy the deployment URL
  5. Replace YOUR_SCRIPT_ID in script.js with your deployment URL
  
  Example URL format:
  https://script.google.com/macros/s/AKfycbx...very-long-id.../exec
  `);
}

// Global state
let appState = {
    currentData: null,
    autoSaveEnabled: false,
    autoSaveInterval: null,
    loadedFromSaved: false,
    currentSubject: null,
    subjectMapping: {},
    performanceMetrics: {}
};

// DOM elements
const elements = {
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText'),
    autoSaveIndicator: document.getElementById('autoSaveIndicator'),
    autoSaveText: document.getElementById('autoSaveText'),
    autoSaveSpinner: document.getElementById('autoSaveSpinner'),
    themeToggle: document.getElementById('themeToggle'),
    themeIcon: document.getElementById('themeIcon'),
    performanceIndicator: document.getElementById('performanceIndicator'),
    performanceText: document.getElementById('performanceText'),
    
    // Configuration panel
    configPanel: document.getElementById('configPanel'),
    classSelect: document.getElementById('classSelect'),
    sessionSelect: document.getElementById('sessionSelect'),
    examSelect: document.getElementById('examSelect'),
    classTeacherSelect: document.getElementById('classTeacherSelect'),
    smartCheckBtn: document.getElementById('smartCheckBtn'),
    smartCheckStatus: document.getElementById('smartCheckStatus'),
    smartCheckIcon: document.getElementById('smartCheckIcon'),
    smartCheckText: document.getElementById('smartCheckText'),
    smartCheckPerformance: document.getElementById('smartCheckPerformance'),
    
    // Auto-save toggle
    autoSaveToggle: document.getElementById('autoSaveToggle'),
    toggleSwitch: document.getElementById('toggleSwitch'),
    
    // Data panel
    dataPanel: document.getElementById('dataPanel'),
    dataSourceIndicator: document.getElementById('dataSourceIndicator'),
    dataPanelSubtitle: document.getElementById('dataPanelSubtitle'),
    subjectTabs: document.getElementById('subjectTabs'),
    subjectContent: document.getElementById('subjectContent'),
    
    // Action buttons
    saveMarkslipBtn: document.getElementById('saveMarkslipBtn'),
    generateMarkslipBtn: document.getElementById('generateMarkslipBtn'),
    viewMarkslipBtn: document.getElementById('viewMarkslipBtn'),
    
    // Results panel
    resultsPanel: document.getElementById('resultsPanel'),
    resultsContent: document.getElementById('resultsContent'),
    
    // Modal
    modalOverlay: document.getElementById('modalOverlay'),
    modalClose: document.getElementById('modalClose'),
    modalBody: document.getElementById('modalBody'),
    
    // Toast container
    toastContainer: document.getElementById('toastContainer')
};

/**
 * Initialize the application
 */
async function initializeApp() {
    showLoading('Initializing Smart Markslip System...');
    
    try {
        // Load default data
        await loadDefaultData();
        
        // Setup event listeners
        setupEventListeners();
        
        // Load theme preference
        loadTheme();
        
        // Initialize auto-save preference
        initializeAutoSave();
        
        updateLoadingText('Application ready!');
        
        setTimeout(() => {
            hideLoading();
            
            // Show configuration banner if backend is not configured
            if (IS_DEVELOPMENT) {
                document.getElementById('configBanner').style.display = 'block';
                showToast('Demo mode: Configure backend to enable full functionality', 'warning');
            } else {
                document.getElementById('configBanner').style.display = 'none';
                showToast('Smart Markslip System initialized successfully!', 'success');
            }
        }, 1000);
        
    } catch (error) {
        console.error('Initialization error:', error);
        updateLoadingText('Error initializing application');
        hideLoading();
        
        // Show configuration banner on error as well
        if (IS_DEVELOPMENT) {
            document.getElementById('configBanner').style.display = 'block';
        }
        
        showToast('Failed to initialize application: ' + error.message, 'error');
    }
}

/**
 * API request helper with configuration validation
 */
async function makeApiRequest(endpoint, data = null, method = 'GET') {
    // Check if backend URL is configured
    if (IS_DEVELOPMENT) {
        throw new Error('Backend URL not configured. Please update BACKEND_URL in script.js with your Google Apps Script deployment URL.');
    }
    
    try {
        const url = method === 'GET' && data 
            ? `${BACKEND_URL}?${new URLSearchParams(data)}`
            : BACKEND_URL;
            
        const options = {
            method: method,
            mode: 'cors',
            credentials: 'omit'
        };
        
        if (method === 'POST' && data) {
            options.body = JSON.stringify(data);
            options.headers = {
                'Content-Type': 'application/json'
            };
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            // Provide more specific error messages
            if (response.status === 404) {
                throw new Error('Backend not found. Please check your Google Apps Script deployment URL.');
            } else if (response.status === 403) {
                throw new Error('Access denied. Please ensure your Google Apps Script is deployed with "Anyone" access.');
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Unknown API error');
        }
        
        return result;
        
    } catch (error) {
        console.error('API request failed:', error);
        
        // Provide helpful error messages for common issues
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            throw new Error('Cannot connect to backend. Please check your Google Apps Script deployment URL and ensure CORS is enabled.');
        }
        
        throw error;
    }
}

/**
 * Load default data from backend with fallback support
 */
async function loadDefaultData() {
    updateLoadingText('Loading configuration data...');
    
    try {
        // If backend is not configured, use fallback defaults
        if (IS_DEVELOPMENT) {
            console.warn('Backend not configured, using local default data for demo');
            setFallbackDefaults();
            await loadFallbackClasses();
            return;
        }
        
        const result = await makeApiRequest(BACKEND_URL, { action: 'getDefaults' });
        
        if (result.success) {
            const data = result.data;
            
            // Populate dropdowns
            populateSelect(elements.sessionSelect, data.sessions);
            populateSelect(elements.examSelect, data.exams);
            populateSelect(elements.classTeacherSelect, data.teachers);
            
            // Store subject mapping
            appState.subjectMapping = data.subjectMapping;
            
            // Load available classes
            await loadAvailableClasses();
            console.log('✅ Default data loaded from backend');
        }
        
    } catch (error) {
        console.warn('Failed to load defaults from backend, using local defaults:', error);
        setFallbackDefaults();
        await loadFallbackClasses();
    }
}

/**
 * Set fallback default data when backend is unavailable
 */
function setFallbackDefaults() {
    const fallbackSessions = ['2024-25', '2025-26', '2026-27'];
    const fallbackExams = ['PT1', 'HALFYEARLY', 'PT2', 'SSE'];
    const fallbackTeachers = [
        'Ms. Sarah Johnson', 
        'Mr. David Wilson', 
        'Mrs. Emily Davis',
        'Mr. John Smith',
        'Ms. Lisa Brown',
        'Mr. Michael Jones'
    ];
    
    // Populate dropdowns with fallback data
    populateSelect(elements.sessionSelect, fallbackSessions);
    populateSelect(elements.examSelect, fallbackExams);
    populateSelect(elements.classTeacherSelect, fallbackTeachers);
    
    // Store fallback subject mapping
    appState.subjectMapping = {
        'Hindi': { row: 6, sheetName: 'HINDI' },
        'Maths': { row: 7, sheetName: 'MATHS' },
        'English': { row: 8, sheetName: 'ENGLISH' },
        'TWAU': { row: 9, sheetName: 'TWAU' }
    };
    
    console.log('✅ Fallback default data loaded');
}

/**
 * Load fallback classes when backend is unavailable
 */
async function loadFallbackClasses() {
    const fallbackClasses = [
        'Class1A', 'Class1B', 'Class2A', 'Class2B', 
        'Class3A', 'Class3B', 'Class4A', 'Class4B',
        'Class5A', 'Class5B'
    ];
    
    populateSelect(elements.classSelect, fallbackClasses);
    console.log('✅ Fallback classes loaded');
}

/**
 * Load available classes
 */
async function loadAvailableClasses() {
    try {
        const result = await makeApiRequest(BACKEND_URL, { action: 'getClasses' });
        
        if (result.success) {
            populateSelect(elements.classSelect, result.data);
        }
        
    } catch (error) {
        console.warn('Could not load classes:', error);
    }
}

/**
 * Populate select element with options
 */
function populateSelect(selectElement, options) {
    // Clear existing options except the first one
    const firstOption = selectElement.children[0];
    selectElement.innerHTML = '';
    selectElement.appendChild(firstOption);
    
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        selectElement.appendChild(optionElement);
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Auto-save toggle
    elements.autoSaveToggle.addEventListener('click', toggleAutoSave);
    
    // Smart check button
    elements.smartCheckBtn.addEventListener('click', performSmartCheck);
    
    // Action buttons
    elements.saveMarkslipBtn.addEventListener('click', saveMarkslip);
    elements.generateMarkslipBtn.addEventListener('click', generateMarkslip);
    elements.viewMarkslipBtn.addEventListener('click', viewMarkslip);
    
    // Modal close
    elements.modalClose.addEventListener('click', closeModal);
    elements.modalOverlay.addEventListener('click', (e) => {
        if (e.target === elements.modalOverlay) {
            closeModal();
        }
    });
    
    // Form validation
    [elements.classSelect, elements.sessionSelect, elements.examSelect, elements.classTeacherSelect]
        .forEach(select => {
            select.addEventListener('change', validateForm);
        });
}

/**
 * Perform smart ultra-fast check
 */
async function performSmartCheck() {
    const className = elements.classSelect.value;
    const session = elements.sessionSelect.value;
    const examName = elements.examSelect.value;
    const classTeacher = elements.classTeacherSelect.value;
    
    if (!className || !session || !examName || !classTeacher) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    // Show loading state
    elements.smartCheckBtn.disabled = true;
    elements.smartCheckBtn.querySelector('.btn-loading').classList.remove('hidden');
    elements.smartCheckStatus.classList.remove('hidden');
    elements.smartCheckStatus.className = 'smart-check-status checking';
    elements.smartCheckIcon.className = 'fas fa-clock';
    elements.smartCheckText.textContent = 'Performing smart ultra-fast check...';
    elements.smartCheckPerformance.textContent = '...';
    
    // Check if backend is configured
    if (IS_DEVELOPMENT) {
        showConfigurationModal();
        return;
    }
    
    try {
        const result = await makeApiRequest(BACKEND_URL, {
            action: 'smartCheck',
            className: className,
            session: session,
            examName: examName,
            classTeacher: classTeacher
        });
        
        if (result.success) {
            // Update performance indicator
            elements.smartCheckPerformance.textContent = `${result.performanceMs}ms`;
            
            if (result.exists && result.loadFromSaved) {
                // Existing markslip found
                elements.smartCheckStatus.className = 'smart-check-status load-saved';
                elements.smartCheckIcon.className = 'fas fa-check-circle';
                elements.smartCheckText.textContent = result.message;
                
                // Load existing markslip data
                await loadExistingMarkslipData(result.markslipInfo.id);
                
            } else {
                // New markslip will be created
                elements.smartCheckStatus.className = 'smart-check-status load-new';
                elements.smartCheckIcon.className = 'fas fa-plus-circle';
                elements.smartCheckText.textContent = result.message;
                
                // Load fresh student data
                await loadStudentData(className, session);
            }
            
            // Update performance metrics
            updatePerformanceIndicator(result.performanceMs);
            
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('Smart check error:', error);
        elements.smartCheckStatus.className = 'smart-check-status error';
        elements.smartCheckIcon.className = 'fas fa-exclamation-circle';
        elements.smartCheckText.textContent = 'Error: ' + error.message;
        showToast('Smart check failed: ' + error.message, 'error');
    } finally {
        elements.smartCheckBtn.disabled = false;
        elements.smartCheckBtn.querySelector('.btn-loading').classList.add('hidden');
    }
}

/**
 * Load existing markslip data
 */
async function loadExistingMarkslipData(markslipId) {
    updateLoadingText('Loading existing markslip data...');
    showLoading();
    
    try {
        const result = await makeApiRequest(BACKEND_URL, {
            action: 'loadMarkslip',
            markslipId: markslipId
        });
        
        if (result.success) {
            appState.currentData = result.data;
            appState.loadedFromSaved = true;
            
            // Update UI with loaded data
            updateDataSourceIndicator(true);
            setupDataPanel();
            
            hideLoading();
            showToast('Existing markslip loaded successfully!', 'success');
            
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('Error loading existing markslip:', error);
        hideLoading();
        showToast('Failed to load existing markslip: ' + error.message, 'error');
    }
}

/**
 * Load student data from main spreadsheet
 */
async function loadStudentData(className, session) {
    updateLoadingText('Loading student data...');
    showLoading();
    
    try {
        const result = await makeApiRequest(BACKEND_URL, {
            action: 'loadStudents',
            className: className,
            session: session
        });
        
        if (result.success) {
            appState.currentData = {
                className: className,
                session: elements.sessionSelect.value,
                examName: elements.examSelect.value,
                classTeacher: elements.classTeacherSelect.value,
                students: result.data.students,
                subjects: initializeSubjectData(),
                loadedFromSaved: false
            };
            
            appState.loadedFromSaved = false;
            
            // Update UI
            updateDataSourceIndicator(false);
            setupDataPanel();
            
            hideLoading();
            showToast(`Loaded ${result.data.students.length} students successfully!`, 'success');
            
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('Error loading student data:', error);
        hideLoading();
        showToast('Failed to load student data: ' + error.message, 'error');
    }
}

/**
 * Initialize subject data structure
 */
function initializeSubjectData() {
    const subjects = {};
    
    Object.keys(appState.subjectMapping).forEach(subject => {
        subjects[subject] = {
            maxMarks: '',
            subjectTeacher: '',
            date: '',
            marks: []
        };
    });
    
    return subjects;
}

/**
 * Update data source indicator
 */
function updateDataSourceIndicator(isFromSaved) {
    if (isFromSaved) {
        elements.dataSourceIndicator.className = 'data-source-indicator saved-data';
        elements.dataSourceIndicator.innerHTML = '<i class="fas fa-save"></i><span>Saved Data</span>';
    } else {
        elements.dataSourceIndicator.className = 'data-source-indicator main-spreadsheet';
        elements.dataSourceIndicator.innerHTML = '<i class="fas fa-database"></i><span>Main Spreadsheet</span>';
    }
}

/**
 * Setup data panel with loaded data
 */
function setupDataPanel() {
    if (!appState.currentData) return;
    
    // Show data panel
    elements.dataPanel.classList.remove('hidden');
    
    // Update panel subtitle
    elements.dataPanelSubtitle.textContent = 
        `${appState.currentData.className} - ${appState.currentData.examName} (${appState.currentData.session}) - ${appState.currentData.students.length} students`;
    
    // Setup subject tabs
    setupSubjectTabs();
    
    // Setup subject content
    setupSubjectContent();
    
    // Show first subject by default
    const firstSubject = Object.keys(appState.subjectMapping)[0];
    if (firstSubject) {
        showSubject(firstSubject);
    }
    
    // Show view markslip button if editing existing
    if (appState.loadedFromSaved && appState.currentData.markslipInfo) {
        elements.viewMarkslipBtn.style.display = 'inline-flex';
    }
}

/**
 * Setup subject tabs
 */
function setupSubjectTabs() {
    elements.subjectTabs.innerHTML = '';
    
    Object.keys(appState.subjectMapping).forEach(subject => {
        const tab = document.createElement('button');
        tab.className = 'subject-tab';
        tab.textContent = subject;
        tab.addEventListener('click', () => showSubject(subject));
        elements.subjectTabs.appendChild(tab);
    });
}

/**
 * Setup subject content forms
 */
function setupSubjectContent() {
    elements.subjectContent.innerHTML = '';
    
    Object.keys(appState.subjectMapping).forEach(subject => {
        const subjectForm = createSubjectForm(subject);
        elements.subjectContent.appendChild(subjectForm);
    });
}

/**
 * Create subject form
 */
function createSubjectForm(subject) {
    const form = document.createElement('div');
    form.className = 'subject-form';
    form.id = `subject-${subject}`;
    
    const subjectData = appState.currentData.subjects[subject] || {
        maxMarks: '',
        subjectTeacher: '',
        date: '',
        marks: []
    };
    
    form.innerHTML = `
        <div class="subject-header">
            <div class="form-group">
                <label for="${subject}-maxMarks">Maximum Marks</label>
                <input type="number" id="${subject}-maxMarks" class="form-control" 
                       value="${subjectData.maxMarks}" min="1" max="100">
            </div>
            <div class="form-group">
                <label for="${subject}-teacher">Subject Teacher</label>
                <select id="${subject}-teacher" class="form-control">
                    <option value="">Select Teacher</option>
                </select>
            </div>
            <div class="form-group">
                <label for="${subject}-date">Exam Date</label>
                <input type="date" id="${subject}-date" class="form-control" 
                       value="${subjectData.date}">
            </div>
        </div>
        <div class="students-grid" id="${subject}-students">
            <!-- Student cards will be populated here -->
        </div>
    `;
    
    // Populate teacher dropdown
    const teacherSelect = form.querySelector(`#${subject}-teacher`);
    populateSelect(teacherSelect, appState.currentData.classTeacher ? [appState.currentData.classTeacher] : []);
    teacherSelect.value = subjectData.subjectTeacher;
    
    // Create student cards
    const studentsGrid = form.querySelector(`#${subject}-students`);
    appState.currentData.students.forEach(student => {
        const studentCard = createStudentCard(student, subject, subjectData);
        studentsGrid.appendChild(studentCard);
    });
    
    return form;
}

/**
 * Create student card for marks entry
 */
function createStudentCard(student, subject, subjectData) {
    const card = document.createElement('div');
    card.className = 'student-card';
    
    // Find existing marks for this student
    const existingMarks = subjectData.marks.find(m => 
        m.rollNo === student.rollNo || m.admissionNo === student.admissionNo
    );
    
    const marks = existingMarks ? existingMarks.marks : '';
    const isAbsent = existingMarks ? existingMarks.isAbsent : false;
    
    card.innerHTML = `
        <div class="student-info">
            <div class="student-name">${student.displayName}</div>
            <div class="student-roll">Roll: ${student.rollNo}</div>
        </div>
        <div class="marks-input">
            <input type="number" 
                   class="marks-field" 
                   placeholder="Enter marks"
                   value="${marks}"
                   ${isAbsent ? 'disabled' : ''}
                   data-roll="${student.rollNo}"
                   data-admission="${student.admissionNo}"
                   data-subject="${subject}"
                   min="0"
                   step="0.5">
            <label class="absent-checkbox">
                <input type="checkbox" 
                       class="absent-field"
                       ${isAbsent ? 'checked' : ''}
                       data-roll="${student.rollNo}"
                       data-admission="${student.admissionNo}"
                       data-subject="${subject}">
                AB
            </label>
        </div>
    `;
    
    // Add event listeners
    const marksInput = card.querySelector('.marks-field');
    const absentCheckbox = card.querySelector('.absent-field');
    
    marksInput.addEventListener('input', () => {
        if (appState.autoSaveEnabled) {
            debounceAutoSave();
        }
    });
    
    absentCheckbox.addEventListener('change', () => {
        marksInput.disabled = absentCheckbox.checked;
        if (absentCheckbox.checked) {
            marksInput.value = '';
        }
        if (appState.autoSaveEnabled) {
            debounceAutoSave();
        }
    });
    
    return card;
}

/**
 * Show specific subject tab and form
 */
function showSubject(subject) {
    // Update active tab
    document.querySelectorAll('.subject-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.subject-tab').forEach(tab => {
        if (tab.textContent === subject) {
            tab.classList.add('active');
        }
    });
    
    // Show corresponding form
    document.querySelectorAll('.subject-form').forEach(form => {
        form.classList.remove('active');
    });
    
    const targetForm = document.getElementById(`subject-${subject}`);
    if (targetForm) {
        targetForm.classList.add('active');
    }
    
    appState.currentSubject = subject;
}

/**
 * Save markslip data
 */
async function saveMarkslip() {
    if (!appState.currentData) {
        showToast('No data to save', 'error');
        return;
    }
    
    showLoading('Saving markslip data...');
    
    try {
        // Collect all form data
        const markslipData = collectFormData();
        
        const result = await makeApiRequest(BACKEND_URL, {
            action: 'saveMarkslip',
            markslipData: markslipData
        }, 'POST');
        
        if (result.success) {
            hideLoading();
            showToast('Markslip saved successfully!', 'success');
            updatePerformanceIndicator(result.performanceMs);
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('Save error:', error);
        hideLoading();
        showToast('Failed to save markslip: ' + error.message, 'error');
    }
}

/**
 * Generate markslip file
 */
async function generateMarkslip() {
    if (!appState.currentData) {
        showToast('No data to generate markslip', 'error');
        return;
    }
    
    showLoading('Generating markslip file...');
    
    try {
        const markslipData = collectFormData();
        
        const result = await makeApiRequest(BACKEND_URL, {
            action: 'generateMarkslip',
            markslipData: markslipData
        }, 'POST');
        
        if (result.success) {
            hideLoading();
            showToast('Markslip file generated successfully!', 'success');
            updatePerformanceIndicator(result.performanceMs);
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('Generate error:', error);
        hideLoading();
        showToast('Failed to generate markslip: ' + error.message, 'error');
    }
}

/**
 * View existing markslip
 */
function viewMarkslip() {
    if (!appState.currentData?.markslipInfo) {
        showToast('No markslip to view', 'error');
        return;
    }
    
    const markslipInfo = appState.currentData.markslipInfo;
    
    elements.modalBody.innerHTML = `
        <div class="markslip-info">
            <h4>Markslip Information</h4>
            <p><strong>Name:</strong> ${markslipInfo.name}</p>
            <p><strong>Last Modified:</strong> ${new Date(markslipInfo.lastModified).toLocaleString()}</p>
            <div class="markslip-actions">
                <a href="${markslipInfo.url}" target="_blank" class="btn btn-primary">
                    <i class="fas fa-external-link-alt"></i> Open in Google Sheets
                </a>
                <a href="${markslipInfo.downloadUrl}" target="_blank" class="btn btn-success">
                    <i class="fas fa-download"></i> Download Excel
                </a>
            </div>
        </div>
    `;
    
    elements.modalOverlay.classList.remove('hidden');
}

/**
 * Collect form data from all subjects
 */
function collectFormData() {
    const data = {
        ...appState.currentData,
        subjects: {}
    };
    
    Object.keys(appState.subjectMapping).forEach(subject => {
        const maxMarks = document.getElementById(`${subject}-maxMarks`)?.value || '';
        const teacher = document.getElementById(`${subject}-teacher`)?.value || '';
        const date = document.getElementById(`${subject}-date`)?.value || '';
        
        const marks = [];
        const studentsGrid = document.getElementById(`${subject}-students`);
        
        if (studentsGrid) {
            const studentCards = studentsGrid.querySelectorAll('.student-card');
            studentCards.forEach(card => {
                const marksInput = card.querySelector('.marks-field');
                const absentCheckbox = card.querySelector('.absent-field');
                
                if (marksInput) {
                    const roll = marksInput.dataset.roll;
                    const admission = marksInput.dataset.admission;
                    const markValue = marksInput.value;
                    const isAbsent = absentCheckbox?.checked || false;
                    
                    if (markValue || isAbsent) {
                        marks.push({
                            rollNo: roll,
                            admissionNo: admission,
                            marks: isAbsent ? 'AB' : markValue,
                            isAbsent: isAbsent
                        });
                    }
                }
            });
        }
        
        data.subjects[subject] = {
            maxMarks: maxMarks,
            subjectTeacher: teacher,
            date: date,
            marks: marks
        };
    });
    
    return data;
}

/**
 * Auto-save functionality
 */
let autoSaveTimeout;

function debounceAutoSave() {
    if (!appState.autoSaveEnabled) return;
    
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(performAutoSave, 2000); // 2 second delay
}

async function performAutoSave() {
    if (!appState.currentData || !appState.autoSaveEnabled) return;
    
    showAutoSaveIndicator('saving');
    
    try {
        const markslipData = collectFormData();
        
        const result = await makeApiRequest(BACKEND_URL, {
            action: 'autoSave',
            markslipData: markslipData
        }, 'POST');
        
        if (result.success) {
            showAutoSaveIndicator('saved');
        } else {
            showAutoSaveIndicator('error');
        }
        
    } catch (error) {
        console.error('Auto-save error:', error);
        showAutoSaveIndicator('error');
    }
}

/**
 * Toggle auto-save
 */
function toggleAutoSave() {
    appState.autoSaveEnabled = !appState.autoSaveEnabled;
    
    if (appState.autoSaveEnabled) {
        elements.toggleSwitch.classList.add('active');
        localStorage.setItem('autoSaveEnabled', 'true');
        showToast('Auto-save enabled', 'success');
    } else {
        elements.toggleSwitch.classList.remove('active');
        localStorage.setItem('autoSaveEnabled', 'false');
        clearTimeout(autoSaveTimeout);
        hideAutoSaveIndicator();
        showToast('Auto-save disabled', 'warning');
    }
}

/**
 * Initialize auto-save preference
 */
function initializeAutoSave() {
    const savedPreference = localStorage.getItem('autoSaveEnabled');
    appState.autoSaveEnabled = savedPreference === 'true';
    
    if (appState.autoSaveEnabled) {
        elements.toggleSwitch.classList.add('active');
    }
}

/**
 * Show auto-save indicator
 */
function showAutoSaveIndicator(state) {
    elements.autoSaveIndicator.classList.remove('saving', 'saved', 'error');
    elements.autoSaveIndicator.classList.add('show', state);
    
    switch (state) {
        case 'saving':
            elements.autoSaveText.textContent = 'Auto-saving...';
            elements.autoSaveSpinner.style.display = 'block';
            break;
        case 'saved':
            elements.autoSaveText.textContent = 'Auto-saved';
            elements.autoSaveSpinner.style.display = 'none';
            setTimeout(hideAutoSaveIndicator, 2000);
            break;
        case 'error':
            elements.autoSaveText.textContent = 'Auto-save failed';
            elements.autoSaveSpinner.style.display = 'none';
            setTimeout(hideAutoSaveIndicator, 3000);
            break;
    }
}

/**
 * Hide auto-save indicator
 */
function hideAutoSaveIndicator() {
    elements.autoSaveIndicator.classList.remove('show');
}

/**
 * Theme management
 */
function toggleTheme() {
    const currentTheme = document.body.dataset.theme;
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.body.dataset.theme = newTheme;
    localStorage.setItem('theme', newTheme);
    
    // Update theme icon
    elements.themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    
    showToast(`Switched to ${newTheme} theme`, 'success');
}

/**
 * Load theme preference
 */
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.dataset.theme = savedTheme;
    elements.themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

/**
 * Form validation
 */
function validateForm() {
    const className = elements.classSelect.value;
    const session = elements.sessionSelect.value;
    const examName = elements.examSelect.value;
    const classTeacher = elements.classTeacherSelect.value;
    
    const isValid = className && session && examName && classTeacher;
    elements.smartCheckBtn.disabled = !isValid;
}

/**
 * Performance indicator
 */
function updatePerformanceIndicator(ms) {
    if (ms !== undefined) {
        elements.performanceText.textContent = `${ms}ms`;
        appState.performanceMetrics.lastOperation = ms;
    }
}

/**
 * Loading overlay functions
 */
function showLoading(text = 'Loading...') {
    elements.loadingText.textContent = text;
    elements.loadingOverlay.classList.remove('hidden');
}

function updateLoadingText(text) {
    elements.loadingText.textContent = text;
}

function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
}

/**
 * Toast notifications
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                type === 'error' ? 'exclamation-circle' : 
                type === 'warning' ? 'exclamation-triangle' : 'info-circle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

/**
 * Show configuration modal when backend is not set up
 */
function showConfigurationModal() {
    elements.modalBody.innerHTML = `
        <div class="configuration-notice">
            <h3><i class="fas fa-cog"></i> Backend Configuration Required</h3>
            <p>To use this markslip system, you need to connect it to your Google Apps Script backend:</p>
            
            <ol>
                <li><strong>Copy the backend code:</strong> Copy the content from <code>code.gs</code></li>
                <li><strong>Create Google Apps Script:</strong> Go to <a href="https://script.google.com" target="_blank">script.google.com</a></li>
                <li><strong>Paste and save:</strong> Create a new project and paste the code</li>
                <li><strong>Deploy as web app:</strong>
                    <ul>
                        <li>Click "Deploy" → "New Deployment"</li>
                        <li>Type: Web app</li>
                        <li>Execute as: Me</li>
                        <li>Who has access: Anyone</li>
                    </ul>
                </li>
                <li><strong>Update frontend:</strong> Copy the deployment URL and replace <code>YOUR_SCRIPT_ID</code> in <code>script.js</code></li>
            </ol>
            
            <div class="config-buttons">
                <button class="btn btn-primary" onclick="window.open('https://script.google.com', '_blank')">
                    <i class="fas fa-external-link-alt"></i> Open Google Apps Script
                </button>
            </div>
            
            <div class="config-note">
                <i class="fas fa-info-circle"></i>
                <strong>Note:</strong> The interface will work in demo mode until you configure the backend.
            </div>
        </div>
    `;
    
    elements.modalOverlay.classList.remove('hidden');
}

/**
 * Modal functions
 */
function closeModal() {
    elements.modalOverlay.classList.add('hidden');
}

/**
 * Initialize application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', initializeApp);

// Handle visibility changes for auto-save
document.addEventListener('visibilitychange', () => {
    if (document.hidden && appState.autoSaveEnabled) {
        performAutoSave();
    }
});

// Handle beforeunload for unsaved changes
window.addEventListener('beforeunload', (e) => {
    if (appState.autoSaveEnabled && appState.currentData) {
        e.preventDefault();
        e.returnValue = '';
        performAutoSave();
    }
});
