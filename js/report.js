 window.setReportFilter = (type, dateVal = null) => {
        const badgePro = document.getElementById('badge-pro-custom');
        if (badgePro) {
            if (window.isPro) {
                badgePro.classList.add('hidden');
            } else {
                badgePro.classList.remove('hidden');
            }
        }

        if (!window.isPro && type === 'custom') {
            const inputDate = document.getElementById('input-date-custom');
            if(inputDate) inputDate.value = ''; 
            return window.showUpgradeModal("Fitur filter tanggal (Custom Date) hanya tersedia untuk langganan PRO.");
        }

        document.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.remove('bg-blue-600', 'text-white', 'shadow-md');
            b.classList.add('bg-white', 'text-slate-600', 'border', 'border-slate-200');
        });
        
        const activeBtn = document.getElementById(`btn-filter-${type.replace('_','-')}`);
        if(activeBtn) {
            activeBtn.classList.remove('bg-white', 'text-slate-600', 'border', 'border-slate-200');
            activeBtn.classList.add('bg-blue-600', 'text-white', 'shadow-md');
        }

        const labelCustom = document.getElementById('label-filter-custom');
        if (type === 'custom' && dateVal) {
            window.currentCustomDate = dateVal;
            const parts = dateVal.split('-');
            if (parts.length === 3 && labelCustom) {
                labelCustom.innerText = `📅 ${parts[2]}/${parts[1]}/${parts[0]}`;
            }
        } else if (labelCustom) {
            labelCustom.innerText = "📅 Pilih Tanggal";
        }

        window.currentReportFilter = type;
        window.updateReports();
    };

    window.updateReports = () => {
    if (!window.db) return;
    
    let startMs = 0;
    let endMs = Date.now() + 86400000; 
    const now = new Date();
    let labelTabel = "History Transaksi";
    
    if (window.currentReportFilter === 'hari_ini') {
        // Set ke jam 00:00:00 hari ini
        startMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        // Set ke jam 23:59:59 hari ini
        endMs = startMs + 86399999;
        labelTabel = "Transaksi Hari Ini";
    } 
    else if (window.currentReportFilter === 'kemarin') {
        const kemarin = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        startMs = kemarin.getTime();
        endMs = startMs + 86399999;
        labelTabel = "Transaksi Kemarin";
    } 
    else if (window.currentReportFilter === 'custom' && window.currentCustomDate) {
        const [y, m, d] = window.currentCustomDate.split('-');
        startMs = new Date(y, m - 1, d).getTime();
        endMs = startMs + 86399999;
        labelTabel = `Transaksi tgl ${d}/${m}/${y}`;
    }

    document.getElementById('tabel-judul-rekap').innerText = labelTabel;

    const searchInput = document.getElementById('search-nota');
    const keyword = searchInput ? searchInput.value.trim() : '';
    let keywordFilter = '';
    if (keyword) {
        // Gunakan LIKE agar pencarian nota lebih fleksibel
        keywordFilter = `AND CAST(t.id AS TEXT) LIKE '%${keyword}%'`;
    }

    try {
        const query = `
    SELECT t.tanggal, t.total, t.laba, t.id, SUM(td.qty) as total_item, t.metode_bayar, p.nama
    FROM transaksi t 
    LEFT JOIN transaksi_detail td ON t.id = td.transaksi_id 
    LEFT JOIN pelanggan p ON t.pelanggan_id = p.id
    WHERE CAST(t.tanggal AS UNSIGNED) >= ${startMs} 
      AND CAST(t.tanggal AS UNSIGNED) <= ${endMs} 
      ${keywordFilter}
    GROUP BY t.id 
    ORDER BY CAST(t.tanggal AS UNSIGNED) DESC
`;
        
        const res = window.db.exec(query);
        
        let omzet = 0, laba = 0, countTrx = 0;
        let totalTunaiHariIni = 0; 
        let totalDigitalHariIni = 0; // Tambahan penampung untuk QRIS/Transfer
        const hBody = document.getElementById('history-body');
        
        if (res.length > 0 && res[0].values.length > 0) {
            countTrx = res[0].values.length;
            hBody.innerHTML = res[0].values.map(row => {
                const tglRaw = row[0];
                const totalBelanja = row[1];
                const profit = row[2];
                const trxId = row[3];
                const totalItem = row[4] || 0; 
                const metode = row[5] || 'Tunai';
                const namaPelanggan = row[6] || 'Umum';
                const notaStr = trxId.toString().slice(-6); 

                omzet += totalBelanja; 
                laba += profit;
                
                // --- LOGIKA PEMISAHAN KAS vs DIGITAL ---
                if (metode === 'Tunai') {
                    totalTunaiHariIni += totalBelanja;
                } else if (metode === 'QRIS' || metode === 'Transfer') {
                    totalDigitalHariIni += totalBelanja;
                }
                
                // --- DESAIN BADGE METODE BAYAR ---
                let badgeClass = 'bg-emerald-100 text-emerald-600 border-emerald-200';
                let iconMetode = '💵 Tunai';
                
                if (metode === 'Hutang') {
                    badgeClass = 'bg-amber-100 text-amber-600 border-amber-200';
                    iconMetode = '📒 Hutang';
                } else if (metode === 'QRIS' || metode === 'Transfer') {
                    badgeClass = 'bg-violet-100 text-violet-600 border-violet-200';
                    iconMetode = '📱 ' + metode;
                }

                const d = new Date(parseInt(tglRaw));
                
                return `
                <tr class="tr-item hover:bg-slate-100 cursor-pointer transition-colors border-b border-slate-50" 
                    onclick="window.bukaDetailTransaksi('${trxId}')">
                    <td class="p-3 pl-4 whitespace-nowrap">
                        <div class="flex items-center gap-2 mb-1">
                            <p class="text-slate-800 font-black text-[10px] md:text-xs uppercase">NOTA #${notaStr}</p>
                            <span class="px-1.5 py-0.5 rounded border text-[7px] font-black uppercase tracking-tighter ${badgeClass}">
                                ${iconMetode}
                            </span>
                        </div>
                        <p class="text-[9px] text-blue-600 font-bold uppercase tracking-tighter mb-1">👤 ${namaPelanggan}</p> 
                        <p class="text-[8px] md:text-[9px] text-slate-400 font-medium">
                            ${d.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})} • ${d.toLocaleDateString('id-ID', {day:'numeric', month:'short'})}
                        </p>
                    </td>
                    <td class="p-3 text-center whitespace-nowrap">
                        <span class="bg-blue-50 border border-blue-100 text-blue-600 px-2.5 py-1 rounded-lg text-[9px] md:text-[10px] font-black">${totalItem} Item</span>
                    </td>
                    <td class="p-3 pr-4 text-right whitespace-nowrap">
                        <p class="font-black text-slate-800 text-[10px] md:text-xs">Rp ${totalBelanja.toLocaleString('id-ID')}</p>
                        <p class="text-[8px] md:text-[9px] text-emerald-500 font-black mt-0.5">+Rp ${profit.toLocaleString('id-ID')}</p>
                    </td>
                </tr>`;
            }).join('');
        } else {
            hBody.innerHTML = `<tr><td colspan="3" class="p-8 md:p-10 text-center text-slate-400 text-[10px] md:text-xs italic font-medium"><div class="text-2xl md:text-3xl mb-2 grayscale opacity-40">📭</div>Tidak ada transaksi.</td></tr>`;
        }

        // Update UI Omzet, Laba, Jumlah Trx
        document.getElementById('stat-omzet').innerText = "Rp " + omzet.toLocaleString('id-ID');
        document.getElementById('stat-laba').innerText = "Rp " + laba.toLocaleString('id-ID');
        document.getElementById('tabel-count-rekap').innerText = countTrx + " Trx";

        // ==========================================
        // LOGIKA KAS FISIK & DIGITAL
        // ==========================================
        let totalKasFisik = totalTunaiHariIni;

        // Ambil Uang Masuk dari Pembayaran Cicilan / DP hari ini (diasumsikan masuk kas fisik/laci)
        const queryCicilan = `
            SELECT SUM(jumlah) FROM cicilan 
            WHERE CAST(tanggal AS UNSIGNED) >= ${startMs} 
              AND CAST(tanggal AS UNSIGNED) <= ${endMs}
        `;
        const resCicilan = window.db.exec(queryCicilan);
        if (resCicilan.length > 0 && resCicilan[0].values[0][0]) {
            totalKasFisik += resCicilan[0].values[0][0]; 
        }

        // Update UI Kotak Kas (Laci)
        const statKasEl = document.getElementById('stat-kas');
        if (statKasEl) {
            statKasEl.innerText = `Rp ${totalKasFisik.toLocaleString('id-ID')}`;
        }

        // Update UI Kotak Saldo Digital
        const statDigitalEl = document.getElementById('stat-digital');
        if (statDigitalEl) {
            statDigitalEl.innerText = `Rp ${totalDigitalHariIni.toLocaleString('id-ID')}`;
        }
        // ==========================================
        
    } catch (e) {
        console.error("Error Load Laporan:", e);
    }
};

 window.printStruk = (trxId) => {
    const numTrxId = Number(trxId);
    const resInfo = window.db.exec("SELECT tanggal, total, metode_bayar FROM transaksi WHERE id = ?", [numTrxId]);
    if (resInfo.length === 0) return;
    
    const resDetail = window.db.exec("SELECT b.nama, td.qty, td.harga FROM transaksi_detail td LEFT JOIN barang b ON td.barang_id = b.id WHERE td.transaksi_id = ?", [numTrxId]);
    
    let userDisplay = document.getElementById('user-email').innerText.split('@')[0].toUpperCase();
    let dateDisplay = document.getElementById('detail-waktu').innerText;
    let totalDisplay = document.getElementById('detail-total').innerText.replace('Rp ', '');

    let html = `
        <div style="text-align:center; font-weight:bold; margin-bottom:5px; font-size:14px;">POSKITA STORE</div>
        <div style="text-align:center; font-size:10px; margin-bottom:5px;">Kasir: ${userDisplay}</div>
        <div style="font-size:10px; border-bottom:1px dashed #000; padding-bottom:5px; margin-bottom:5px;">
            Tgl: ${dateDisplay}<br>
            Trx: #${numTrxId.toString().slice(-6)}
        </div>
        <table style="width:100%; font-size:10px; margin-bottom:5px; border-collapse:collapse;">
    `;
    
    if (resDetail.length > 0) {
        resDetail[0].values.forEach(row => {
            let nama = row[0] || 'Barang Terhapus';
            let qty = row[1];
            let harga = row[2];
            let subtotal = qty * harga;
            html += `
                <tr><td colspan="2" style="padding:2px 0; font-weight:bold;">${nama.toUpperCase()}</td></tr>
                <tr>
                    <td style="padding:2px 0; color:#444;">${qty} x ${harga.toLocaleString('id-ID')}</td>
                    <td style="text-align:right; padding:2px 0;">${subtotal.toLocaleString('id-ID')}</td>
                </tr>
            `;
        });
    }

    html += `
        </table>
        <div style="border-top:1px dashed #000; padding-top:5px; margin-top:5px; display:flex; justify-content:space-between; font-weight:bold; font-size:12px;">
            <span>TOTAL</span>
            <span>Rp ${totalDisplay}</span>
        </div>
        <div style="text-align:center; font-size:10px; margin-top:15px; font-style:italic;">-- Terima Kasih --</div>
    `;
    
    document.getElementById('section-struk').innerHTML = html;
    window.print();
};

 window.printRekap = async (mode = 'print') => {
            if (!window.db) return;

let startMs = 0;
const now = new Date();
let labelTabel = "REKAPAN PENJUALAN";
let subLabelTanggal = ""; 

if (window.currentReportFilter === 'hari_ini') {
    startMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    labelTabel = "REKAP BARANG HARI INI";
    subLabelTanggal = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
} 
else if (window.currentReportFilter === 'kemarin') {
    const kemarin = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    startMs = kemarin.getTime();
    labelTabel = "REKAP BARANG KEMARIN";
    subLabelTanggal = kemarin.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
} 
else if (window.currentReportFilter === 'custom' && window.currentCustomDate) {
    const [y, m, d] = window.currentCustomDate.split('-');
    startMs = new Date(y, m - 1, d).getTime();
    labelTabel = `REKAP TGL ${d}/${m}/${y}`;
    subLabelTanggal = "";
}
            const endMs = startMs + 86399999;

            const queryBarang = `SELECT b.nama, SUM(td.qty), SUM(td.qty * td.harga) FROM transaksi_detail td LEFT JOIN barang b ON td.barang_id = b.id JOIN transaksi t ON td.transaksi_id = t.id WHERE CAST(t.tanggal AS UNSIGNED) >= ${startMs} AND CAST(t.tanggal AS UNSIGNED) <= ${endMs} GROUP BY td.barang_id ORDER BY SUM(td.qty) DESC`;
            const queryTotal = `SELECT SUM(total), SUM(laba), COUNT(id) FROM transaksi WHERE CAST(tanggal AS UNSIGNED) >= ${startMs} AND CAST(tanggal AS UNSIGNED) <= ${endMs}`;

            const resBarang = window.db.exec(queryBarang);
            const resTotal = window.db.exec(queryTotal);
            let omzet = 0, laba = 0, countTrx = 0;
            if (resTotal.length > 0 && resTotal[0].values[0][0] !== null) {
                omzet = resTotal[0].values[0][0]; laba = resTotal[0].values[0][1]; countTrx = resTotal[0].values[0][2];
            }

if (mode === 'print') {
    let itemsHtml = '';
    if (resBarang.length > 0) {
        resBarang[0].values.forEach(row => {
            itemsHtml += `
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span style="flex:1; padding-right:5px;">${(row[0] || "Dihapus").toUpperCase()}</span>
                    <span style="width:30px; text-align:right;">${row[1]}x</span>
                    <span style="width:70px; text-align:right;">${row[2].toLocaleString('id-ID')}</span>
                </div>`;
        });
    }

    const strukContent = `
        <div style="width:58mm; padding:2mm; font-family:monospace; color:#000;">
            <div style="text-align:center; font-weight:bold; font-size:14px;">POSKITA STORE</div>
            <div style="text-align:center; font-size:10px; margin-bottom:5px;">${labelTabel}</div>
            ${subLabelTanggal ? `<div style="text-align:center; font-size:9px; margin-bottom:5px;">${subLabelTanggal}</div>` : ''}
            <div style="border-bottom:1px dashed #000; margin:5px 0;"></div>
            ${itemsHtml}
            <div style="border-top:1px dashed #000; margin:5px 0; padding-top:5px;"></div>
            <div style="display:flex; justify-content:space-between; font-weight:bold;">
                <span>TOTAL</span>
                <span>Rp ${omzet.toLocaleString('id-ID')}</span>
            </div>
            <div style="text-align:center; margin-top:10px; font-size:9px;">-- Selesai --</div>
        </div>
    `;

    const printArea = document.getElementById('section-struk');
    printArea.innerHTML = strukContent;
    
    // Kasih jeda sedikit biar browser selesai render HTML baru panggil print
    setTimeout(() => {
        window.print();
    }, 250);
    return;
}

            // --- MODE PREVIEW GAMBAR ---
            if (mode === 'preview_image') {
                let itemsHtml = '';
                if (resBarang.length > 0) {
                    resBarang[0].values.forEach(row => {
                        itemsHtml += `<div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:11px;"><span style="flex:1; text-align:left;">${(row[0] || "Dihapus").toUpperCase()}</span><span style="width:35px; text-align:right; font-weight:bold;">${row[1]}x</span><span style="width:75px; text-align:right;">${row[2].toLocaleString('id-ID')}</span></div>`;
                    });
                }

                let htmlContent = `
                    <div id="wrapper-preview-rekap" class="flex flex-col items-center gap-4 w-full max-w-[320px]">
                        <div id="struk-rekap-capture" style="width:300px; background:#fff; padding:25px; color:#000; font-family:monospace; border-radius:8px;">
                            <div style="text-align:center; font-weight:900; font-size:16px;">POSKITA STORE</div>
                            <div style="text-align:center; font-size:11px; font-weight:bold;">${labelTabel}</div>
                            ${subLabelTanggal ? `<div style="text-align:center; font-size:10px; color:#444;">(${subLabelTanggal})</div>` : ''}
                            <div style="border-bottom:2px dashed #000; margin:10px 0;"></div>
                            ${itemsHtml}
                            <div style="border-top:2px dashed #000; margin:10px 0; padding-top:10px;"></div>
                            <div style="display:flex; justify-content:space-between; font-size:11px;"><span>Total Trx:</span><b>${countTrx} Nota</b></div>
                            <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:900;"><span>TOTAL OMZET:</span><span>Rp ${omzet.toLocaleString('id-ID')}</span></div>
                            <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:900; color:#059669;"><span>LABA BERSIH:</span><span>Rp ${laba.toLocaleString('id-ID')}</span></div>
                            <div style="text-align:center; font-size:9px; margin-top:15px; color:#666; font-style:italic;">Dicetak: ${new Date().toLocaleString('id-ID')}</div>
                        </div>

                        <div class="flex flex-col gap-2 w-full px-4 no-capture">
                            <button id="btn-share-rekap" class="w-full py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2">
                                <span>📲</span> Bagikan Gambar (WA/Lainnya)
                            </button>
                            
                            <div class="grid grid-cols-2 gap-2">
                                <button id="btn-do-capture" class="py-2.5 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest">💾 Simpan Galeri</button>
                                <button id="btn-do-wa" class="py-2.5 bg-slate-700 text-white rounded-xl font-black text-[9px] uppercase tracking-widest">💬 Kirim Teks WA</button>
                            </div>
                            
                            <button onclick="document.getElementById('section-struk').classList.remove('show-capture')" class="w-full py-2 text-white/60 font-bold text-[9px] uppercase tracking-widest">Batal / Tutup</button>
                        </div>
                    </div>
                `;

                const printArea = document.getElementById('section-struk');
                printArea.innerHTML = htmlContent;
                printArea.classList.add('show-capture');

                // 1. Logika Tombol Bagikan (Share API)
document.getElementById('btn-share-rekap').onclick = async () => {
    const btn = document.getElementById('btn-share-rekap');
    const originalText = btn.innerHTML;
    btn.innerText = "MENYIAPKAN...";
    
    try {
        const area = document.getElementById('struk-rekap-capture');
        // Render element HTML rekap menjadi gambar
        const canvas = await html2canvas(area, { scale: 2, backgroundColor: "#ffffff" });
        
        canvas.toBlob(async (blob) => {
            const fileName = `Rekap-${window.currentReportFilter}-${Date.now()}.png`;
            const file = new File([blob], fileName, { type: "image/png" });

            // Cek apakah browser support berbagi file (terutama di HP)
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Rekap Penjualan LabaGo',
                    text: `Laporan Rekap: ${labelTabel}`
                });
            } else {
                // Jika di Desktop (tidak support share), otomatis download saja
                const link = document.createElement('a');
                link.download = fileName;
                link.href = canvas.toDataURL("image/png");
                link.click();
                alert("Browser tidak mendukung share langsung. Gambar telah diunduh.");
            }
            btn.innerHTML = originalText;
        }, 'image/png');
    } catch (err) {
        console.error(err);
        btn.innerHTML = originalText;
        alert("Gagal memproses gambar.");
    }
};

                // Fungsi Simpan Gambar
                // Di dalam window.printRekap
