// Konfigurasi TradingView Widgets
let widgets = {};

// Konfigurasi setiap chart
const chartConfigs = {
    xauusd: {
        container: 'tv-xauusd',
        symbol: 'FX_IDC:XAUUSD',
        title: 'XAUUSD'
    },
    dxy: {
        container: 'tv-dxy',
        symbol: 'CAPITALCOM:DXY',
        title: 'US Dollar Index'
    },
    us10y: {
        container: 'tv-us10y',
        symbol: 'US10Y',
        title: 'US Government Bonds 10 YR Yield'
    },
    usdjpy: {
        container: 'tv-usdjpy',
        symbol: 'FX_IDC:USDJPY',
        title: 'USD/JPY'
    }
};

// Initialize semua chart
function initCharts() {
    for (const [key, config] of Object.entries(chartConfigs)) {
        const widget = new TradingView.widget({
            width: '100%',
            height: 350,
            symbol: config.symbol,
            interval: '60',
            timezone: 'Asia/Jakarta',
            theme: 'dark',
            style: '1',
            locale: 'id',
            toolbar_bg: '#1a1f3a',
            enable_publishing: false,
            allow_symbol_change: false,
            container_id: config.container,
            studies: ["MAExp@tv-basicstudies-1"],
            studies_overrides: {
                "movingaverage.length": 14,
                "movingaverage.plot.color": "#ffd700"
            }
        });
        
        widgets[key] = widget;
    }
}

// Fungsi untuk mengganti timeframe
function changeTimeframe(chartKey, timeframe) {
    if (widgets[chartKey]) {
        try {
            // Konversi timeframe ke format TradingView
            let resolution;
            switch(timeframe) {
                case '1': resolution = '1'; break;
                case '5': resolution = '5'; break;
                case '15': resolution = '15'; break;
                case '30': resolution = '30'; break;
                case '60': resolution = '60'; break;
                case '240': resolution = '240'; break;
                case '1D': resolution = '1D'; break;
                default: resolution = '60';
            }
            
            const chart = widgets[chartKey].chart();
            if (chart && chart.setResolution) {
                chart.setResolution(resolution);
            } else if (chart && chart.setInterval) {
                chart.setInterval(resolution);
            }
        } catch(e) {
            console.log('Timeframe change not supported in this version');
        }
    }
}

// Event listener untuk timeframe buttons
document.querySelectorAll('.timeframe-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const tf = this.getAttribute('data-tf');
        const parent = this.closest('.chart-card');
        let chartKey = '';
        
        if (parent.querySelector('.symbol').innerText.includes('XAUUSD')) chartKey = 'xauusd';
        else if (parent.querySelector('.symbol').innerText.includes('US Dollar Index')) chartKey = 'dxy';
        else if (parent.querySelector('.symbol').innerText.includes('US Government Bonds')) chartKey = 'us10y';
        else if (parent.querySelector('.symbol').innerText.includes('USD/JPY')) chartKey = 'usdjpy';
        
        // Update active state
        parent.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        changeTimeframe(chartKey, tf);
    });
});

// Fungsi untuk menentukan market sentiment berdasarkan harga dan moving average
function determineSentiment(price, smaValue) {
    if (price > smaValue * 1.005) return 'bullish';
    if (price < smaValue * 0.995) return 'bearish';
    return 'sideways';
}

// Fetch real-time prices dari proxy server
async function fetchRealTimePrices() {
    try {
        const response = await fetch('http://localhost:3000/api/prices');
        const data = await response.json();
        
        // Update harga di UI
        document.getElementById('price-xauusd').innerHTML = `$${data.xauusd || 'N/A'}`;
        document.getElementById('price-dxy').innerHTML = data.dxy || 'N/A';
        document.getElementById('price-us10y').innerHTML = `${data.us10y || 'N/A'}%`;
        document.getElementById('price-usdjpy').innerHTML = data.usdjpy || 'N/A';
        document.getElementById('last-update').innerHTML = new Date(data.timestamp).toLocaleString('id-ID');
        
        // Simulate sentiment (akan lebih akurat dengan data real dari API)
        const sentiments = {
            xauusd: Math.random() > 0.6 ? 'bullish' : (Math.random() > 0.5 ? 'bearish' : 'sideways'),
            dxy: Math.random() > 0.6 ? 'bullish' : (Math.random() > 0.5 ? 'bearish' : 'sideways'),
            us10y: Math.random() > 0.6 ? 'bullish' : (Math.random() > 0.5 ? 'bearish' : 'sideways'),
            usdjpy: Math.random() > 0.6 ? 'bullish' : (Math.random() > 0.5 ? 'bearish' : 'sideways')
        };
        
        for (const [key, sentiment] of Object.entries(sentiments)) {
            const el = document.getElementById(`sentiment-${key}`);
            if (el) {
                el.className = `market-sentiment ${sentiment}`;
                el.innerHTML = sentiment.toUpperCase();
            }
        }
        
        return data;
    } catch (error) {
        console.error('Error fetching prices:', error);
        return null;
    }
}

