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
        color: 'red', 
        bg: 'from-red-500 to-red-600',
        border: 'border-red-500/30',
        text: 'text-red-400',
        bgLight: 'bg-red-500/10'
    },
    'communications': { 
        name: 'اتصالات', 
        icon: 'fa-wifi', 
        color: 'blue', 
        bg: 'from-blue-500 to-blue-600',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        bgLight: 'bg-blue-500/10'
    },
    'civil': { 
        name: 'مدني', 
        icon: 'fa-building', 
        color: 'yellow', 
        bg: 'from-yellow-500 to-yellow-600',
        border: 'border-yellow-500/30',
        text: 'text-yellow-400',
        bgLight: 'bg-yellow-500/10'
    },
    'chemistry': { 
        name: 'كيمياء', 
        icon: 'fa-atom', 
        color: 'purple', 
        bg: 'from-purple-500 to-purple-600',
        border: 'border-purple-500/30',
        text: 'text-purple-400',
        bgLight: 'bg-purple-500/10'
    },
    'general': { 
        name: 'عام', 
        icon: 'fa-globe', 
        color: 'green', 
        bg: 'from-green-500 to-green-600',
        border: 'border-green-500/30',
        text: 'text-green-400',
        bgLight: 'bg-green-500/10'
    }
};

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('Rokn Hub loaded!');

    createParticles();
    setupNavHandlers();
    loadSummaries();
    updateFavCount();
    animateStats();

    // Show admin badge if logged in
    if (isAdmin()) {
        const badge = document.getElementById('adminBadge');
        if (badge) {
            badge.classList.remove('hidden');
            badge.classList.add('inline-flex');
        }
    }

    // Header scroll effect
    window.addEventListener('scroll', () => {
        const header = document.getElementById('mainHeader');
        if (window.scrollY > 50) {
            header.classList.add('shadow-lg', 'shadow-cyan-500/10');
        } else {
            header.classList.remove('shadow-lg', 'shadow-cyan-500/10');
        }
    });
});

// ===== Admin Check =====
function isAdmin() {
    return !!localStorage.getItem('firebaseDatabaseURL');
}

// ===== Particles =====
function createParticles() {
    const container = document.getElementById('particlesBg');
    if (!container) return;

    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.width = Math.random() * 4 + 'px';
        particle.style.height = particle.style.width;
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        container.appendChild(particle);
    }
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
        menu.classList.toggle('translate-x-full');
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
        showToast('❌ خطأ في تحميل البيانات');
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
                <button onclick="openEditModal('${summary.id}')" class="flex-1 bg-gradient-to-r from-yellow-500 to-amber-600 text-white py-2 rounded-xl font-semibold text-sm text-center hover:shadow-lg hover:shadow-yellow-500/30 transition-all">
                    <i class="fas fa-edit ml-1"></i>تعديل
                </button>
                <button onclick="deleteSummary('${summary.id}')" class="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-2 rounded-xl font-semibold text-sm text-center hover:shadow-lg hover:shadow-red-500/30 transition-all">
                    <i class="fas fa-trash ml-1"></i>حذف
                </button>
            `;
        }

        return `
            <div class="glass-card holo-card p-6 card-3d group" onmousemove="handleTilt(event, this)" onmouseleave="resetTilt(this)">
                <div class="card-shadow"></div>
                <div class="card-content">
                    <div class="flex justify-between items-start mb-4">
                        <div class="dept-badge w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${dept.bg}">
                            <i class="fas ${dept.icon}"></i>
                        </div>
                        <button onclick="toggleFavorite('${summary.id}')" class="text-2xl transition-transform hover:scale-110 ${isFav ? 'text-pink-500' : 'text-gray-600 hover:text-pink-500'}">
                            <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                        </button>
                    </div>

                    <h3 class="text-xl font-bold text-white mb-2 line-clamp-2">${escapeHtml(summary.title || 'بدون عنوان')}</h3>
                    <p class="text-gray-400 text-sm mb-4 line-clamp-2">${escapeHtml(summary.description || 'لا يوجد وصف')}</p>

                    <div class="flex items-center gap-2 mb-4">
                        <span class="px-3 py-1 rounded-full text-xs font-bold border ${dept.border} ${dept.text} ${dept.bgLight}">
                            ${dept.name}
                        </span>
                        <span class="text-gray-500 text-xs">
                            <i class="fas fa-book ml-1"></i>${escapeHtml(summary.subject || 'عام')}
                        </span>
                    </div>

                    <div class="flex gap-2">
                        <button onclick="openPreview('${summary.id}')" class="flex-1 bg-white/5 border border-white/10 text-cyan-400 py-2 rounded-xl font-semibold text-sm hover:bg-white/10 hover:border-cyan-400/50 transition-all">
                            <i class="fas fa-eye ml-1"></i>عرض
                        </button>
                        <a href="${summary.fileUrl}" download class="flex-1 bg-gradient-to-r ${dept.bg} text-white py-2 rounded-xl font-semibold text-sm text-center hover:shadow-lg transition-all">
                            <i class="fas fa-download ml-1"></i>تحميل
                        </a>
                        ${adminActions}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Animate cards with GSAP if available
    if (typeof gsap !== 'undefined') {
        gsap.fromTo('.glass-card', 
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
        );
    }
}

