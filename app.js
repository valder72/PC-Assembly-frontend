// Базова адреса бекенд API
const API_BASE_URL = 'http://127.0.0.1:8000';

// DOM-елементи
const partsContainer = document.getElementById('partsContainer');
const loader = document.getElementById('loader');
const errorMessage = document.getElementById('errorMessage');
const emptyCatalog = document.getElementById('emptyCatalog');
const serverStatus = document.getElementById('serverStatus');

// Фільтри
const searchInput = document.getElementById('searchInput');
const categorySelect = document.getElementById('categorySelect');
const manufacturerSelect = document.getElementById('manufacturerSelect');
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');

// Модальне вікно додавання
const openAddModalBtn = document.getElementById('openAddModalBtn');
const closeAddModalBtn = document.getElementById('closeAddModalBtn');
const cancelAddBtn = document.getElementById('cancelAddBtn');
const addPartModal = document.getElementById('addPartModal');
const addPartForm = document.getElementById('addPartForm');
const formError = document.getElementById('formError');
const newCategorySelect = document.getElementById('newCategory');
const newManufacturerSelect = document.getElementById('newManufacturer');

// Ініціалізація застосунку
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

async function initApp() {
    await checkApiHealth();
    await loadCategories();
    await loadManufacturers();
    await loadParts();
}

function setupEventListeners() {
    applyFiltersBtn.addEventListener('click', () => loadParts());
    resetFiltersBtn.addEventListener('click', resetFilters);

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadParts();
    });

    categorySelect.addEventListener('change', () => loadParts());
    manufacturerSelect.addEventListener('change', () => loadParts());

    // Модальне вікно
    openAddModalBtn.addEventListener('click', () => {
        formError.style.display = 'none';
        addPartForm.reset();
        addPartModal.classList.add('active');
    });

    closeAddModalBtn.addEventListener('click', () => addPartModal.classList.remove('active'));
    cancelAddBtn.addEventListener('click', () => addPartModal.classList.remove('active'));

    window.addEventListener('click', (e) => {
        if (e.target === addPartModal) addPartModal.classList.remove('active');
    });

    addPartForm.addEventListener('submit', handleAddPart);
}

// 1. Перевірка статусу API
async function checkApiHealth() {
    const indicator = serverStatus.querySelector('.status-indicator');
    const text = serverStatus.querySelector('.status-text');

    try {
        const response = await fetch(`${API_BASE_URL}/categories/`);
        if (response.ok) {
            indicator.className = 'status-indicator online';
            text.textContent = 'API онлайн (127.0.0.1:8000)';
        } else {
            throw new Error();
        }
    } catch {
        indicator.className = 'status-indicator offline';
        text.textContent = 'API недоступний';
    }
}

// 2. Завантаження категорій
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories/`);
        if (!response.ok) throw new Error();
        const categories = await response.json();

        categorySelect.innerHTML = '<option value="">Всі категорії</option>';
        newCategorySelect.innerHTML = '<option value="">Оберіть категорію</option>';

        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            categorySelect.appendChild(option);

            const modalOption = option.cloneNode(true);
            newCategorySelect.appendChild(modalOption);
        });
    } catch (err) {
        console.error('Помилка завантаження категорій:', err);
    }
}

// 3. Завантаження виробників
async function loadManufacturers() {
    try {
        const response = await fetch(`${API_BASE_URL}/manufacturers/`);
        if (!response.ok) throw new Error();
        const manufacturers = await response.json();

        manufacturerSelect.innerHTML = '<option value="">Всі виробники</option>';
        newManufacturerSelect.innerHTML = '<option value="">Оберіть виробника</option>';

        manufacturers.forEach(m => {
            const option = document.createElement('option');
            option.value = m.id;
            option.textContent = m.name;
            manufacturerSelect.appendChild(option);

            const modalOption = option.cloneNode(true);
            newManufacturerSelect.appendChild(modalOption);
        });
    } catch (err) {
        console.error('Помилка завантаження виробників:', err);
    }
}

// 4. Завантаження деталей з фільтрацією
async function loadParts() {
    loader.style.display = 'block';
    errorMessage.style.display = 'none';
    emptyCatalog.style.display = 'none';
    partsContainer.innerHTML = '';

    const params = new URLSearchParams();
    const searchVal = searchInput.value.trim();
    const catVal = categorySelect.value;
    const manVal = manufacturerSelect.value;

    if (searchVal) params.append('search', searchVal);
    if (catVal) params.append('category', catVal);
    if (manVal) params.append('manufacturer', manVal);

    try {
        const url = `${API_BASE_URL}/parts/?${params.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const parts = await response.json();
        loader.style.display = 'none';

        if (!parts || parts.length === 0) {
            emptyCatalog.style.display = 'block';
            return;
        }

        renderParts(parts);
    } catch (err) {
        console.error('Помилка завантаження деталей:', err);
        loader.style.display = 'none';
        errorMessage.style.display = 'block';
    }
}

