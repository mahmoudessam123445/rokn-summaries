// ===== Configuration =====
const FIREBASE_URL = 'https://rokn-summaries-default-rtdb.firebaseio.com/';
const CLOUDINARY_CLOUD = 'duwg52apm';
const CLOUDINARY_PRESET = 'rokn_summaries';
const ADMIN_PASSWORD = 'rokn2026';

// ===== State =====
let allSummaries = [];
let currentFilter = 'all';
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let selectedFile = null;
let editSelectedFile = null;

// ===== Departments =====
const DEPTS = {
    'preparatory': { 
        name: 'علوم أساسية', 
        icon: 'fa-flask', 
        color: '#ef4444',
        bg: 'from-red-500 to-red-600',
        bgLight: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-600',
        badgeBg: 'bg-red-500'
    },
    'communications': { 
        name: 'اتصالات', 
        icon: 'fa-wifi', 
        color: '#3b82f6',
        bg: 'from-blue-500 to-blue-600',
        bgLight: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-600',
        badgeBg: 'bg-blue-500'
    },
    'civil': { 
        name: 'مدني', 
        icon: 'fa-building', 
        color: '#f59e0b',
        bg: 'from-amber-500 to-amber-600',
        bgLight: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-600',
        badgeBg: 'bg-amber-500'
    },
    'chemistry': { 
        name: 'كيمياء', 
        icon: 'fa-atom', 
        color: '#8b5cf6',
        bg: 'from-purple-500 to-purple-600',
        bgLight: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-600',
        badgeBg: 'bg-purple-500'
    },
    'general': { 
        name: 'عام', 
        icon: 'fa-globe', 
        color: '#10b981',
        bg: 'from-emerald-500 to-emerald-600',
        bgLight: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-600',
        badgeBg: 'bg-emerald-500'
    }
};

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('Rokn Hub loaded!');

    setupNavHandlers();
    loadSummaries();
    updateFavCount();
    animateStats();

    // Show admin badge if logged in
    if (isAdmin()) {
        const badge = document.getElementById('adminBadge');
        const logoutBtn = document.getElementById('logoutBtn');
        const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
        if (badge) {
            badge.classList.remove('hidden');
            badge.classList.add('inline-flex');
        }
        if (logoutBtn) {
            logoutBtn.classList.remove('hidden');
            logoutBtn.classList.add('inline-flex');
        }
        if (mobileLogoutBtn) {
            mobileLogoutBtn.classList.remove('hidden');
            mobileLogoutBtn.classList.add('flex');
        }
    }

    // Header scroll effect
    window.addEventListener('scroll', () => {
        const header = document.getElementById('mainHeader');
        if (window.scrollY > 50) {
            header.classList.add('header-scrolled');
        } else {
            header.classList.remove('header-scrolled');
        }
    });
});

// ===== Admin Check =====
function isAdmin() {
    return !!localStorage.getItem('firebaseDatabaseURL');
}

function logoutAdmin() {
    localStorage.removeItem('firebaseDatabaseURL');
    showToast('تم تسجيل الخروج');
    setTimeout(() => location.reload(), 1000);
}

// ===== Navigation =====
function setupNavHandlers() {
    // Desktop nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            showSection(section);
        });
    });

    // Mobile nav links
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            showSection(section);
            toggleMobileMenu();
        });
    });

    // Hero button
    const heroBtn = document.getElementById('heroBtn');
    if (heroBtn) {
        heroBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('summaries');
        });
    }
}