document.getElementById('btn-do-capture').onclick = async () => {
    const btn = document.getElementById('btn-do-capture');
    const oriText = btn.innerText;
    btn.innerText = "PROSES...";
    try {
        const area = document.getElementById('struk-rekap-capture');
        const canvas = await html2canvas(area, { scale: 2, backgroundColor: "#ffffff" });
        
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `Rekap-${Date.now()}.png`;
            link.href = url;
            document.body.appendChild(link); // WAJIB ADA UNTUK HP
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            document.getElementById('section-struk').classList.remove('show-capture');
            alert("Gambar rekap berhasil disimpan!");
        }, 'image/png');
    } catch (err) {
        console.error("Gagal capture:", err);
        alert("Gagal memproses gambar. Pastikan browser mendukung.");
    } finally {
        btn.innerText = oriText;
    }
};

                // Fungsi Kirim WA Teks (Format Struk Thermal)
                document.getElementById('btn-do-wa').onclick = () => {
                    const separator = "--------------------------------";
                    let pesan = `*POSKITA STORE*\n`;
                    pesan += `*${labelTabel}*\n`;
                    if (subLabelTanggal) pesan += `_Tanggal: ${subLabelTanggal}_\n`;
                    pesan += `${separator}\n`;
                    
                    if (resBarang.length > 0) {
                        resBarang[0].values.forEach(r => { 
                            const nama = (r[0] || "Barang").toUpperCase();
                            const qty = r[1];
                            const subtotal = r[2].toLocaleString('id-ID');
                            
                            pesan += `*${nama}*\n`;
                            pesan += `${qty}x`.padEnd(5, ' ') + ` ................. `.padEnd(10, ' ') + `*${subtotal}*\n`;
                        });
                    }
                    
                    pesan += `${separator}\n`;
                    pesan += `🛍️ Total: *${countTrx} Transaksi*\n`;
                    pesan += `💰 *OMZET: Rp ${omzet.toLocaleString('id-ID')}*\n`;
                    pesan += `📈 *LABA : Rp ${laba.toLocaleString('id-ID')}*\n`;
                    pesan += `${separator}\n`;
                    pesan += `_Dicetak: ${new Date().toLocaleString('id-ID')}_`;
                    
                    // --- PROSES PEMBERSIHAN NOMOR WA ---
                    let cleanNumber = window.waOwner.replace(/[^0-9]/g, '');
                    if (cleanNumber.startsWith('0')) {
                        cleanNumber = '62' + cleanNumber.slice(1);
                    }
                    
                    window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(pesan)}`, '_blank');
                    printArea.classList.remove('show-capture');
                };
            }
        };

        window.printStrukHutangPerNota = (hutangId) => {
    if (!window.db) return;

    // 1. Ambil Data Hutang & Pelanggan
    const resH = window.db.exec(`
        SELECT h.transaksi_id, h.total, h.sisa, h.tanggal, p.nama, p.hp 
        FROM hutang h 
        JOIN pelanggan p ON h.pelanggan_id = p.id 
        WHERE h.id = ?`, [hutangId]);

    if (resH.length === 0) return alert("Data tidak ditemukan!");
    const [tId, hTotal, hSisa, hTglMs, pNama, pHp] = resH[0].values[0];

    // 2. Ambil Rincian Barang
    const resDet = window.db.exec(`
        SELECT b.nama, td.qty, td.harga 
        FROM transaksi_detail td 
        LEFT JOIN barang b ON td.barang_id = b.id 
        WHERE td.transaksi_id = ?`, [tId]);

    // 3. Ambil Riwayat Cicilan
    const resCicil = window.db.exec(`
        SELECT jumlah, tanggal 
        FROM cicilan 
        WHERE hutang_id = ? 
        ORDER BY CAST(tanggal AS UNSIGNED) ASC`, [hutangId]);

    const tglPinjam = new Date(parseInt(hTglMs)).toLocaleString('id-ID', {dateStyle:'medium'});
    const tglCetak = new Date().toLocaleString('id-ID', {dateStyle:'medium', timeStyle:'short'});

    // --- RENDER HTML STRUK ---
    let html = `
        <div style="text-align:center; font-family:monospace; color:#000; width:58mm; padding:2mm;">
            <div style="font-weight:bold; font-size:14px;">${window.namaToko || 'POSKITA'}</div>
            <div style="font-size:11px; margin-bottom:5px;">STRUK TAGIHAN HUTANG</div>
            <div style="border-bottom:1px dashed #000; margin:5px 0;"></div>
            
            <div style="text-align:left; font-size:10px;">
                Pelanggan : ${pNama.toUpperCase()}<br>
                WhatsApp  : ${pHp || '-'}<br>
                Tgl Pinjam: ${tglPinjam}<br>
                Nota Asli : #${tId.toString().slice(-6)}
            </div>
            
            <div style="border-bottom:1px dashed #000; margin:5px 0;"></div>
            <div style="text-align:left; font-size:9px; font-weight:bold; margin-bottom:3px;">RINCIAN BARANG:</div>
    `;

    // Barang
    if (resDet.length > 0) {
        resDet[0].values.forEach(row => {
            html += `<div style="display:flex; justify-content:space-between; font-size:9px;">
                <span>${row[1]}x ${row[0]}</span>
                <span>${(row[1]*row[2]).toLocaleString('id-ID')}</span>
            </div>`;
        });
    }

    html += `<div style="text-align:right; font-size:10px; font-weight:bold; margin-top:3px;">Total Awal: Rp ${hTotal.toLocaleString('id-ID')}</div>`;
    html += `<div style="border-bottom:1px dashed #000; margin:5px 0;"></div>`;

    // Riwayat Cicilan
    if (resCicil.length > 0) {
        html += `<div style="text-align:left; font-size:9px; font-weight:bold; margin-bottom:3px;">RIWAYAT BAYAR:</div>`;
        resCicil[0].values.forEach(c => {
            const tglC = new Date(parseInt(c[1])).toLocaleDateString('id-ID', {day:'2-digit', month:'2-digit'});
            html += `<div style="display:flex; justify-content:space-between; font-size:9px;">
                <span>- ${tglC}</span>
                <span>(${c[0].toLocaleString('id-ID')})</span>
            </div>`;
        });
        html += `<div style="border-bottom:1px dashed #000; margin:5px 0;"></div>`;
    }

    // Grand Total Sisa
    html += `
            <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:bold; margin-top:5px;">
                <span>SISA HUTANG:</span>
                <span>Rp ${hSisa.toLocaleString('id-ID')}</span>
            </div>
            
            <div style="border-top:1px dashed #000; margin:10px 0 5px 0;"></div>
            <div style="font-size:8px; font-style:italic;">Dicetak pada: ${tglCetak}</div>
            <div style="font-size:9px; margin-top:10px;">-- Harap Segera Dilunasi --</div>
        </div>
    `;

    document.getElementById('section-struk').innerHTML = html;
    window.print();
};

window.printStruk = (trxId) => {
    const numTrxId = Number(trxId);
    const resInfo = window.db.exec("SELECT tanggal, total, metode_bayar FROM transaksi WHERE id = ?", [numTrxId]);
    if (resInfo.length === 0) return;
    
    const resDetail = window.db.exec("SELECT b.nama, td.qty, td.harga FROM transaksi_detail td LEFT JOIN barang b ON td.barang_id = b.id WHERE td.transaksi_id = ?", [numTrxId]);
    
    let userDisplay = document.getElementById('user-email').innerText.split('@')[0].toUpperCase();
    let dateDisplay = document.getElementById('detail-waktu').innerText;
    let totalDisplay = document.getElementById('detail-total').innerText.replace('Rp ', '');

    let html = `
        <div style="text-align:center; font-weight:bold; margin-bottom:5px; font-size:14px;">POSKITA STORE</div>
        <div style="text-align:center; font-size:10px; margin-bottom:5px;">Kasir: ${userDisplay}</div>
        <div style="font-size:10px; border-bottom:1px dashed #000; padding-bottom:5px; margin-bottom:5px;">
            Tgl: ${dateDisplay}<br>
            Trx: #${numTrxId.toString().slice(-6)}
        </div>
        <table style="width:100%; font-size:10px; margin-bottom:5px; border-collapse:collapse;">
    `;
    
    if (resDetail.length > 0) {
        resDetail[0].values.forEach(row => {
            let nama = row[0] || 'Barang Terhapus';
            let qty = row[1];
            let harga = row[2];
            let subtotal = qty * harga;
            html += `
                <tr><td colspan="2" style="padding:2px 0; font-weight:bold;">${nama.toUpperCase()}</td></tr>
                <tr>
                    <td style="padding:2px 0; color:#444;">${qty} x ${harga.toLocaleString('id-ID')}</td>
                    <td style="text-align:right; padding:2px 0;">${subtotal.toLocaleString('id-ID')}</td>
                </tr>
            `;
        });
    }

    html += `
        </table>
        <div style="border-top:1px dashed #000; padding-top:5px; margin-top:5px; display:flex; justify-content:space-between; font-weight:bold; font-size:12px;">
            <span>TOTAL</span>
            <span>Rp ${totalDisplay}</span>
        </div>
        <div style="text-align:center; font-size:10px; margin-top:15px; font-style:italic;">-- Terima Kasih --</div>
    `;
    
    document.getElementById('section-struk').innerHTML = html;
    window.print();
};

window.previewNotaImage = (trxId) => {
    const resInfo = window.db.exec("SELECT tanggal, total, metode_bayar, pelanggan_id FROM transaksi WHERE id = ?", [trxId]);
    if (resInfo.length === 0) return;
    const info = resInfo[0].values[0];
    
    const resDetail = window.db.exec("SELECT b.nama, td.qty, td.harga FROM transaksi_detail td LEFT JOIN barang b ON td.barang_id = b.id WHERE td.transaksi_id = ?", [trxId]);
    
    let itemsHtml = '';
    if (resDetail.length > 0) {
        resDetail[0].values.forEach(row => {
            const sub = row[1] * row[2];
            itemsHtml += `
                <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:11px;">
                    <span style="flex:1; text-align:left;">${(row[0] || "Barang").toUpperCase()}</span>
                    <span style="width:35px; text-align:right;">${row[1]}x</span>
                    <span style="width:75px; text-align:right;">${sub.toLocaleString('id-ID')}</span>
                </div>`;
        });
    }

    const d = new Date(parseInt(info[0]));
    const tglStr = d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

    // Ambil nama pelanggan untuk tampilan gambar
    let namaPlg = "UMUM";
    if (info[3]) {
        const resP = window.db.exec("SELECT nama FROM pelanggan WHERE id = ?", [info[3]]);
        if(resP.length > 0) namaPlg = resP[0].values[0][0];
    }

    let htmlContent = `
        <div id="wrapper-preview-rekap" class="flex flex-col items-center gap-4 w-full max-w-[320px]">
            <div id="struk-rekap-capture" style="width:300px; background:#fff; padding:25px; color:#000; font-family:monospace; border-radius:8px;">
                <div style="text-align:center; font-weight:900; font-size:16px;">POSKITA STORE</div>
                <div style="text-align:center; font-size:10px; margin-bottom:10px;">NOTA #${trxId.toString().slice(-6)}</div>
                
                <div style="font-size:9px; margin-bottom:2px;">Tgl: ${tglStr}</div>
                <div style="font-size:9px; margin-bottom:2px;">Pelanggan: ${namaPlg.toUpperCase()}</div>
                <div style="font-size:9px; margin-bottom:10px;">Metode: ${info[2] === 'Hutang' ? '📒 HUTANG' : '💵 TUNAI'}</div>
                
                <div style="border-bottom:2px dashed #000; margin:10px 0;"></div>
                ${itemsHtml}
                <div style="border-top:2px dashed #000; margin:10px 0; padding-top:10px;"></div>
                
                <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:900;">
                    <span>TOTAL:</span>
                    <span>Rp ${info[1].toLocaleString('id-ID')}</span>
                </div>
                <div style="text-align:center; font-size:10px; margin-top:20px; font-style:italic;">-- Terima Kasih --</div>
            </div>

            <div class="flex flex-col gap-2 w-full px-4 no-capture">
                <button id="btn-share-nota" class="w-full py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2">
                    <span>📲</span> Bagikan ke WhatsApp
                </button>
                <div class="grid grid-cols-2 gap-2">
                    <button id="btn-do-capture-nota" class="py-2 bg-slate-700 text-white rounded-xl font-black text-[9px] uppercase tracking-widest">💾 Simpan Galeri</button>
                    <button onclick="document.getElementById('section-struk').classList.remove('show-capture')" class="py-2 bg-rose-100 text-rose-600 rounded-xl font-black text-[9px] uppercase tracking-widest">Tutup</button>
                </div>
            </div>
        </div>
    `;

    const printArea = document.getElementById('section-struk');
    printArea.innerHTML = htmlContent;
    printArea.classList.add('show-capture');

    // LOGIC SHARE NYA MAS
    document.getElementById('btn-share-nota').onclick = async () => {
        const btn = document.getElementById('btn-share-nota');
        const originalText = btn.innerHTML;
        btn.innerText = "MENYIAPKAN...";
        try {
            const area = document.getElementById('struk-rekap-capture');
            const canvas = await html2canvas(area, { scale: 2, backgroundColor: "#ffffff" });
            canvas.toBlob(async (blob) => {
                const fileName = `Nota-${trxId.toString().slice(-6)}.png`;
                const file = new File([blob], fileName, { type: "image/png" });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], title: 'Struk PosKita', text: 'Terima kasih telah berbelanja!' });
                } else {
                    const link = document.createElement('a');
                    link.download = fileName; link.href = canvas.toDataURL("image/png"); link.click();
                    alert("Gambar disimpan ke galeri.");
                }
                btn.innerHTML = originalText;
            }, 'image/png');
        } catch (err) { btn.innerHTML = originalText; alert("Gagal proses gambar."); }
    };

    // Di dalam window.previewNotaImage
document.getElementById('btn-do-capture-nota').onclick = async () => {
    const btn = document.getElementById('btn-do-capture-nota');
    const oriText = btn.innerText;
    btn.innerText = "PROSES...";
    try {
        const area = document.getElementById('struk-rekap-capture');
        const canvas = await html2canvas(area, { scale: 2, backgroundColor: "#ffffff" });
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `Nota-${Number(trxId).toString().slice(-6)}.png`;
            link.href = url;
            document.body.appendChild(link); // WAJIB ADA UNTUK HP
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            alert("Gambar nota berhasil disimpan!");
        }, 'image/png');
    } catch (err) {
        alert("Gagal menyimpan gambar.");
    } finally {
        btn.innerText = oriText;
    }
};
};

window.previewHutangImage = (hutangId) => {
    if (!window.db) return;

    // 1. Ambil Data Hutang & Pelanggan
    const resH = window.db.exec(`
        SELECT h.transaksi_id, h.total, h.sisa, h.tanggal, p.nama, p.hp 
        FROM hutang h 
        JOIN pelanggan p ON h.pelanggan_id = p.id 
        WHERE h.id = ?`, [hutangId]);

    if (resH.length === 0) return alert("Data tidak ditemukan!");
    const [tId, hTotal, hSisa, hTglMs, pNama, pHp] = resH[0].values[0];

    // 2. Ambil Rincian Barang & Cicilan
    const resDet = window.db.exec(`SELECT b.nama, td.qty, td.harga FROM transaksi_detail td LEFT JOIN barang b ON td.barang_id = b.id WHERE td.transaksi_id = ?`, [tId]);
    const resCicil = window.db.exec(`SELECT jumlah, tanggal FROM cicilan WHERE hutang_id = ? ORDER BY CAST(tanggal AS UNSIGNED) ASC`, [hutangId]);

    let itemsHtml = '';
    if (resDet.length > 0) {
        resDet[0].values.forEach(row => {
            itemsHtml += `
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px;">
                    <span style="flex:1;">${row[1]}x ${(row[0] || "Barang").toUpperCase()}</span>
                    <span style="width:75px; text-align:right;">${(row[1]*row[2]).toLocaleString('id-ID')}</span>
                </div>`;
        });
    }

    let cicilHtml = '';
    if (resCicil.length > 0) {
        resCicil[0].values.forEach(c => {
            const tglC = new Date(parseInt(c[1])).toLocaleDateString('id-ID', {day:'2-digit', month:'2-digit'});
            cicilHtml += `
                <div style="display:flex; justify-content:space-between; font-size:10px; color:#444;">
                    <span>- Bayar (${tglC})</span>
                    <span>-${c[0].toLocaleString('id-ID')}</span>
                </div>`;
        });
    }

    const tglPinjam = new Date(parseInt(hTglMs)).toLocaleString('id-ID', {dateStyle:'medium'});

    let htmlContent = `
        <div id="wrapper-preview-rekap" class="flex flex-col items-center gap-4 w-full max-w-[320px]">
            <div id="struk-rekap-capture" style="width:300px; background:#fff; padding:25px; color:#000; font-family:monospace; border-radius:8px;">
                <div style="text-align:center; font-weight:900; font-size:16px;">${window.namaToko || 'POSKITA'}</div>
                <div style="text-align:center; font-size:10px; margin-bottom:10px;">TAGIHAN HUTANG #${tId.toString().slice(-6)}</div>
                
                <div style="font-size:9px; margin-bottom:2px;">Pelanggan: ${pNama.toUpperCase()}</div>
                <div style="font-size:9px; margin-bottom:10px;">Tgl Pinjam: ${tglPinjam}</div>
                
                <div style="border-bottom:2px dashed #000; margin:10px 0;"></div>
                ${itemsHtml}
                <div style="text-align:right; font-size:10px; font-weight:bold; margin-top:5px;">Total Awal: Rp ${hTotal.toLocaleString('id-ID')}</div>
                
                <div style="border-top:1px dashed #000; margin:10px 0; padding-top:10px;"></div>
                <div style="font-size:9px; font-weight:bold; margin-bottom:5px;">RIWAYAT BAYAR:</div>
                ${cicilHtml || '<div style="font-size:9px; font-style:italic; color:#888;">Belum ada cicilan</div>'}
                
                <div style="border-top:2px dashed #000; margin:10px 0; padding-top:10px;"></div>
                <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:900; color:#e11d48;">
                    <span>SISA HUTANG:</span>
                    <span>Rp ${hSisa.toLocaleString('id-ID')}</span>
                </div>
                <div style="text-align:center; font-size:9px; margin-top:20px; font-style:italic;">-- Mohon Segera Dilunasi --</div>
            </div>

            <div class="flex flex-col gap-2 w-full px-4 no-capture">
                <button id="btn-share-hutang" class="w-full py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2">
                    <span>📲</span> Kirim Gambar ke WA
                </button>
                <button onclick="document.getElementById('section-struk').classList.remove('show-capture')" class="w-full py-2 bg-slate-100 text-slate-500 rounded-xl font-black text-[9px] uppercase">Tutup</button>
            </div>
        </div>
    `;

    const printArea = document.getElementById('section-struk');
    printArea.innerHTML = htmlContent;
    printArea.classList.add('show-capture');

    // Logika Share Gambar (sama seperti nota biasa)
    document.getElementById('btn-share-hutang').onclick = async () => {
        const btn = document.getElementById('btn-share-hutang');
        btn.innerText = "MENYIAPKAN...";
        const area = document.getElementById('struk-rekap-capture');
        const canvas = await html2canvas(area, { scale: 2, backgroundColor: "#ffffff" });
        canvas.toBlob(async (blob) => {
            const file = new File([blob], `Tagihan-${pNama}.png`, { type: "image/png" });
            if (navigator.share) {
                await navigator.share({ files: [file], title: 'Tagihan Hutang', text: `Halo ${pNama}, ini rincian tagihan hutang Anda di ${window.namaToko}.` });
            } else {
                const link = document.createElement('a');
                link.download = `Tagihan-${pNama}.png`; link.href = canvas.toDataURL(); link.click();
            }
            btn.innerText = "Kirim Gambar ke WA";
        });
    };
};

window.bukaLogVoid = async () => {
    const container = document.getElementById('list-log-void');
    const modal = document.getElementById('modal-log-void');
    
    // Tampilkan modal & loading state
    modal.classList.remove('hidden');
    container.innerHTML = '<p class="text-center text-[10px] font-bold text-slate-400 animate-pulse py-10">MENGAMBIL DATA AUDIT...</p>';

    try {
        // Ambil data dari tabel logs_void di Supabase
        const { data, error } = await supabase
            .from('logs_void')
            .select('*')
            .eq('user_id', window.currentUid)
            .order('waktu_hapus', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
            container.innerHTML = data.map(log => {
                const tgl = new Date(log.waktu_hapus).toLocaleString('id-ID', { 
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                });
                // Ganti bagian return HTML-nya jadi begini:
return `
<div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
    <div class="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>
    <div class="flex justify-between items-start mb-2">
        <div>
            <p class="text-[10px] font-black text-slate-800 uppercase">NOTA #${log.transaksi_id.toString().slice(-6)}</p>
            <p class="text-[8px] text-slate-400 font-bold">${tgl}</p>
        </div>
        <p class="text-xs font-black text-rose-600">Rp ${log.total.toLocaleString('id-ID')}</p>
    </div>
    
    <p class="text-[9px] text-slate-500 font-medium mb-2 uppercase tracking-tight">
        📦 ${log.rincian_barang || '-'}
    </p>

    <div class="bg-rose-50 p-2 rounded-lg border border-rose-100">
        <p class="text-[8px] font-black text-rose-400 uppercase mb-0.5">Alasan Hapus:</p>
        <p class="text-[10px] font-bold text-slate-700 leading-relaxed italic">"${log.alasan}"</p>
    </div>
