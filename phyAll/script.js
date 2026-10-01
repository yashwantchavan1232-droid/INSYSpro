/* ================================================================
   INSYS v5.0 - COMPLETE JAVASCRIPT (with Online/Offline Detection)
   ================================================================ */

// ── CONFIGURATION ──
const API_BASE_URL = 'http://localhost:5000';
const HEALTH_ENDPOINT = '/api/health';
const STOCKS_ENDPOINT = '/api/stocks';

// ── STATE ──
let stocksData = [];
let currentFilter = 'all';
let isOnline = false;
let lastFetchTime = null;

// ── 3D BACKGROUND (with fallback) ──
(function() {
    try {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        document.getElementById('three-bg').appendChild(renderer.domElement);
        const geometry = new THREE.BufferGeometry();
        const count = 200;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count * 3; i++) { positions[i] = (Math.random() - 0.5) * 200; }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({ color: 0x00e5ff, size: 0.2, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending });
        const particleSystem = new THREE.Points(geometry, material);
        scene.add(particleSystem);
        camera.position.z = 50;
        function animate() {
            requestAnimationFrame(animate);
            particleSystem.rotation.x += 0.0003;
            particleSystem.rotation.y += 0.0005;
            renderer.render(scene, camera);
        }
        animate();
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    } catch(e) { console.warn('3D background fallback:', e); }
})();

// ── DATE/TIME ──
function updateDateTime() {
    const now = new Date();
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    document.getElementById('current-day').textContent = days[now.getDay()];
    document.getElementById('current-date').textContent = months[now.getMonth()] + ' ' + 
        String(now.getDate()).padStart(2,'0') + ', ' + now.getFullYear();
    document.getElementById('live-time').textContent = now.toTimeString().slice(0,8);
}
updateDateTime();
setInterval(updateDateTime, 1000);

// ── NAVIGATION ──
function showSection(section, el) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('sec-' + section);
    if (target) target.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');
}

// ── GENERATE DEMO DATA (fallback) ──
function generateDemoData() {
    const symbols = [
        'TITAN', 'GRASIM', 'PIDILITIND', 'BAJAJFINSV', 'ICICIBANK',
        'RELIANCE', 'TECHM', 'HINDALCO', 'EICHERMOT', 'BAJAJ-AUTO',
        'AXISBANK', 'JSWSTEEL', 'COALINDIA', 'HEROMOTOCO', 'TATASTEEL'
    ];
    const companies = [
        'Titan Company', 'Grasim Industries', 'Pidilite Industries', 'Bajaj Finserv', 'ICICI Bank',
        'Reliance Industries', 'Tech Mahindra', 'Hindalco Industries', 'Eicher Motors', 'Bajaj Auto',
        'Axis Bank', 'JSW Steel', 'Coal India', 'Hero MotoCorp', 'Tata Steel'
    ];
    const signals = ['STRONG BUY', 'BUY', 'HOLD', 'SELL', 'STRONG SELL'];
    const data = [];
    for (let i = 0; i < symbols.length; i++) {
        const price = Math.random() * 5000 + 100;
        const change = (Math.random() - 0.5) * 8;
        const signal = signals[Math.floor(Math.random() * signals.length)];
        const confidence = Math.floor(Math.random() * 40) + 50;
        data.push({
            symbol: symbols[i],
            name: companies[i],
            price: parseFloat(price.toFixed(2)),
            change_pct: parseFloat(change.toFixed(2)),
            signal: signal,
            confidence: confidence,
            rsi: parseFloat((Math.random() * 100).toFixed(1)),
            reasons: ['Demo data (API offline)']
        });
    }
    return data;
}

// ── UPDATE STATUS INDICATOR ──
function updateStatus(online) {
    isOnline = online;
    const dot = document.getElementById('status-dot');
    const label = document.getElementById('status-label');
    const statusText = document.getElementById('status-text');
    if (online) {
        dot.className = 'status-dot online';
        label.textContent = 'ONLINE';
        statusText.textContent = 'LIVE';
    } else {
        dot.className = 'status-dot offline';
        label.textContent = 'OFFLINE';
        statusText.textContent = 'DEMO';
    }
}