// 5. Рендеринг карток товарів
function renderParts(parts) {
    partsContainer.innerHTML = '';

    parts.forEach(part => {
        const card = document.createElement('div');
        card.className = 'part-card';

        // Форматування specs
        let specsHtml = '';
        if (part.specs && typeof part.specs === 'object') {
            const entries = Object.entries(part.specs).slice(0, 4); // показуємо до 4 властивостей
            specsHtml = `
                <div class="part-specs">
                    <div class="specs-title">Характеристики:</div>
                    ${entries.map(([k, v]) => `
                        <div class="spec-item">
                            <span>${escapeHtml(k)}:</span>
                            <strong>${escapeHtml(String(v))}</strong>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        const priceFormatted = Number(part.price).toLocaleString('uk-UA', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        card.innerHTML = `
            <div>
                <div class="part-card-header">
                    <span class="category-badge">${escapeHtml(part.category_name || 'Деталь')}</span>
                    <span class="rating-badge">★ ${part.rating || '5.0'}</span>
                </div>
                <h3 class="part-title">${escapeHtml(part.title)}</h3>
                <div class="part-manufacturer">Виробник: <strong>${escapeHtml(part.manufacturer_name || 'Невідомо')}</strong></div>
                ${specsHtml}
                ${part.description ? `<p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 12px;">${escapeHtml(part.description)}</p>` : ''}
            </div>
            <div class="part-footer">
                <span class="part-price">${priceFormatted} ₴</span>
                <button class="btn btn-danger delete-btn" data-id="${part.id}">Видалити</button>
            </div>
        `;

        // Слухач видалення
        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => deletePart(part.id, part.title));

        partsContainer.appendChild(card);
    });
}

// 6. Додавання деталі (POST)
async function handleAddPart(e) {
    e.preventDefault();
    formError.style.display = 'none';

    let specsObj = {};
    const specsRaw = document.getElementById('newSpecs').value.trim();
    try {
        specsObj = JSON.parse(specsRaw);
        if (typeof specsObj !== 'object' || Array.isArray(specsObj)) {
            throw new Error();
        }
    } catch {
        showFormError('Характеристики мають бути валідним JSON-об\'єктом (наприклад: {"socket": "AM5", "tdp": 120})');
        return;
    }

    const payload = {
        title: document.getElementById('newTitle').value.trim(),
        category: parseInt(document.getElementById('newCategory').value, 10),
        manufacturer: parseInt(document.getElementById('newManufacturer').value, 10),
        price: parseFloat(document.getElementById('newPrice').value),
        rating: parseFloat(document.getElementById('newRating').value) || 5.0,
        specs: specsObj,
        description: document.getElementById('newDescription').value.trim()
    };

    try {
        const response = await fetch(`${API_BASE_URL}/parts/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            const errorDetails = data.details ? JSON.stringify(data.details) : (data.error || 'Помилка валідації');
            showFormError(errorDetails);
            return;
        }

        // Успішно створено
        addPartModal.classList.remove('active');
        addPartForm.reset();
        await loadParts();
    } catch (err) {
        showFormError('Не вдалося відправити запит до сервера.');
    }
}

// 7. Видалення деталі (DELETE)
async function deletePart(id, title) {
    if (!confirm(`Ви дійсно бажаєте видалити "${title}" (ID: ${id})?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/parts/${id}/`, {
            method: 'DELETE'
        });

        if (response.status === 204) {
            await loadParts();
        } else {
            const data = await response.json();
            alert(`Помилка видалення: ${data.error || 'Невідома помилка'}`);
        }
    } catch (err) {
        alert('Не вдалося з\'єднатися з сервером для видалення.');
    }
}

function resetFilters() {
    searchInput.value = '';
    categorySelect.value = '';
    manufacturerSelect.value = '';
    loadParts();
}

function showFormError(msg) {
    formError.textContent = msg;
    formError.style.display = 'block';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