function showSection(section) {
    console.log('Navigating to:', section);

    const hero = document.getElementById('heroSection');
    const summaries = document.getElementById('summariesSection');
    const favorites = document.getElementById('favoritesSection');

    if (!hero || !summaries || !favorites) {
        console.error('Sections not found!');
        return;
    }

    // Hide ALL sections using CSS classes
    hero.classList.remove('section-active');
    hero.classList.add('section-hidden');
    summaries.classList.remove('section-active');
    summaries.classList.add('section-hidden');
    favorites.classList.remove('section-active');
    favorites.classList.add('section-hidden');

    // Show requested section
    if (section === 'home') {
        hero.classList.remove('section-hidden');
        hero.classList.add('section-active');
    } else if (section === 'summaries') {
        summaries.classList.remove('section-hidden');
        summaries.classList.add('section-active');
        if (allSummaries.length === 0) {
            loadSummaries();
        }
    } else if (section === 'favorites') {
        favorites.classList.remove('section-hidden');
        favorites.classList.add('section-active');
        renderFavorites();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    if (menu) {
        menu.classList.toggle('open');
    }
}

// ===== Fetch Summaries =====
async function loadSummaries() {
    try {
        const response = await fetch(FIREBASE_URL + 'summaries.json');
        const data = await response.json();

        if (data) {
            allSummaries = Object.entries(data).map(([id, summary]) => ({
                id,
                ...summary
            })).sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
        }

        const loadingState = document.getElementById('loadingState');
        const summariesGrid = document.getElementById('summariesGrid');

        if (loadingState) loadingState.classList.add('hidden');
        if (summariesGrid) summariesGrid.classList.remove('hidden');

        renderSummaries();
        updateStats();

    } catch (error) {
        console.error('Error loading summaries:', error);
        showToast('خطأ في تحميل البيانات');
    }
}

// ===== Render Summaries =====
function renderSummaries() {
    const grid = document.getElementById('summariesGrid');
    if (!grid) return;

    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    let filtered = allSummaries;

    if (currentFilter !== 'all') {
        filtered = filtered.filter(s => s.department === currentFilter);
    }

    if (searchTerm) {
        filtered = filtered.filter(s => 
            (s.title || '').toLowerCase().includes(searchTerm) ||
            (s.subject || '').toLowerCase().includes(searchTerm) ||
            (s.description || '').toLowerCase().includes(searchTerm)
        );
    }

    if (filtered.length === 0) {
        grid.classList.add('hidden');
        const emptyState = document.getElementById('emptyState');
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    grid.classList.remove('hidden');
    const emptyState = document.getElementById('emptyState');
    if (emptyState) emptyState.classList.add('hidden');

    grid.innerHTML = filtered.map(summary => {
        const dept = DEPTS[summary.department] || DEPTS.general;
        const isFav = favorites.includes(summary.id);

        let adminActions = '';
        if (isAdmin()) {
            adminActions = `
                <button onclick="openEditModal('${summary.id}')" class="card-action card-action-view flex-1 justify-center">
                    <i class="fas fa-edit"></i>تعديل
                </button>
                <button onclick="deleteSummary('${summary.id}')" class="card-action flex-1 justify-center bg-red-50 text-red-600 hover:bg-red-100">
                    <i class="fas fa-trash"></i>حذف
                </button>
            `;
        }

        return `
            <div class="glass-card p-6 group">
                <div class="flex justify-between items-start mb-5">
                    <div class="dept-badge ${dept.badgeBg}">
                        <i class="fas ${dept.icon}"></i>
                    </div>
                    <button onclick="toggleFavorite('${summary.id}')" class="heart-btn ${isFav ? 'active' : ''}">
                        <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                </div>

                <h3 class="text-lg font-bold text-neutral-900 mb-2 line-clamp-2 leading-relaxed">${escapeHtml(summary.title || 'بدون عنوان')}</h3>
                <p class="text-neutral-500 text-sm mb-5 line-clamp-2 leading-relaxed">${escapeHtml(summary.description || 'لا يوجد وصف')}</p>

                <div class="flex items-center gap-2 mb-5 flex-wrap">
                    <span class="px-3 py-1.5 rounded-full text-xs font-bold ${dept.bgLight} ${dept.text} border ${dept.border}">
                        ${dept.name}
                    </span>
                    <span class="text-neutral-400 text-xs flex items-center gap-1">
                        <i class="fas fa-book text-[10px]"></i>${escapeHtml(summary.subject || 'عام')}
                    </span>
                </div>

                <div class="flex gap-2 flex-wrap">
                    <button onclick="openPreview('${summary.id}')" class="card-action card-action-view flex-1 justify-center">
                        <i class="fas fa-eye"></i>عرض
                    </button>
                    <a href="${summary.fileUrl}" download class="card-action card-action-download flex-1 justify-center text-center">
                        <i class="fas fa-download"></i>تحميل
                    </a>
                    ${adminActions}
                </div>
            </div>
        `;
    }).join('');

    // Animate cards
    const cards = grid.querySelectorAll('.glass-card');
    cards.forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, i * 80);
    });
}

// ===== Escape HTML =====
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Filter & Search =====
function filterByDept(dept) {
    currentFilter = dept;

    document.querySelectorAll('.filter-pill').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.dept === dept) {
            btn.classList.add('active');
        }
    });

    renderSummaries();
}

function handleSearch() {
    renderSummaries();
}