// Fetch berita dari ForexFactory
async function fetchForexNews() {
    const container = document.getElementById('news-container');
    container.innerHTML = '<div class="loading">Loading news from ForexFactory...</div>';
    
    try {
        const response = await fetch('http://localhost:3000/api/news');
        const news = await response.json();
        
        if (news && news.length > 0) {
            let html = `
                <div class="news-table">
                    <table>
                        <thead>
                            <tr><th>Time</th><th>Currency</th><th>Impact</th><th>Event</th><th>Actual</th><th>Forecast</th><th>Previous</th></tr>
                        </thead>
                        <tbody>
            `;
            
            news.forEach(item => {
                let impactClass = '';
                if (item.impact && item.impact.includes('High')) impactClass = 'impact-high';
                else if (item.impact && item.impact.includes('Medium')) impactClass = 'impact-medium';
                else impactClass = 'impact-low';
                
                html += `
                    <tr>
                        <td>${item.time || '-'}</td>
                        <td>${item.currency || '-'}</td>
                        <td class="${impactClass}">${item.impact || '-'}</td>
                        <td>${item.event || '-'}</td>
                        <td>${item.actual || '-'}</td>
                        <td>${item.forecast || '-'}</td>
                        <td>${item.previous || '-'}</td>
                    </tr>
                `;
            });
            
            html += `</tbody></table></div>`;
            container.innerHTML = html;
        } else {
            container.innerHTML = '<div class="loading">No news data available. Please check proxy server connection.</div>';
        }
    } catch (error) {
        console.error('Error fetching news:', error);
        container.innerHTML = '<div class="loading">Error loading news. Make sure proxy server is running on port 3000.</div>';
    }
}

// Fetch data Barchart
async function fetchBarchartData() {
    const container = document.getElementById('barchart-data');
    
    try {
        const response = await fetch('http://localhost:3000/api/barchart');
        const data = await response.json();
        
        let html = `
            <div style="margin-bottom: 10px;">
                <strong>📊 Put/Call Vol Ratio:</strong> ${data.putCallRatio}
                <br>
                <span style="color: ${data.putCallRatio < 0.5 ? '#00c853' : (data.putCallRatio > 1.0 ? '#d32f2f' : '#ff9800')}">
                    ${data.putCallStatus}
                </span>
            </div>
            <div>
                <strong>⭐ Analyst Rating:</strong><br>
                ${data.analystRating.summary || 'N/A'}
            </div>
        `;
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error fetching Barchart data:', error);
        container.innerHTML = '<div class="loading">Error loading Barchart data. Make sure proxy server is running.</div>';
    }
}

// Auto-refresh data setiap 30 detik
function startAutoRefresh() {
    fetchRealTimePrices();
    fetchForexNews();
    fetchBarchartData();
    
    setInterval(() => {
        fetchRealTimePrices();
        fetchForexNews();
        fetchBarchartData();
    }, 30000);
}

// Initialize semua chart setelah DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    
    // Tunggu sebentar agar chart siap
    setTimeout(() => {
        startAutoRefresh();
    }, 2000);
});

// --- Fitur deteksi EQH & EQL ---
const tolerances = {
    xauusd: 0.8,
    drx: 3.0,
    us10y: 0.03,
    usdjpy: 0.08
};

function detectEqualLevels(values, tolerance) {
    const levels = [];
    const checked = new Array(values.length).fill(false);
    
    for (let i = 0; i < values.length; i++) {
        if (checked[i]) continue;
        
        let currentVal = values[i];
        let matches = [currentVal];
        
        for (let j = i + 1; j < values.length; j++) {
            if (!checked[j] && Math.abs(currentVal - values[j]) <= tolerance) {
                matches.push(values[j]);
                checked[j] = true;
            }
        }
        
        if (matches.length >= 2) {
            // Ambil nilai rata-rata dari level-level yang dianggap equal
            const avg = matches.reduce((sum, val) => sum + val, 0) / matches.length;
            levels.push(avg);
        }
    }
    return levels;
}

function drawEQHEQL(chart, data, instrument) {
    if (!chart || !data || data.length === 0) return;
    
    // Hapus semua garis EQH/EQL sebelumnya dari chart
    if (chart.eqhEqlLines) {
        chart.eqhEqlLines.forEach(line => {
            if (chart.removeSeries) {
                // Untuk Lightweight Charts
                chart.removeSeries(line);
            }
        });
    }
    chart.eqhEqlLines = []; // Simpan referensi garis baru
    
    // Dapatkan toleransi berdasarkan instrumen (default 0 jika tidak ditemukan)
    const tolerance = tolerances[instrument.toLowerCase()] || 0;
    
    // Ambil data high dan low
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    
    // Cari level equal
    const eqhLevels = detectEqualLevels(highs, tolerance);
    const eqlLevels = detectEqualLevels(lows, tolerance);
    
    const firstTime = data[0].time;
    const lastTime = data[data.length - 1].time;
    
    // Gambar garis (Menggunakan Lightweight Charts API: addLineSeries)
    if (chart.addLineSeries) {
        // Red untuk EQH
        eqhLevels.forEach(level => {
            const eqhSeries = chart.addLineSeries({
                color: 'red',
                lineWidth: 2,
                lineStyle: 1, 
                crosshairMarkerVisible: false,
                lastValueVisible: false,
                priceLineVisible: false
            });
            eqhSeries.setData([
                { time: firstTime, value: level },
                { time: lastTime, value: level }
            ]);
            chart.eqhEqlLines.push(eqhSeries);
        });

        // Green untuk EQL
        eqlLevels.forEach(level => {
            const eqlSeries = chart.addLineSeries({
                color: 'green',
                lineWidth: 2,
                lineStyle: 1,
                crosshairMarkerVisible: false,
                lastValueVisible: false,
                priceLineVisible: false
            });
            eqlSeries.setData([
                { time: firstTime, value: level },
                { time: lastTime, value: level }
            ]);
            chart.eqhEqlLines.push(eqlSeries);
        });
    }
    
    // CATATAN: Panggil fungsi ini setelah data chart pertama kali diinisialisasi
    // dan setiap kali ada penambahan data/update realtime untuk instrumen terkait.
}
// ---------------------------------