// ── CHECK BACKEND HEALTH ──
async function checkBackend() {
    try {
        const response = await fetch(`${API_BASE_URL}${HEALTH_ENDPOINT}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        if (response.ok) {
            updateStatus(true);
            return true;
        } else {
            updateStatus(false);
            return false;
        }
    } catch (error) {
        console.warn('Backend health check failed:', error.message);
        updateStatus(false);
        return false;
    }
}

// ── FETCH STOCKS FROM API ──
async function fetchStocksFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}${STOCKS_ENDPOINT}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(5000)
        });
        if (!response.ok) throw new Error('API returned ' + response.status);
        const data = await response.json();
        // The API might return { stocks: [...] } or just an array
        if (data && data.stocks) return data.stocks;
        if (Array.isArray(data)) return data;
        return [];
    } catch (error) {
        console.warn('Fetch stocks error:', error.message);
        return null;
    }
}

// ── LOAD DATA (with fallback) ──
async function loadData() {
    // First, check backend health
    const online = await checkBackend();
    
    let data = null;
    if (online) {
        data = await fetchStocksFromAPI();
    }
    
    if (data && data.length > 0) {
        stocksData = data;
        document.getElementById('last-updated').textContent = 'Just now';
    } else {
        // Use demo data
        stocksData = generateDemoData();
        document.getElementById('last-updated').textContent = 'Demo data (offline)';
        showToast('📡 Using demo data - backend offline');
    }
    
    renderAll();
}

// ── RENDER ALL ──
function renderAll() {
    renderTicker();
    renderStats();
    renderTop5();
    renderStockListFull();
    renderStockListMini();
    renderPredictions();
    updateStockCount();
    applyFilters();
}

// ── RENDER TICKER ──
function renderTicker() {
    const ticker = document.getElementById('ticker');
    const items = stocksData.slice(0, 30).map(s => {
        const change = s.change_pct || 0;
        const cls = change >= 0 ? 'positive' : 'negative';
        return `<span class="ticker-item">
            <span class="sym">${s.symbol}</span>
            <span class="price">₹${s.price?.toFixed(2) || '0'}</span>
            <span class="change ${cls}">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</span>
        </span>`;
    }).join('');
    ticker.innerHTML = items + items;
}

// ── RENDER STATS ──
function renderStats() {
    const total = stocksData.length;
    const buy = stocksData.filter(s => s.signal === 'STRONG BUY' || s.signal === 'BUY').length;
    const hold = stocksData.filter(s => s.signal === 'HOLD').length;
    const sell = stocksData.filter(s => s.signal === 'SELL' || s.signal === 'STRONG SELL').length;
    const avgConf = stocksData.reduce((sum, s) => sum + (s.confidence || 50), 0) / total || 0;
    
    // Top pick
    const topPick = stocksData.filter(s => s.signal === 'STRONG BUY' || s.signal === 'BUY')
        .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
    if (topPick) {
        document.getElementById('top-pick-sym').textContent = topPick.symbol;
        const changeEl = document.getElementById('top-pick-change');
        changeEl.textContent = `${topPick.change_pct?.toFixed(2) || 0}%`;
        changeEl.className = `stat-change ${(topPick.change_pct || 0) >= 0 ? 'positive' : 'negative'}`;
        document.getElementById('top-pick-reason').textContent = topPick.reasons?.[0] || 'Top pick';
    }
    
    // Sentiment
    const sentiment = buy > sell ? '🟢 BULLISH' : sell > buy ? '🔴 BEARISH' : '🟡 NEUTRAL';
    document.getElementById('market-sentiment').textContent = sentiment;
    document.getElementById('sentiment-detail').textContent = `${buy} BUY · ${sell} SELL`;
    document.getElementById('sentiment-sub').textContent = `${((buy / total) * 100).toFixed(0)}% bullish sentiment`;
    
    // Risk
    const risk = avgConf > 75 ? '🟢 LOW' : avgConf > 50 ? '🟡 MEDIUM' : '🔴 HIGH';
    document.getElementById('market-risk').textContent = risk;
    document.getElementById('risk-detail').textContent = `Confidence: ${avgConf.toFixed(0)}%`;
    document.getElementById('risk-sub').textContent = `Market risk based on signal confidence`;
    
    // Total
    document.getElementById('total-stocks-value').textContent = total;
    document.getElementById('signal-distribution').textContent = `🟢${buy} 🟡${hold} 🔴${sell}`;
    document.getElementById('avg-confidence').textContent = `Avg Confidence: ${avgConf.toFixed(0)}%`;
    document.getElementById('buy-count').textContent = `${buy} BUY`;
}

// ── RENDER TOP 5 ──
function renderTop5() {
    const container = document.getElementById('top5-list');
    const top5 = stocksData
        .filter(s => s.signal === 'STRONG BUY' || s.signal === 'BUY')
        .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
        .slice(0, 5);
    if (top5.length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-secondary);">No strong buy recommendations</div>';
        document.getElementById('top5-count').textContent = '0';
        return;
    }
    container.innerHTML = top5.map((s, i) => `
        <div class="top5-item">
            <span class="top5-rank">#${i + 1}</span>
            <span style="font-weight:600;">${s.symbol}</span>
            <span style="flex:1;"></span>
            <span class="signal-badge signal-${s.signal?.toLowerCase().replace(' ', '-') || 'hold'}">${s.signal}</span>
            <span style="font-weight:600;">${s.confidence}%</span>
        </div>
    `).join('');
    document.getElementById('top5-count').textContent = `${top5.length} picks`;
}

// ── RENDER STOCK LIST FULL ──
function renderStockListFull() {
    const container = document.getElementById('stock-list-full');
    // We'll use the existing rows; we will filter them later.
    // Just ensure the rows exist – they are already in HTML.
    // We'll update the data attributes and content if needed.
    // Since we have hardcoded rows, we'll update them with JS if data changes.
    // But we can also dynamically generate.
    // For simplicity, we assume the rows are pre-populated in HTML.
    // If we want to regenerate, we can do it here.
    // We'll just keep the existing HTML and use filters.
    // Already done in applyFilters.
}

// ── RENDER STOCK LIST MINI ──
function renderStockListMini() {
    // Not used in current layout, but we keep for completeness.
}

// ── RENDER PREDICTIONS ──
function renderPredictions() {
    // Predictions are static in HTML, we could update if needed.
}

// ── UPDATE STOCK COUNT ──
function updateStockCount() {
    document.getElementById('stock-count-display').textContent = stocksData.length;
    document.getElementById('stock-count').textContent = stocksData.length + ' stocks';
}

// ── STOCK FILTER ──
function filterStocks(filter, el) {
    currentFilter = filter;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    applyFilters();
}

function searchStocks(query) {
    applyFilters(query);
}

function applyFilters(query) {
    const rows = document.querySelectorAll('#stock-list-full .stock-row');
    const search = (query || document.querySelector('.search-bar')?.value || '').toLowerCase();
    let visibleCount = 0;
    rows.forEach(row => {
        const badge = row.querySelector('.signal-badge');
        const symbol = row.dataset.symbol?.toLowerCase() || '';
        const name = row.querySelector('.name')?.textContent?.toLowerCase() || '';
        const matchSearch = symbol.includes(search) || name.includes(search);
        let matchFilter = true;
        if (currentFilter !== 'all' && badge) {
            const text = badge.textContent.trim().toLowerCase().replace(/ /g, '_');
            matchFilter = (text === currentFilter);
        }
        if (matchFilter && matchSearch) {
            row.style.display = 'flex';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    document.getElementById('stock-count').textContent = visibleCount + ' stocks';
}

// ── REFRESH ──
let countdown = 12;
function manualRefresh() {
    countdown = 12;
    document.getElementById('countdown-timer').textContent = '12s';
    loadData(); // Reload data
    showToast('🔄 Refreshing data...');
}

setInterval(() => {
    const toggle = document.getElementById('auto-refresh-toggle');
    if (toggle && toggle.checked) {
        countdown--;
        document.getElementById('countdown-timer').textContent = countdown + 's';
        if (countdown <= 0) {
            countdown = 12;
            document.getElementById('countdown-timer').textContent = '12s';
            // Auto-refresh: check backend and load data if online
            loadData();
        }
    }
}, 1000);

// ── TOAST ──
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── SETTINGS (localStorage) ──
const defaultSettings = {
    language: 'english',
    indicators: 'all',
    alerts: true,
    risk: true,
    darkmode: true,
    autorefresh: true
};

function loadSettings() {
    try {
        const saved = localStorage.getItem('insys_settings');
        if (saved) {
            const settings = JSON.parse(saved);
            if (settings.language) {
                document.getElementById('setting-language').value = settings.language;
                document.getElementById('lang-status').textContent = '✅ ' + settings.language.charAt(0).toUpperCase() + settings.language.slice(1);
            }
            if (settings.indicators) {
                document.getElementById('setting-indicators').value = settings.indicators;
                const indMap = { all: 'All 50+', basic: 'Basic (10)', advanced: 'Advanced (30)' };
                document.getElementById('ind-status').textContent = '✅ ' + (indMap[settings.indicators] || 'All 50+');
            }
            if (settings.alerts !== undefined) {
                document.getElementById('setting-alerts').checked = settings.alerts;
                document.getElementById('alerts-status').textContent = settings.alerts ? '✅ Enabled' : '❌ Disabled';
                document.getElementById('alerts-status').className = 'setting-status' + (settings.alerts ? '' : ' off');
            }
            if (settings.risk !== undefined) {
                document.getElementById('setting-risk').checked = settings.risk;
                document.getElementById('risk-status').textContent = settings.risk ? '✅ Enabled' : '❌ Disabled';
                document.getElementById('risk-status').className = 'setting-status' + (settings.risk ? '' : ' off');
            }
            if (settings.darkmode !== undefined) {
                document.getElementById('setting-darkmode').checked = settings.darkmode;
                document.getElementById('dark-status').textContent = settings.darkmode ? '✅ Enabled' : '❌ Disabled';
                document.getElementById('dark-status').className = 'setting-status' + (settings.darkmode ? '' : ' off');
            }
            if (settings.autorefresh !== undefined) {
                document.getElementById('setting-autorefresh').checked = settings.autorefresh;
                document.getElementById('refresh-status').textContent = settings.autorefresh ? '✅ Enabled' : '❌ Disabled';
                document.getElementById('refresh-status').className = 'setting-status' + (settings.autorefresh ? '' : ' off');
            }
            document.getElementById('settings-status').textContent = 'Settings Loaded';
        }
    } catch(e) {}
}

function saveSetting(key, value) {
    try {
        let settings = JSON.parse(localStorage.getItem('insys_settings') || '{}');
        settings[key] = value;
        localStorage.setItem('insys_settings', JSON.stringify(settings));
        updateSettingStatus(key, value);
        document.getElementById('settings-status').textContent = 'Setting Saved';
        applySetting(key, value);
    } catch(e) { showToast('⚠️ Could not save setting'); }
}

function updateSettingStatus(key, value) {
    const map = {
        language: { id: 'lang-status', display: (v) => '✅ ' + v.charAt(0).toUpperCase() + v.slice(1) },
        indicators: { id: 'ind-status', display: (v) => '✅ ' + ({ all: 'All 50+', basic: 'Basic (10)', advanced: 'Advanced (30)' }[v] || 'All 50+') },
        alerts: { id: 'alerts-status', display: (v) => v ? '✅ Enabled' : '❌ Disabled' },
        risk: { id: 'risk-status', display: (v) => v ? '✅ Enabled' : '❌ Disabled' },
        darkmode: { id: 'dark-status', display: (v) => v ? '✅ Enabled' : '❌ Disabled' },
        autorefresh: { id: 'refresh-status', display: (v) => v ? '✅ Enabled' : '❌ Disabled' }
    };
    if (map[key]) {
        const el = document.getElementById(map[key].id);
        if (el) {
            el.textContent = map[key].display(value);
            el.className = 'setting-status' + (value ? '' : ' off');
        }
    }
}

function applySetting(key, value) {
    if (key === 'autorefresh') {
        const toggle = document.getElementById('auto-refresh-toggle');
        if (toggle) toggle.checked = value;
        if (!value) document.getElementById('countdown-timer').textContent = 'OFF';
        else { countdown = 12; document.getElementById('countdown-timer').textContent = '12s'; }
    } else if (key === 'language') showToast('🌐 Language: ' + value);
    else if (key === 'indicators') showToast('📊 Indicators updated');
    else if (key === 'alerts') showToast(value ? '🔔 Alerts ON' : '🔕 Alerts OFF');
    else if (key === 'risk') showToast(value ? '📈 Risk Display ON' : '📉 Risk Display OFF');
    else if (key === 'darkmode') showToast('🌙 Dark mode: ' + (value ? 'ON' : 'OFF'));
}

function saveAllSettings() {
    try {
        const settings = {
            language: document.getElementById('setting-language').value,
            indicators: document.getElementById('setting-indicators').value,
            alerts: document.getElementById('setting-alerts').checked,
            risk: document.getElementById('setting-risk').checked,
            darkmode: document.getElementById('setting-darkmode').checked,
            autorefresh: document.getElementById('setting-autorefresh').checked
        };
        localStorage.setItem('insys_settings', JSON.stringify(settings));
        Object.keys(settings).forEach(key => {
            updateSettingStatus(key, settings[key]);
            applySetting(key, settings[key]);
        });
        document.getElementById('settings-status').textContent = 'All Saved!';
        showToast('💾 All settings saved!');
        document.getElementById('save-message').textContent = '✅ All settings saved successfully!';
    } catch(e) { showToast('❌ Error saving settings'); }
}

function resetSettings() {
    try {
        localStorage.setItem('insys_settings', JSON.stringify(defaultSettings));
        document.getElementById('setting-language').value = defaultSettings.language;
        document.getElementById('setting-indicators').value = defaultSettings.indicators;
        document.getElementById('setting-alerts').checked = defaultSettings.alerts;
        document.getElementById('setting-risk').checked = defaultSettings.risk;
        document.getElementById('setting-darkmode').checked = defaultSettings.darkmode;
        document.getElementById('setting-autorefresh').checked = defaultSettings.autorefresh;
        Object.keys(defaultSettings).forEach(key => {
            updateSettingStatus(key, defaultSettings[key]);
            applySetting(key, defaultSettings[key]);
        });
        document.getElementById('settings-status').textContent = 'Reset to Default';
        showToast('🔄 Settings reset to default!');
        document.getElementById('save-message').textContent = '🔄 Reset to default settings';
    } catch(e) { showToast('❌ Error resetting settings'); }
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    // Initial load
    loadData();
    // Periodically check backend status every 30 seconds
    setInterval(async () => {
        await checkBackend();
    }, 30000);
});

window.onload = function() {
    loadSettings();
    loadData();
};