// ===== Escape HTML =====
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== 3D Tilt Effect =====
function handleTilt(e, card) {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 20;
    const rotateY = (centerX - x) / 20;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
}

function resetTilt(card) {
    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
}

// ===== Filter & Search =====
function filterByDept(dept) {
    currentFilter = dept;

    document.querySelectorAll('.dept-filter-btn').forEach(btn => {
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
        showToast('❌ تم الإزالة من المفضلة');
    } else {
        favorites.push(id);
        showToast('❤️ تم الإضافة للمفضلة');
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
                <div class="flex justify-between items-start mb-4">
                    <div class="dept-badge w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${dept.bg}">
                        <i class="fas ${dept.icon}"></i>
                    </div>
                    <button onclick="toggleFavorite('${summary.id}')" class="text-2xl text-pink-500 hover:scale-110 transition-transform">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <h3 class="text-xl font-bold text-white mb-2">${escapeHtml(summary.title || 'بدون عنوان')}</h3>
                <p class="text-gray-400 text-sm mb-4">${escapeHtml(summary.description || 'لا يوجد وصف')}</p>
                <div class="flex gap-2">
                    <button onclick="openPreview('${summary.id}')" class="flex-1 bg-white/5 border border-white/10 text-cyan-400 py-2 rounded-xl font-semibold text-sm hover:bg-white/10 transition-all">
                        <i class="fas fa-eye ml-1"></i>عرض
                    </button>
                    <a href="${summary.fileUrl}" download class="flex-1 bg-gradient-to-r ${dept.bg} text-white py-2 rounded-xl font-semibold text-sm text-center hover:shadow-lg transition-all">
                        <i class="fas fa-download ml-1"></i>تحميل
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
        previewDept.className = `px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${dept.bg} text-white`;
    }
    if (previewSubject) previewSubject.textContent = summary.subject || 'عام';
    if (previewDesc) previewDesc.textContent = summary.description || 'لا يوجد وصف';
    if (previewDownload) previewDownload.href = summary.fileUrl;

    const modal = document.getElementById('previewModal');
    if (modal) modal.classList.remove('hidden');
}

function closePreviewModal() {
    const modal = document.getElementById('previewModal');
    if (modal) modal.classList.add('hidden');
}

// ===== Admin Modal =====
function openAdminModal() {
    const modal = document.getElementById('adminModal');
    const passwordStep = document.getElementById('passwordStep');
    const addForm = document.getElementById('addForm');
    const passwordInput = document.getElementById('adminPassword');
    const passwordError = document.getElementById('passwordError');

    if (modal) modal.classList.remove('hidden');
    if (passwordStep) passwordStep.classList.remove('hidden');
    if (addForm) addForm.classList.add('hidden');
    if (passwordInput) passwordInput.value = '';
    if (passwordError) passwordError.classList.add('hidden');
}

function closeAdminModal() {
    const modal = document.getElementById('adminModal');
    if (modal) modal.classList.add('hidden');
}

function checkPassword() {
    const input = document.getElementById('adminPassword');
    const passwordStep = document.getElementById('passwordStep');
    const addForm = document.getElementById('addForm');
    const passwordError = document.getElementById('passwordError');

    if (!input) return;

    if (input.value === ADMIN_PASSWORD) {
        if (passwordStep) passwordStep.classList.add('hidden');
        if (addForm) addForm.classList.remove('hidden');
    } else {
        if (passwordError) {
            passwordError.textContent = '❌ كلمة المرور غير صحيحة';
            passwordError.classList.remove('hidden');
        }

        // Shake animation
        if (typeof gsap !== 'undefined') {
            gsap.to('.glass-card', { x: [-10, 10, -10, 10, 0], duration: 0.5 });
        }
    }
}

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
        showToast('❌ اختر ملف أولاً');
        return false;
    }

    const btn = document.getElementById('addSubmitBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');
    const progressBar = document.querySelector('.progress-bar');
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
        showToast('✅ تم إضافة الملخص بنجاح!');

        setTimeout(() => {
            closeAdminModal();
            resetAddForm();
            loadSummaries();
        }, 1000);

    } catch (error) {
        console.error('Error:', error);
        showToast('❌ خطأ: ' + error.message);
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
        showToast('🗑️ تم الحذف بنجاح!');
        await loadSummaries();
    } catch (error) {
        console.error('Delete error:', error);
        showToast('❌ خطأ أثناء الحذف');
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
            if (modal) modal.classList.remove('hidden');
        })
        .catch(err => {
            console.error('Error loading summary:', err);
            showToast('❌ خطأ في تحميل بيانات الملخص');
        });
}

// ===== Close Edit Modal =====
function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) modal.classList.add('hidden');
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
        showToast('✅ تم التعديل بنجاح!');

    } catch (error) {
        console.error('Edit error:', error);
        showToast('❌ خطأ: ' + error.message);
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
    const statDownloads = document.getElementById('statDownloads');

    if (statSummaries) statSummaries.textContent = allSummaries.length;

    const totalDownloads = allSummaries.reduce((acc, s) => acc + (s.downloads || 0), 0);
    if (statDownloads) statDownloads.textContent = totalDownloads;
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
