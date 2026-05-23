// Configuration: Set to your Ngrok public URL when deploying/accessing from mobile
const BACKEND_URL = 'https://dreadful-sixties-refocus.ngrok-free.app'; 

// Initialize Socket.io connection to the backend
const socket = io(BACKEND_URL, {
    extraHeaders: {
        "ngrok-skip-browser-warning": "true"
    }
});

// UI Elements
const waterLevel = document.getElementById('waterLevel');
const percentageDisplay = document.getElementById('percentageDisplay');
const statusBadge = document.getElementById('statusBadge');
const buzzerIndicator = document.getElementById('buzzerIndicator');
const buzzerText = document.getElementById('buzzerText');
const distanceDisplay = document.getElementById('distanceDisplay');
const ledGreen = document.getElementById('ledGreen');
const ledYellow = document.getElementById('ledYellow');
const ledOrange = document.getElementById('ledOrange');
const ledRed = document.getElementById('ledRed');

// Chart initialization
const ctx = document.getElementById('historyChart').getContext('2d');
let historyChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Ketinggian Air (%)',
            data: [],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#3b82f6',
            fill: true,
            tension: 0.4
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: '#f8fafc' }
            }
        },
        scales: {
            x: {
                ticks: { color: '#94a3b8' },
                grid: { color: 'rgba(255, 255, 255, 0.05)' }
            },
            y: {
                beginAtZero: true,
                max: 100,
                ticks: { color: '#94a3b8' },
                grid: { color: 'rgba(255, 255, 255, 0.05)' }
            }
        }
    }
});

// Table functions
function getStatusClass(statusText) {
    if (!statusText) return 'penuh';
    let statusKey = statusText.toLowerCase();
    if (statusKey.includes('kosong') || statusKey.includes('habis') || statusKey === 'bahaya') return 'kosong';
    if (statusKey.includes('rendah')) return 'rendah';
    if (statusKey.includes('sedang') || statusKey === 'siaga') return 'sedang';
    return 'penuh';
}

function addTableRow(data) {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;

    const tr = document.createElement('tr');
    
    const time = new Date(data.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second:'2-digit' }).replace(/\./g, ':');
    const statusClass = getStatusClass(data.status);
    const statusText = data.status ? data.status.toUpperCase() : 'AMAN';

    tr.innerHTML = `
        <td>${time}</td>
        <td>${data.water_percentage.toFixed(1)}%</td>
        <td>${data.distance.toFixed(1)} cm</td>
        <td><span class="table-status-badge ${statusClass}">${statusText}</span></td>
    `;
    
    tbody.prepend(tr);
    
    // Limit rows to 100
    if (tbody.children.length > 100) {
        tbody.removeChild(tbody.lastChild);
    }
}