// ===== Favorites =====
function toggleFavorite(id) {
    const index = favorites.indexOf(id);
    if (index > -1) {
        favorites.splice(index, 1);
        showToast('تم الإزالة من المفضلة');
    } else {
        favorites.push(id);
        showToast('تم الإضافة للمفضلة');
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateFavCount();
    renderSummaries();
}

function updateFavCount() {
    const count = favorites.length;
    const badge = document.getElementById('favCount');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

function renderFavorites() {
    const grid = document.getElementById('favoritesGrid');
    if (!grid) return;

    const favSummaries = allSummaries.filter(s => favorites.includes(s.id));

    if (favSummaries.length === 0) {
        grid.classList.add('hidden');
        const noFavorites = document.getElementById('noFavorites');
        if (noFavorites) noFavorites.classList.remove('hidden');
        return;
    }

    grid.classList.remove('hidden');
    const noFavorites = document.getElementById('noFavorites');
    if (noFavorites) noFavorites.classList.add('hidden');

    grid.innerHTML = favSummaries.map(summary => {
        const dept = DEPTS[summary.department] || DEPTS.general;
        return `
            <div class="glass-card p-6">
                <div class="flex justify-between items-start mb-5">
                    <div class="dept-badge ${dept.badgeBg}">
                        <i class="fas ${dept.icon}"></i>
                    </div>
                    <button onclick="toggleFavorite('${summary.id}')" class="heart-btn active">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <h3 class="text-lg font-bold text-neutral-900 mb-2 line-clamp-2">${escapeHtml(summary.title || 'بدون عنوان')}</h3>
                <p class="text-neutral-500 text-sm mb-5 line-clamp-2">${escapeHtml(summary.description || 'لا يوجد وصف')}</p>
                <div class="flex gap-2">
                    <button onclick="openPreview('${summary.id}')" class="card-action card-action-view flex-1 justify-center">
                        <i class="fas fa-eye"></i>عرض
                    </button>
                    <a href="${summary.fileUrl}" download class="card-action card-action-download flex-1 justify-center text-center">
                        <i class="fas fa-download"></i>تحميل
                    </a>
                </div>
            </div>
        `;
    }).join('');
}

// ===== Preview Modal =====
function openPreview(id) {
    const summary = allSummaries.find(s => s.id === id);
    if (!summary) return;

    const dept = DEPTS[summary.department] || DEPTS.general;

    const previewTitle = document.getElementById('previewTitle');
    const previewDept = document.getElementById('previewDept');
    const previewSubject = document.getElementById('previewSubject');
    const previewDesc = document.getElementById('previewDesc');
    const previewDownload = document.getElementById('previewDownload');

    if (previewTitle) previewTitle.textContent = summary.title || 'بدون عنوان';
    if (previewDept) {
        previewDept.textContent = dept.name;
        previewDept.className = `px-4 py-1.5 rounded-full text-xs font-bold text-white ${dept.badgeBg}`;
    }
    if (previewSubject) previewSubject.innerHTML = `<i class="fas fa-book text-xs ml-1"></i>${escapeHtml(summary.subject || 'عام')}`;
    if (previewDesc) previewDesc.textContent = summary.description || 'لا يوجد وصف';
    if (previewDownload) previewDownload.href = summary.fileUrl;

    const modal = document.getElementById('previewModal');
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

function closePreviewModal() {
    const modal = document.getElementById('previewModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

// ===== Admin Modal =====
function openAdminModal() {
    const modal = document.getElementById('adminModal');
    const passwordStep = document.getElementById('passwordStep');
    const addForm = document.getElementById('addForm');
    const passwordInput = document.getElementById('adminPassword');
    const passwordError = document.getElementById('passwordError');

    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('show'), 10);
    }
    if (passwordStep) passwordStep.classList.remove('hidden');
    if (addForm) addForm.classList.add('hidden');
    if (passwordInput) passwordInput.value = '';
    if (passwordError) passwordError.classList.add('hidden');
}

function closeAdminModal() {
    const modal = document.getElementById('adminModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

function checkPassword() {
    const input = document.getElementById('adminPassword');
    const passwordStep = document.getElementById('passwordStep');
    const addForm = document.getElementById('addForm');
    const passwordError = document.getElementById('passwordError');

    if (!input) return;

    if (input.value === ADMIN_PASSWORD) {
        // Store admin session
        localStorage.setItem('firebaseDatabaseURL', FIREBASE_URL);

        if (passwordStep) passwordStep.classList.add('hidden');
        if (addForm) addForm.classList.remove('hidden');

        // Show admin badge immediately
        const badge = document.getElementById('adminBadge');
        const logoutBtn = document.getElementById('logoutBtn');
        const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
        if (badge) {
            badge.classList.remove('hidden');
            badge.classList.add('inline-flex');
        }
        if (logoutBtn) {
            logoutBtn.classList.remove('hidden');
            logoutBtn.classList.add('inline-flex');
        }
        if (mobileLogoutBtn) {
            mobileLogoutBtn.classList.remove('hidden');
            mobileLogoutBtn.classList.add('flex');
        }

        showToast('تم تسجيل الدخول كمسؤول');
    } else {
        if (passwordError) {
            passwordError.textContent = 'كلمة المرور غير صحيحة';
            passwordError.classList.remove('hidden');
        }

        // Shake animation
        const modalContent = document.querySelector('#adminModal .modal-content');
        if (modalContent) {
            modalContent.style.animation = 'none';
            modalContent.offsetHeight; // trigger reflow
            modalContent.style.animation = 'shake 0.5s ease';
        }
    }
}

// Add shake animation
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-8px); }
        40% { transform: translateX(8px); }
        60% { transform: translateX(-4px); }
        80% { transform: translateX(4px); }
    }
`;
document.head.appendChild(shakeStyle);

function handleAddFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    selectedFile = file;

    const placeholder = document.getElementById('addFilePlaceholder');
    const info = document.getElementById('addFileInfo');
    const fileName = document.getElementById('addFileName');

    if (placeholder) placeholder.classList.add('hidden');
    if (info) info.classList.remove('hidden');
    if (fileName) fileName.textContent = file.name;
}

async function handleAddSubmit(event) {
    event.preventDefault();
    if (!selectedFile) {
        showToast('اختر ملف أولاً');
        return false;
    }

    const btn = document.getElementById('addSubmitBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');
    const progressBar = document.getElementById('addProgressBar');
    const progressFill = document.getElementById('addProgress');

    if (btnText) btnText.classList.add('hidden');
    if (btnLoading) btnLoading.classList.remove('hidden');
    btn.disabled = true;
    if (progressBar) progressBar.classList.remove('hidden');

    try {
        if (progressFill) progressFill.style.width = '30%';

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('upload_preset', CLOUDINARY_PRESET);
        formData.append('folder', 'rokn_summaries');

        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');

        const result = await response.json();
        if (progressFill) progressFill.style.width = '70%';

        const titleInput = document.getElementById('addTitle');
        const subjectInput = document.getElementById('addSubject');
        const deptInput = document.getElementById('addDepartment');
        const descInput = document.getElementById('addDescription');

        const summary = {
            title: titleInput ? titleInput.value.trim() : '',
            subject: subjectInput ? subjectInput.value.trim() : '',
            department: deptInput ? deptInput.value : 'general',
            description: descInput ? descInput.value.trim() : '',
            fileName: selectedFile.name,
            fileUrl: result.secure_url,
            fileType: selectedFile.type,
            fileSize: selectedFile.size,
            cloudinaryPublicId: result.public_id,
            date: new Date().toLocaleDateString('ar-EG'),
            uploadedAt: new Date().toISOString()
        };

        const dbResponse = await fetch(FIREBASE_URL + 'summaries.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(summary)
        });

        if (!dbResponse.ok) throw new Error('Database error');

        if (progressFill) progressFill.style.width = '100%';
        showToast('تم إضافة الملخص بنجاح!');

        setTimeout(() => {
            closeAdminModal();
            resetAddForm();
            loadSummaries();
        }, 1000);

    } catch (error) {
        console.error('Error:', error);
        showToast('خطأ: ' + error.message);
    } finally {
        if (btnText) btnText.classList.remove('hidden');
        if (btnLoading) btnLoading.classList.add('hidden');
        btn.disabled = false;
        setTimeout(() => {
            if (progressBar) progressBar.classList.add('hidden');
            if (progressFill) progressFill.style.width = '0%';
        }, 1000);
    }

    return false;
}

function resetAddForm() {
    const form = document.getElementById('addForm');
    const placeholder = document.getElementById('addFilePlaceholder');
    const info = document.getElementById('addFileInfo');

    if (form) form.reset();
    selectedFile = null;
    if (placeholder) placeholder.classList.remove('hidden');
    if (info) info.classList.add('hidden');
}

// ===== Delete Summary =====
async function deleteSummary(summaryId) {
    if (!confirm('هل أنت متأكد من حذف هذا الملخص؟')) return;

    const dbUrl = localStorage.getItem('firebaseDatabaseURL') || FIREBASE_URL;

    try {
        await fetch(dbUrl + 'summaries/' + summaryId + '.json', { method: 'DELETE' });
        showToast('تم الحذف بنجاح!');
        await loadSummaries();
    } catch (error) {
        console.error('Delete error:', error);
        showToast('خطأ أثناء الحذف');
    }
}

// ===== Open Edit Modal =====
function openEditModal(summaryId) {
    const summary = allSummaries.find(s => s.id === summaryId);
    if (!summary) return;

    const dbUrl = localStorage.getItem('firebaseDatabaseURL') || FIREBASE_URL;

    fetch(dbUrl + 'summaries/' + summaryId + '.json')
        .then(r => r.json())
        .then(data => {
            if (!data) return;

            document.getElementById('editId').value = summaryId;
            document.getElementById('editTitle').value = data.title || '';
            document.getElementById('editSubject').value = data.subject || '';
            document.getElementById('editDescription').value = data.description || '';
            document.getElementById('editDepartment').value = data.department || 'general';
            document.getElementById('editFileUrl').value = data.fileUrl || '';
            document.getElementById('editFileName').value = data.fileName || '';
            document.getElementById('editFileNameDisplay').textContent = data.fileName || 'لا يوجد ملف';

            const modal = document.getElementById('editModal');
            if (modal) {
                modal.classList.remove('hidden');
                setTimeout(() => modal.classList.add('show'), 10);
            }
        })
        .catch(err => {
            console.error('Error loading summary:', err);
            showToast('خطأ في تحميل بيانات الملخص');
        });
}

// ===== Close Edit Modal =====
function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
    editSelectedFile = null;
}

// ===== Handle Edit File Select =====
function handleEditFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    editSelectedFile = file;
    document.getElementById('editFileNameDisplay').textContent = file.name;
}

// ===== Save Edit =====
async function saveEdit(event) {
    event.preventDefault();

    const summaryId = document.getElementById('editId').value;
    const dbUrl = localStorage.getItem('firebaseDatabaseURL') || FIREBASE_URL;

    const btn = document.getElementById('editSubmitBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');

    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');
    btn.disabled = true;

    try {
        let fileUrl = document.getElementById('editFileUrl').value;
        let fileName = document.getElementById('editFileName').value;
        let fileType = '';
        let fileSize = 0;

        if (editSelectedFile) {
            const formData = new FormData();
            formData.append('file', editSelectedFile);
            formData.append('upload_preset', CLOUDINARY_PRESET);
            formData.append('folder', 'rokn_summaries');

            const cloudinaryResponse = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`,
                { method: 'POST', body: formData }
            );

            if (!cloudinaryResponse.ok) {
                const error = await cloudinaryResponse.json();
                throw new Error(error.error?.message || 'فشل رفع الملف الجديد');
            }

            const cloudinaryResult = await cloudinaryResponse.json();
            fileUrl = cloudinaryResult.secure_url;
            fileName = editSelectedFile.name;
            fileType = editSelectedFile.type;
            fileSize = editSelectedFile.size;
        }

        const updatedSummary = {
            title: document.getElementById('editTitle').value.trim(),
            subject: document.getElementById('editSubject').value.trim(),
            description: document.getElementById('editDescription').value.trim(),
            department: document.getElementById('editDepartment').value,
            fileUrl: fileUrl,
            fileName: fileName,
            ...(fileType ? { fileType: fileType } : {}),
            ...(fileSize ? { fileSize: fileSize } : {}),
            updatedAt: new Date().toISOString()
        };

        const response = await fetch(dbUrl + 'summaries/' + summaryId + '.json', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedSummary)
        });

        if (!response.ok) throw new Error('فشل حفظ التعديلات');

        closeEditModal();
        await loadSummaries();
        showToast('تم التعديل بنجاح!');

    } catch (error) {
        console.error('Edit error:', error);
        showToast('خطأ: ' + error.message);
    } finally {
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
        btn.disabled = false;
        editSelectedFile = null;
    }

    return false;
}

// ===== Stats =====
function updateStats() {
    const statSummaries = document.getElementById('statSummaries');
    if (statSummaries) statSummaries.textContent = allSummaries.length;
}

function animateStats() {
    const stats = document.querySelectorAll('.stat-number');
    stats.forEach(stat => {
        const target = parseInt(stat.textContent) || 0;
        if (target === 0) return;

        let current = 0;
        const increment = target / 50;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                stat.textContent = target;
                clearInterval(timer);
            } else {
                stat.textContent = Math.floor(current);
            }
        }, 30);
    });
}

function showStats() {
    showSection('summaries');
}

// ===== Toast =====
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    if (toastMessage) toastMessage.textContent = message;
    if (toast) toast.classList.add('show');

    setTimeout(() => {
        if (toast) toast.classList.remove('show');
    }, 3000);
}

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAdminModal();
        closePreviewModal();
        closeEditModal();
    }
    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.focus();
    }
});