</div>`;
            }).join('');
        } else {
            container.innerHTML = `
                <div class="text-center py-10 opacity-40">
                    <p class="text-4xl mb-2">✅</p>
                    <p class="text-[10px] font-black uppercase tracking-widest">Tidak ada riwayat hapus</p>
                </div>`;
        }
    } catch (err) {
        console.error("Gagal load log void:", err);
        container.innerHTML = '<p class="text-center text-rose-500 text-[10px] font-bold">Gagal mengambil data. Cek koneksi.</p>';
    }
};

window.bukaDetailTransaksi = (trxId) => {
    console.log("Klik jalan! ID:", trxId); // Buka F12 untuk lihat ini
    
    try {
        const numTrxId = Number(trxId); 

        // PERBAIKAN: Jangan pakai tanda '?' untuk BIGINT, langsung gabung ke string
        const qInfo = `SELECT tanggal, total, metode_bayar, pelanggan_id FROM transaksi WHERE id = ${numTrxId}`;
        const resInfo = window.db.exec(qInfo);
        
        if (!resInfo || resInfo.length === 0) {
            alert("Oops! Data transaksi tidak ditemukan di Database.");
            return;
        }
        
        const info = resInfo[0].values[0];
        const tglMs = info[0];
        const totalTrx = info[1];
        const metode = info[2] || 'Tunai';
        const pId = info[3];

        let namaPelanggan = "Umum";
        if (pId) {
            const resP = window.db.exec(`SELECT nama FROM pelanggan WHERE id = '${pId}'`);
            if (resP.length > 0) namaPelanggan = resP[0].values[0][0];
        }

        const d = new Date(parseInt(tglMs));
        document.getElementById('detail-waktu').innerText = d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
        document.getElementById('detail-total').innerText = "Rp " + totalTrx.toLocaleString('id-ID');
        document.getElementById('detail-pelanggan').innerText = namaPelanggan.toUpperCase();

        const elMetode = document.getElementById('detail-metode');
        elMetode.innerText = metode;
        if (metode === 'Hutang') {
            elMetode.className = "mt-0.5 px-2 py-0.5 rounded text-[8px] font-black uppercase bg-amber-100 text-amber-600 border border-amber-200";
        } else {
            elMetode.className = "mt-0.5 px-2 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-100 text-emerald-600 border border-emerald-200";
        }

        // PERBAIKAN: Langsung gabung numTrxId ke string
        const resDetail = window.db.exec(`
            SELECT b.nama, td.qty, td.harga
            FROM transaksi_detail td
            LEFT JOIN barang b ON td.barang_id = b.id
            WHERE td.transaksi_id = ${numTrxId}
        `);

        const tbody = document.getElementById('detail-trx-body');
        if (resDetail.length > 0) {
            tbody.innerHTML = resDetail[0].values.map(row => {
                const nama = row[0] || "Barang (Dihapus)"; 
                const qty = row[1];
                const harga = row[2];
                return `
                <tr>
                    <td class="p-3 pl-4 whitespace-nowrap">
                        <p class="font-bold text-slate-700 text-[10px] md:text-xs uppercase tracking-tight">${nama}</p>
                        <p class="text-[8px] md:text-[9px] text-slate-400 font-medium mt-0.5">@ Rp ${harga.toLocaleString('id-ID')}</p>
                    </td>
                    <td class="p-3 text-center whitespace-nowrap">
                        <span class="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[9px] md:text-[10px] font-black">${qty}x</span>
                    </td>
                    <td class="p-3 pr-4 text-right font-black text-slate-800 text-[10px] md:text-xs whitespace-nowrap">Rp ${(qty * harga).toLocaleString('id-ID')}</td>
                </tr>`;
            }).join('');
        }

        // Action Buttons
        document.getElementById('btn-hapus-trx').onclick = () => window.hapusTransaksi(numTrxId);
        document.getElementById('btn-print-trx').onclick = () => window.printStruk(numTrxId);
        document.getElementById('btn-image-trx').onclick = () => {
            document.getElementById('modal-detail-trx').classList.add('hidden');
            window.previewNotaImage(numTrxId);
        };

        document.getElementById('btn-hapus-trx').classList.remove('hidden');
        document.getElementById('modal-detail-trx').classList.remove('hidden');
    } catch (e) {
        console.error("Error Buka Detail:", e);
        alert("Gagal memuat detail transaksi. Cek Console.");
    }
};

window.hapusTransaksi = async (trxId) => {
    const numTrxId = Number(trxId);
    const alasan = prompt("⚠️ KONFIRMASI HAPUS TRANSAKSI\nMasukkan alasan pembatalan (Misal: Salah input, Barang retur, dll):");
    
    if (alasan === null) return; 
    if (alasan.trim() === "") return alert("Alasan wajib diisi untuk menghapus transaksi!");

    if (!confirm("Stok barang akan otomatis dikembalikan ke gudang dan omzet akan dikurangi. Lanjutkan?")) return;

    const modalDetail = document.getElementById('modal-detail-trx');
    if (modalDetail) modalDetail.classList.add('hidden');

    try {
        // 1. Ambil detail barang untuk balikin stok
        const resDetail = window.db.exec(`
            SELECT td.barang_id, td.qty, b.nama 
            FROM transaksi_detail td 
            JOIN barang b ON td.barang_id = b.id 
            WHERE td.transaksi_id = ?
        `, [numTrxId]);

        let itemsToRestore = [];
        let teksRincian = ""; 

        if (resDetail.length > 0) {
            resDetail[0].values.forEach(row => {
                const bId = row[0];
                const q = row[1];
                const namaB = row[2];
                
                itemsToRestore.push({ id: bId, qty: q });
                teksRincian += `${q}x ${namaB}, `; 
                window.db.run("UPDATE barang SET stok = stok + ? WHERE id = ?", [q, bId]);
            });
            teksRincian = teksRincian.replace(/, $/, ""); 
        } else {
            const resFallback = window.db.exec("SELECT qty, barang_id FROM transaksi_detail WHERE transaksi_id = ?", [numTrxId]);
            if(resFallback.length > 0) {
                resFallback[0].values.forEach(rf => {
                    teksRincian += `${rf[0]}x ID:${rf[1]}, `;
                });
            }
        }

        // 2. Cek Data Transaksi & Hutang sebelum dihapus
        const resTrx = window.db.exec("SELECT total, pelanggan_id, metode_bayar FROM transaksi WHERE id = ?", [numTrxId]);
        let totalLama = 0;
        let pId = null;
        let metode = "";
        
        if (resTrx.length > 0) {
            totalLama = resTrx[0].values[0][0];
            pId = resTrx[0].values[0][1];
            metode = resTrx[0].values[0][2];
        }

        // --- LOGIKA PEMBERSIHAN HUTANG & CICILAN ---
        let hutangIdTerhapus = null;
        if (pId) {
            const resH = window.db.exec("SELECT id, sisa FROM hutang WHERE transaksi_id = ?", [numTrxId]);
            if (resH.length > 0) {
                hutangIdTerhapus = resH[0].values[0][0];
                const sisaHutangNota = resH[0].values[0][1];

                // Kurangi sisa_hutang pelanggan berdasarkan SISA NOTA (bukan total nota awal)
                window.db.run("UPDATE pelanggan SET sisa_hutang = sisa_hutang - ? WHERE id = ?", [sisaHutangNota, pId]);
                
                // Hapus data hutang & cicilan di lokal
                window.db.run("DELETE FROM cicilan WHERE hutang_id = ?", [hutangIdTerhapus]);
                window.db.run("DELETE FROM hutang WHERE id = ?", [hutangIdTerhapus]);
            }
        }

        // 3. Hapus Data Utama di Lokal
        window.db.run("DELETE FROM transaksi_detail WHERE transaksi_id = ?", [numTrxId]);
        window.db.run("DELETE FROM transaksi WHERE id = ?", [numTrxId]);

        window.refreshDataUI(); 

        // 4. Sinkronisasi ke Cloud
        if (navigator.onLine) {
            // Hapus Transaksi & Detail
            await supabase.from('transaksi_detail').delete().eq('transaksi_id', numTrxId).eq('user_id', window.currentUid);
            await supabase.from('transaksi').delete().eq('id', numTrxId).eq('user_id', window.currentUid);
            
            // Hapus Hutang & Cicilan di Supabase jika ada
            if (hutangIdTerhapus) {
                await supabase.from('cicilan').delete().eq('hutang_id', hutangIdTerhapus).eq('user_id', window.currentUid);
                await supabase.from('hutang').delete().eq('id', hutangIdTerhapus).eq('user_id', window.currentUid);
            }

            // Catat Log Void
            await supabase.from('logs_void').insert({
                transaksi_id: numTrxId,
                user_id: window.currentUid,
                total: totalLama,
                alasan: alasan,
                rincian_barang: teksRincian,
                waktu_hapus: new Date().toISOString()
            });

            // Update Stok di Supabase
            for (let item of itemsToRestore) {
                const { data } = await supabase.from('barang').select('stok').eq('id', item.id).eq('user_id', window.currentUid).single();
                if (data) {
                    await supabase.from('barang').update({ stok: data.stok + item.qty }).eq('id', item.id).eq('user_id', window.currentUid);
                }
            }
        } else {
            // Jika Offline, masukkan ke antrian
            window.offlineQueue.hapus_transaksi.push({ id: numTrxId, alasan: alasan });
            
            // Simpan perubahan stok ke antrian barang
            itemsToRestore.forEach(item => {
                const resB = window.db.exec("SELECT nama, stok, harga_jual, modal FROM barang WHERE id=?", [item.id]);
                if (resB.length > 0) {
                    const b = resB[0].values[0];
                    window.offlineQueue.barang.push({ 
                        id: item.id, 
                        nama: b[0], 
                        stok: b[1], 
                        harga_jual: b[2], 
                        modal: b[3], 
                        user_id: window.currentUid 
                    });
                }
            });
            window.saveQueue();
        }

        alert(`✅ Sukses!\nTransaksi #${numTrxId.toString().slice(-6)} telah dihapus, hutang disesuaikan, dan stok dikembalikan.\nAlasan: ${alasan}`);

    } catch (e) {
        console.error("Gagal hapus transaksi:", e);
        alert("Terjadi kesalahan saat menghapus data. Cek koneksi Anda.");
    }
};