// Fetch historical data on load
async function fetchHistory() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/history?limit=20`, {
            headers: {
                "ngrok-skip-browser-warning": "true"
            }
        });
        const data = await response.json();
        
        data.forEach(item => {
            const time = new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second:'2-digit' }).replace(/\./g, ':');
            historyChart.data.labels.push(time);
            historyChart.data.datasets[0].data.push(item.water_percentage);
            addTableRow(item);
        });
        historyChart.update();
    } catch (error) {
        console.error('Error fetching history:', error);
    }
}
fetchHistory();

// Handle incoming real-time data from Socket.io
socket.on('sensorData', (data) => {
    console.log('Received data:', data);
    updateUI(data);
    updateChart(data);
    addTableRow(data);
});

function updateUI(data) {
    // 1. Update Water Tank Visual
    waterLevel.style.height = `${data.water_percentage}%`;
    percentageDisplay.textContent = `${data.water_percentage.toFixed(1)}%`;
    distanceDisplay.textContent = data.distance.toFixed(1);

    // 2. Update Status and Classes
    const body = document.body;
    body.classList.remove('status-penuh', 'status-sedang', 'status-rendah', 'status-kosong');
    statusBadge.textContent = data.status.toUpperCase();
    
    // Reset LEDs
    if (ledGreen) ledGreen.classList.remove('active');
    if (ledYellow) ledYellow.classList.remove('active');
    if (ledOrange) ledOrange.classList.remove('active');
    if (ledRed) ledRed.classList.remove('active');

    let statusKey = getStatusClass(data.status);

    if (statusKey === 'penuh') {
        body.classList.add('status-penuh');
        if (ledGreen) ledGreen.classList.add('active');
        historyChart.data.datasets[0].borderColor = '#10b981';
        historyChart.data.datasets[0].pointBackgroundColor = '#10b981';
        historyChart.data.datasets[0].backgroundColor = 'rgba(16, 185, 129, 0.1)';
    } else if (statusKey === 'sedang') {
        body.classList.add('status-sedang');
        if (ledYellow) ledYellow.classList.add('active');
        historyChart.data.datasets[0].borderColor = '#3b82f6';
        historyChart.data.datasets[0].pointBackgroundColor = '#3b82f6';
        historyChart.data.datasets[0].backgroundColor = 'rgba(59, 130, 246, 0.1)';
    } else if (statusKey === 'rendah') {
        body.classList.add('status-rendah');
        if (ledOrange) ledOrange.classList.add('active');
        historyChart.data.datasets[0].borderColor = '#f59e0b';
        historyChart.data.datasets[0].pointBackgroundColor = '#f59e0b';
        historyChart.data.datasets[0].backgroundColor = 'rgba(245, 158, 11, 0.1)';
    } else if (statusKey === 'kosong') {
        body.classList.add('status-kosong');
        if (ledRed) ledRed.classList.add('active');
        historyChart.data.datasets[0].borderColor = '#ef4444';
        historyChart.data.datasets[0].pointBackgroundColor = '#ef4444';
        historyChart.data.datasets[0].backgroundColor = 'rgba(239, 68, 68, 0.1)';
    }

    // 3. Update Buzzer based on status
    let buzzerState = (statusKey === 'kosong') ? 'ON' : 'OFF';

    // Override with mute button state
    if (isBuzzerMuted) {
        buzzerState = 'OFF';
    }

    if (buzzerState === 'ON') {
        buzzerIndicator.classList.add('buzzer-on');
        buzzerText.textContent = 'ON';
    } else {
        buzzerIndicator.classList.remove('buzzer-on');
        buzzerText.textContent = 'OFF';
    }
}

let isBuzzerMuted = false;
const muteBuzzerBtn = document.getElementById('muteBuzzerBtn');
if (muteBuzzerBtn) {
    muteBuzzerBtn.addEventListener('click', () => {
        isBuzzerMuted = !isBuzzerMuted;
        muteBuzzerBtn.textContent = isBuzzerMuted ? "Nyalakan Alarm" : "Matikan Alarm";
        
        // Immediately reflect the change without waiting for next data
        if (isBuzzerMuted) {
            buzzerIndicator.classList.remove('buzzer-on');
            buzzerText.textContent = 'OFF';
        }

        // Send command to backend to mute the physical Arduino buzzer
        socket.emit('toggleBuzzer', isBuzzerMuted);
    });
}

function updateChart(data) {
    const time = new Date(data.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second:'2-digit' });
    
    historyChart.data.labels.push(time);
    historyChart.data.datasets[0].data.push(data.water_percentage);

    // Keep only the last 20 points
    if (historyChart.data.labels.length > 20) {
        historyChart.data.labels.shift();
        historyChart.data.datasets[0].data.shift();
    }

    historyChart.update();
}

// Export CSV Functionality
const exportCsvBtn = document.getElementById('exportCsvBtn');
if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
        // Trigger download from backend API
        window.location.href = `${BACKEND_URL}/api/export-csv`;
    });
}

// Reset Data Functionality
const resetDataBtn = document.getElementById('resetDataBtn');
const resetModal = document.getElementById('resetModal');
const cancelResetBtn = document.getElementById('cancelResetBtn');
const confirmResetBtn = document.getElementById('confirmResetBtn');

if (resetDataBtn && resetModal) {
    resetDataBtn.addEventListener('click', () => {
        resetModal.classList.remove('hidden');
    });

    cancelResetBtn.addEventListener('click', () => {
        resetModal.classList.add('hidden');
    });

    // Close modal when clicking outside of it
    resetModal.addEventListener('click', (e) => {
        if (e.target === resetModal) {
            resetModal.classList.add('hidden');
        }
    });

    confirmResetBtn.addEventListener('click', async () => {
        try {
            // Disable button to prevent double clicks
            confirmResetBtn.disabled = true;
            confirmResetBtn.textContent = 'Menghapus...';

            const response = await fetch(`${BACKEND_URL}/api/reset`, {
                method: 'DELETE',
                headers: {
                    "ngrok-skip-browser-warning": "true"
                }
            });

            if (response.ok) {
                // Success, close modal
                resetModal.classList.add('hidden');
                alert('Semua data berhasil dihapus dan ID direset ke 1.');
            } else {
                alert('Gagal menghapus data.');
            }
        } catch (error) {
            console.error('Error resetting data:', error);
            alert('Terjadi kesalahan saat menghapus data.');
        } finally {
            confirmResetBtn.disabled = false;
            confirmResetBtn.textContent = 'Ya, Hapus Semua';
        }
    });
}

// Handle dataReset event from server to clear chart and UI
socket.on('dataReset', () => {
    // Clear chart data
    historyChart.data.labels = [];
    historyChart.data.datasets[0].data = [];
    historyChart.update();
    
    // Clear table
    const tbody = document.getElementById('historyTableBody');
    if (tbody) tbody.innerHTML = '';
    
    // Reset UI to default waiting state
    waterLevel.style.height = '0%';
    percentageDisplay.textContent = '--%';
    distanceDisplay.textContent = '--';
    statusBadge.textContent = 'Menunggu...';
    document.body.classList.remove('status-penuh', 'status-sedang', 'status-rendah', 'status-kosong');
    
    if (ledGreen) ledGreen.classList.remove('active');
    if (ledYellow) ledYellow.classList.remove('active');
    if (ledOrange) ledOrange.classList.remove('active');
    if (ledRed) ledRed.classList.remove('active');
    
    buzzerIndicator.classList.remove('buzzer-on');
    buzzerText.textContent = 'OFF';
});

// Live Clock Feature
function updateLiveClock() {
    const clockElement = document.getElementById('liveClock');
    const dateElement = document.getElementById('liveDate');
    
    if (clockElement && dateElement) {
        const now = new Date();
        
        // Format Time (HH:MM:SS)
        const timeString = now.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        // Format Date (Hari, DD Bulan YYYY)
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateString = now.toLocaleDateString('id-ID', options);
        
        // Use replace to prevent string manipulation issues like replacing . with :
        clockElement.textContent = timeString.replace(/\./g, ':');
        dateElement.textContent = dateString;
    }
}

// Initial call and set interval
updateLiveClock();
setInterval(updateLiveClock, 1000);

// Theme Toggle Feature
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');

// Check local storage for theme
if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-mode');
    updateThemeUI(true);
    // Note: Chart colors update will happen slightly later if chart is not fully rendered,
    // but we can call it here since historyChart is defined at the top.
    setTimeout(() => updateChartTheme(true), 100);
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        
        // Save preference
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        
        updateThemeUI(isLight);
        updateChartTheme(isLight);
    });
}

function updateThemeUI(isLight) {
    if (!themeIcon) return;
    
    if (isLight) {
        // Moon icon for switching to dark mode later
        themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    } else {
        // Sun icon for switching to light mode later
        themeIcon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
    }
}

function updateChartTheme(isLight) {
    if (!historyChart) return;
    
    const textColor = isLight ? '#475569' : '#94a3b8';
    const gridColor = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';
    const legendColor = isLight ? '#0f172a' : '#f8fafc';
    
    historyChart.options.plugins.legend.labels.color = legendColor;
    historyChart.options.scales.x.ticks.color = textColor;
    historyChart.options.scales.y.ticks.color = textColor;
    historyChart.options.scales.x.grid.color = gridColor;
    historyChart.options.scales.y.grid.color = gridColor;
    
    historyChart.update();
}


