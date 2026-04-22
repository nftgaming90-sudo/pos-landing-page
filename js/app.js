import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const firebaseConfig = { 
    apiKey: "AIzaSyCLlFeBekEZzdtkeFvItwqMPa2jxrLleb4", 
    authDomain: "pos-keliling.firebaseapp.com", 
    projectId: "pos-keliling", 
    storageBucket: "pos-keliling.firebasestorage.app", 
    messagingSenderId: "379944511316", 
    appId: "1:379944511316:web:27f1fd19eb3f48c5d64ac1" 
};
const supabaseUrl = 'https://falswzbhwpwugjolretc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhbHN3emJod3B3dWdqb2xyZXRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NzU0MTcsImV4cCI6MjA5MDQ1MTQxN30.BpKmybIT-eeggCbuEbj8SSwvbq7eA7XCIu6Pc88xG1s';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
window.supabase = createClient(supabaseUrl, supabaseKey); // Pasang ke window agar bisa diakses file lain

// Variabel Global
window.db = null; 
window.masterData = []; 
window.currentUid = null;
window.userEmail = "";
window.fonnteToken = "";
window.waOwner = "";
window.isPro = false;
window.kasirAktif = false;
window.shiftAktifId = null; 
window.cart = [];
window.cartKulakan = []; 
window.currentReportFilter = 'hari_ini';
window.currentCustomDate = '';
window.currentCategoryFilter = "Semua";

const FREE_ITEM_LIMIT = 20; 

// Queue Offline
window.offlineQueue = JSON.parse(localStorage.getItem('offlineQueue')) || {
    barang: [], transaksi: [], transaksi_detail: [], pelanggan: [],
    supplier: [], pembelian: [], pembelian_detail: [], sync_log: []
};

// Cek Auth Firebase
onAuthStateChanged(auth, async (user) => {
    if (user) { 
        await setPersistence(auth, browserLocalPersistence);
        window.currentUid = user.uid; 
        window.userEmail = user.email;
        document.getElementById('user-email').innerText = user.email; 
        
        await window.checkProStatus(user.uid);
        window.loadShiftState();

        window.cart = JSON.parse(localStorage.getItem(`poskita_cart_${user.uid}`)) || [];
        
        let q = JSON.parse(localStorage.getItem(`poskita_offline_queue_${user.uid}`));
        window.offlineQueue = {
            barang: q?.barang || [], transaksi: q?.transaksi || [], pelanggan: q?.pelanggan || [],
            hutang: q?.hutang || [], cicilan: q?.cicilan || [], hapus_barang: q?.hapus_barang || [],
            hapus_transaksi: q?.hapus_transaksi || [], shift: q?.shift || []
        };
        
        await window.startAutoSync(); 
        window.renderCart();
    } else {
        if (!window.location.pathname.endsWith('index.html') && !window.location.pathname.endsWith('/')) {
            window.location.replace("index.html"); 
        }
    }
});

// Logout Listener
const btnKeluar = document.getElementById('btn-logout');
if (btnKeluar) {
    btnKeluar.onclick = async () => {
        const pendingCount = (window.offlineQueue?.barang?.length || 0) + 
                           (window.offlineQueue?.transaksi?.length || 0) + 
                           (window.offlineQueue?.shift?.length || 0);
        
        if (pendingCount > 0) return alert(`⚠️ TIDAK BISA KELUAR!\nMasih ada ${pendingCount} data yang belum sinkron ke Cloud.`);
        if (window.kasirAktif) return alert("⚠️ KASIR MASIH BUKA!\nTutup kasir dulu sebelum keluar.");

        if (confirm("Yakin ingin keluar?")) {
            try {
                await signOut(auth);
                window.db = null; window.currentUid = null; window.masterData = [];
                window.location.replace("index.html");
            } catch (err) { console.error("Logout error:", err); }
        }
    };
}

// Handle tombol Back HP
window.addEventListener('popstate', (e) => {
    document.getElementById('kulakan-section')?.classList.remove('active');
});

// Mencegat tombol Back bawaan HP
    window.addEventListener('popstate', (event) => {
        const cartSection = document.getElementById('cart-section');
        
        // Jika keranjang sedang terbuka (punya class 'active')
        if (cartSection.classList.contains('active')) {
            // Tutup keranjangnya tanpa memicu history.back() lagi
            cartSection.classList.remove('active');
        }
    });