window.bukaRiwayatShift = () => {
        if(!window.db) return;
        const res = window.db.exec("SELECT waktu_buka, waktu_tutup, modal_awal, omzet, laba FROM shift_kasir ORDER BY waktu_buka DESC");
        const tbody = document.getElementById('riwayat-shift-body');
        
        if(res.length > 0) {
            tbody.innerHTML = res[0].values.map(row => {
                const bukaStr = new Date(row[0]).toLocaleString('id-ID', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
                const tutupStr = row[1] > 0 ? new Date(row[1]).toLocaleString('id-ID', {hour:'2-digit', minute:'2-digit'}) : '<span class="text-rose-500 font-bold animate-pulse">Sedang Aktif</span>';
                
                return `
                <tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td class="p-3 pl-4">
                        <p class="font-bold text-[10px] md:text-xs text-slate-700">${bukaStr}</p>
                        <p class="text-[9px] text-slate-400 font-medium">s/d ${tutupStr}</p>
                    </td>
                    <td class="p-3 text-right font-black text-slate-600 text-[10px] md:text-xs whitespace-nowrap">Rp ${row[2].toLocaleString('id-ID')}</td>
                    <td class="p-3 pr-4 text-right font-black text-blue-600 text-[10px] md:text-xs whitespace-nowrap">Rp ${row[3].toLocaleString('id-ID')}</td>
                </tr>`;
            }).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="3" class="p-8 text-center text-slate-400 text-[10px] md:text-xs italic font-medium"><div class="text-2xl md:text-3xl mb-2 grayscale opacity-40">🏪</div>Belum ada riwayat kasir.</td></tr>`;
        }
        
        document.getElementById('modal-riwayat-shift').classList.remove('hidden');
    };

    window.loadShiftState = () => {
        if(!window.currentUid) return;
        const shiftData = JSON.parse(localStorage.getItem(`poskita_shift_${window.currentUid}`));
        
        const badge = document.getElementById('badge-status-kasir');
        const infoModal = document.getElementById('home-modal-kasir');
        const infoBuka = document.getElementById('home-waktu-buka');

        if (shiftData && shiftData.aktif) {
            window.kasirAktif = true;
            window.shiftAktifId = shiftData.id;
            
            badge.innerText = "BUKA";
            badge.className = "bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-200";
            
            infoModal.innerText = "Rp " + shiftData.modal.toLocaleString('id-ID');
            const d = new Date(shiftData.id);
            infoBuka.innerText = d.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});
        } else {
            window.kasirAktif = false;
            window.shiftAktifId = null;
            
            badge.innerText = "TUTUP";
            badge.className = "bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-200";
            
            infoModal.innerText = "-";
            infoBuka.innerText = "-";
        }
    };

    window.submitBukaKasir = async () => {
    if (!window.db) {
        alert("Aplikasi sedang menyiapkan database, mohon tunggu sebentar...");
        return;
    }
        const valModal = document.getElementById('input-modal-kasir').value.replace(/\./g, '');
        const numModal = parseInt(valModal) || 0;
        const ts = Date.now();

        window.db.run("INSERT INTO shift_kasir (id, waktu_buka, waktu_tutup, modal_awal, omzet, laba) VALUES (?,?,?,?,?,?)", [ts.toString(), ts, 0, numModal, 0, 0]);
        
        const shiftPayload = { 
            id: ts.toString(), 
            user_id: window.currentUid, 
            waktu_buka: ts, 
            waktu_tutup: 0, 
            modal_awal: numModal, 
            omzet: 0, 
            laba: 0 
        };

        if (navigator.onLine) {
            try {
                const { error } = await supabase.from('shift_kasir').upsert(shiftPayload);
                if (error) throw error; 
            } catch(e) {
                window.offlineQueue.shift = window.offlineQueue.shift || [];
                window.offlineQueue.shift.push(shiftPayload);
                window.saveQueue();
            }
        } else {
            window.offlineQueue.shift = window.offlineQueue.shift || [];
            window.offlineQueue.shift.push(shiftPayload);
            window.saveQueue();
        }

        localStorage.setItem(`poskita_shift_${window.currentUid}`, JSON.stringify({
            aktif: true,
            id: ts,
            modal: numModal
        }));

        document.getElementById('modal-buka-kasir').classList.add('hidden');
        window.loadShiftState();
        window.switchPage('kasir'); 
    };

    window.konfirmasiTutupKasir = async () => {
        if(!confirm("Anda yakin ingin TUTUP KASIR?\n\nSemua transaksi shift ini akan direkap dan dikirimkan ke owner via WA.")) return;
        
        const btnTutup = document.getElementById('btn-header-tutup-kasir');
        
        try {
            if(btnTutup) {
                btnTutup.innerText = "MENGIRIM...";
                btnTutup.disabled = true;
            }

            const shiftId = window.shiftAktifId;
            const waktuBuka = shiftId;
            const waktuTutup = Date.now();
            
            const shiftData = JSON.parse(localStorage.getItem(`poskita_shift_${window.currentUid}`));
            const modalAwal = shiftData ? shiftData.modal : 0;

            const qTrx = `SELECT id, total, laba FROM transaksi WHERE CAST(tanggal AS UNSIGNED) >= ${waktuBuka} AND CAST(tanggal AS UNSIGNED) <= ${waktuTutup}`;
            const resTrx = window.db.exec(qTrx);
            
            let totalOmzet = 0, totalLaba = 0, trxIds = [];
            if(resTrx.length > 0) {
                resTrx[0].values.forEach(row => {
                    trxIds.push(row[0]);
                    totalOmzet += row[1];
                    totalLaba += row[2];
                });
            }

            window.db.run("UPDATE shift_kasir SET waktu_tutup=?, omzet=?, laba=? WHERE id=?", [waktuTutup, totalOmzet, totalLaba, shiftId.toString()]);

            const shiftPayload = { 
                id: shiftId.toString(), 
                user_id: window.currentUid, 
                waktu_buka: waktuBuka, 
                waktu_tutup: waktuTutup, 
                modal_awal: modalAwal, 
                omzet: totalOmzet, 
                laba: totalLaba 
            };

            if (navigator.onLine) {
                try {
                    const { error } = await supabase.from('shift_kasir').upsert(shiftPayload);
                    if (error) throw error;
                } catch(e) {
                    window.offlineQueue.shift = window.offlineQueue.shift || [];
                    window.offlineQueue.shift.push(shiftPayload);
                    window.saveQueue();
                }
            } else {
                window.offlineQueue.shift = window.offlineQueue.shift || [];
                window.offlineQueue.shift.push(shiftPayload);
                window.saveQueue();
            }

            const strBuka = new Date(waktuBuka).toLocaleString('id-ID', { dateStyle:'medium', timeStyle:'short' });
            const strTutup = new Date(waktuTutup).toLocaleString('id-ID', { dateStyle:'medium', timeStyle:'short' });
            
            let pesanWA = `*LAPORAN TUTUP KASIR* 🏪\n`;
            pesanWA += `------------------------------------------\n`;
            pesanWA += `👤 *Kasir:* ${(window.userEmail || 'admin').split('@')[0].toUpperCase()}\n`;
            pesanWA += `📅 *Buka:* ${strBuka}\n`;
            pesanWA += `🏁 *Tutup:* ${strTutup}\n`;
            pesanWA += `💰 *Modal:* Rp ${modalAwal.toLocaleString('id-ID')}\n`;
            pesanWA += `------------------------------------------\n\n`;

            if(trxIds.length > 0) {
                pesanWA += `*🛍️ RINCIAN TERJUAL:*\n`;
                const qDet = `SELECT b.nama, SUM(td.qty) as total_qty, td.harga FROM transaksi_detail td LEFT JOIN barang b ON td.barang_id = b.id WHERE td.transaksi_id IN (${trxIds.join(',')}) GROUP BY td.barang_id, td.harga`;
                const resDet = window.db.exec(qDet);
                
                if(resDet.length > 0) {
                    resDet[0].values.forEach(r => {
                        const nama = (r[0] || "Produk dihapus").toUpperCase();
                        const qty = r[1];
                        const harga = r[2];
                        const subtotal = qty * harga;
                        pesanWA += `▪️ ${nama}\n    _${qty}x @Rp${harga.toLocaleString('id-ID')}_  → *Rp${subtotal.toLocaleString('id-ID')}*\n`;
                    });
                }
            } else {
                pesanWA += `_Tidak ada transaksi pada shift ini._\n`;
            }

            pesanWA += `\n------------------------------------------\n`;
            pesanWA += `💵 *TOTAL OMZET:* *Rp ${totalOmzet.toLocaleString('id-ID')}*\n`;
            pesanWA += `📈 *LABA BERSIH:* *Rp ${totalLaba.toLocaleString('id-ID')}*\n`;
            pesanWA += `------------------------------------------\n\n`;

            pesanWA += `*🏆 5 TERLARIS (MINGGU INI)*\n`;
            const satuMingguLalu = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const qLaris = `
                SELECT b.nama, SUM(td.qty) as total_qty 
                FROM transaksi_detail td 
                LEFT JOIN barang b ON td.barang_id = b.id 
                WHERE td.transaksi_id >= ${satuMingguLalu}
                GROUP BY td.barang_id 
                ORDER BY total_qty DESC 
                LIMIT 5
            `;

            try {
                const resLaris = window.db.exec(qLaris);
                if (resLaris.length > 0) {
                    const medali = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
                    resLaris[0].values.forEach((r, idx) => {
                        const namaLaris = (r[0] || "Produk dihapus").toUpperCase();
                        const qtyLaris = r[1];
                        pesanWA += `${medali[idx]} ${namaLaris} (_${qtyLaris} terjual_)\n`;
                    });
                } else {
                    pesanWA += `_Belum ada data penjualan minggu ini._\n`;
                }
            } catch (e) {
                console.error("Gagal ambil data terlaris:", e);
                pesanWA += `_Gagal memuat data terlaris._\n`;
            }

            pesanWA += `\n------------------------------------------\n`;
            pesanWA += `_Generated by PosKita Pro_`;

            // LOGIKA PENGIRIMAN WA DINAMIS SAAS
            if(window.fonnteToken && window.waOwner) {
                await fetch("https://api.fonnte.com/send", {
                    method: "POST",
                    headers: { "Authorization": window.fonnteToken },
                    body: new URLSearchParams({ target: window.waOwner, message: pesanWA })
                });
            } else {
                console.log("SIMULASI WA TERKIRIM (Pengaturan WA belum diisi):\n\n" + pesanWA);
                alert("⚠️ Laporan Kasir ditutup.\n(Pesan WA tidak terkirim karena Token Fonnte / Nomor WA Owner belum diatur oleh admin).");
            }

            localStorage.setItem(`poskita_shift_${window.currentUid}`, JSON.stringify({ aktif: false }));
            window.loadShiftState();
            window.switchPage('home');
            if(window.fonnteToken && window.waOwner) alert("Kasir berhasil ditutup dan laporan telah dikirim!");

        } catch(e) {
            console.error("Gagal kirim proses tutup kasir:", e);
            alert("Proses terkendala jaringan, mohon periksa internet Anda dan coba tekan tombol tutup kembali.");
        } finally {
            if(btnTutup) {
                btnTutup.innerText = "Tutup Kasir";
                btnTutup.disabled = false;
            }
        }
    };

window.bukaRiwayatKulakan = () => {
    if (!window.db) return;
    
    // Ambil data dari tabel pembelian join dengan supplier (jika ada)
    const res = window.db.exec(`
        SELECT p.id, p.tanggal, p.total, p.status, p.supplier_id 
        FROM pembelian p 
        ORDER BY CAST(p.tanggal AS UNSIGNED) DESC
    `);
    
    const tbody = document.getElementById('riwayat-kulakan-body');
    document.getElementById('modal-riwayat-kulakan').classList.remove('hidden');

    if (res.length > 0) {
        tbody.innerHTML = res[0].values.map(row => {
            const [id, tgl, total, status, sId] = row;
            const d = new Date(parseInt(tgl));
            const tglStr = d.toLocaleDateString('id-ID', {day:'numeric', month:'short'}) + ' ' + d.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
            
            const badgeColor = status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600';

            const tombolEdit = status === 'DRAFT' 
    ? `<button onclick="window.editDraftKulakan('${id}')" class="mt-2 px-3 py-1 bg-blue-600 text-white text-[8px] font-black rounded-lg">EDIT DRAFT</button>` 
    : '';

return `
    <tr class="hover:bg-slate-50">
        <td class="p-3">
            <p class="font-black text-slate-700">#${id.slice(-6)}</p>
            <p class="text-[9px] text-slate-400">${tglStr}</p>
            ${tombolEdit} 
        </td>
        <td class="p-3 text-right font-bold text-slate-600">Rp ${total.toLocaleString('id-ID')}</td>
        <td class="p-3 text-center">
            <span class="px-2 py-0.5 rounded-full text-[8px] font-black ${badgeColor}">${status}</span>
        </td>
    </tr>
`;
        }).join('');
    } else {
        tbody.innerHTML = `<tr><td colspan="3" class="p-10 text-center text-slate-400 italic">Belum ada riwayat kulakan.</td></tr>`;
    }
};

window.bukaKalenderPro = () => {
        if (!window.isPro) {
            return window.showUpgradeModal("Fitur filter tanggal sesuai keinginan (Custom Date) hanya tersedia untuk langganan PRO. Yuk upgrade!");
        }

        const dateInput = document.getElementById('input-date-custom');
        if (dateInput) {
            try {
                dateInput.showPicker(); 
            } catch (error) {
                dateInput.focus();
                dateInput.click();
            }
        }
    };