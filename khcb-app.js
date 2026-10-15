window.KHCB = {
    // 1. Phân tích CSV chuẩn xác
    parseCSVLine: function(text) {
        let result = [], entry = '', inQuotes = false;
        for (let i = 0; i < text.length; i++) {
            let c = text[i];
            if (inQuotes) {
                if (c === '"') {
                    if (i + 1 < text.length && text[i + 1] === '"') { entry += '"'; i++; }
                    else inQuotes = false;
                } else entry += c;
            } else {
                if (c === '"') inQuotes = true;
                else if (c === ',') { result.push(entry); entry = ''; }
                else entry += c;
            }
        }
        result.push(entry);
        return result;
    },

    normalizeStr: function(str) {
        if (!str) return '';
        return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").trim();
    },

    normalizeDriveLink: function(rawUrl) {
        if (!rawUrl || rawUrl.trim() === "" || rawUrl.trim() === "#") return "#";
        let match = rawUrl.match(/folders\/([a-zA-Z0-9-_]{33,})/);
        return match ? "https://drive.google.com/drive/folders/" + match[1] + "?usp=drive_link" : rawUrl;
    },

    formatDateUI: function(d) {
        if (!d || isNaN(d.getTime())) return "";
        return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
    },

    // 2. Tự động tiêm Top Navbar và Modal xác thực F2
    setupCommonUI: function(activeNav, sheetId, gid) {
        // A. Thanh Navbar
        const existingNav = document.querySelector('.top-navbar');
        if (!existingNav) {
            const navHTML = `
                <div class="top-navbar">
                    <div class="mobile-menu-btn" onclick="document.getElementById('khcbNav').classList.add('open')"><i class="fa fa-bars"></i></div>
                    <div class="logo-box">
                        <img src="https://raw.githubusercontent.com/khcbvadl-ai/quanlidulieu/main/logo.%20KHCB%20trong.png" alt="Logo" class="logo-img">
                    </div>
                    <div class="nav-menu" id="khcbNav">
                        <div class="mobile-close-btn" onclick="document.getElementById('khcbNav').classList.remove('open')"><i class="fa fa-times"></i></div>
                        <div class="nav-item-wrap"><a href="index.html" class="nav-item ${activeNav==='home'?'active':''}">Trang chủ</a></div>
                        <div class="nav-item-wrap"><a href="lich-giang.html" class="nav-item ${activeNav==='schedule'?'active':''}">Lịch giảng</a></div>
                        <div class="nav-item-wrap"><a href="ke-hoach.html" class="nav-item ${activeNav==='plan'?'active':''}">Kế hoạch đào tạo</a></div>
                        <div class="nav-item-wrap"><a href="video.html" class="nav-item ${activeNav==='video'?'active':''}">Video bài giảng</a></div>
                        <div class="nav-item-wrap"><a href="bao-cao.html" class="nav-item ${activeNav==='report'?'active':''}">Báo cáo công việc</a></div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('afterbegin', navHTML);
        }

        // B. Modal F2
        const modalHTML = `
            <div class="f2-modal-overlay" id="f2Modal">
                <div class="f2-modal-box" id="f2Box">
                    <div class="f2-icon-lock"><i class="fa-solid fa-shield-halved"></i></div>
                    <div class="f2-modal-title">XÁC THỰC QUẢN TRỊ</div>
                    <div class="f2-modal-sub">Vui lòng nhập mật khẩu để mở Google Sheet quản trị</div>
                    <div class="f2-input-wrap">
                        <input type="password" id="f2PassInput" placeholder="Nhập mật khẩu quản trị..." autocomplete="off">
                        <i class="fa-solid fa-eye f2-toggle-eye" id="f2Eye" onclick="KHCB.togglePassVisibility()"></i>
                    </div>
                    <div class="f2-error-msg" id="f2Error"></div>
                    <div class="f2-btn-group">
                        <button class="f2-btn-cancel" onclick="KHCB.closeF2Modal()">Đóng</button>
                        <button class="f2-btn-submit" id="f2BtnSubmit" onclick="KHCB.verifyAdminPass('${sheetId}', '${gid || '0'}')">
                            <span>Mở Sheet</span> <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Lắng nghe F2
        document.addEventListener('keydown', function(e) {
            if (e.key === 'F2') {
                e.preventDefault();
                KHCB.openF2Modal();
            }
        });

        // Bắt Enter trong ô pass
        document.getElementById('f2PassInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                KHCB.verifyAdminPass(sheetId, gid || '0');
            }
        });
    },

    openF2Modal: function() {
        const modal = document.getElementById('f2Modal');
        const input = document.getElementById('f2PassInput');
        document.getElementById('f2Error').innerText = '';
        input.value = '';
        modal.style.display = 'flex';
        input.focus();
    },

    closeF2Modal: function() {
        document.getElementById('f2Modal').style.display = 'none';
    },

    togglePassVisibility: function() {
        const input = document.getElementById('f2PassInput');
        const eye = document.getElementById('f2Eye');
        if (input.type === 'password') {
            input.type = 'text';
            eye.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            eye.classList.replace('fa-eye-slash', 'fa-eye');
        }
    },

    // Kiểm tra pass từ Tab "Pass" trên Sheet
    verifyAdminPass: function(sheetId, gid) {
        const input = document.getElementById('f2PassInput');
        const err = document.getElementById('f2Error');
        const box = document.getElementById('f2Box');
        const submitBtn = document.getElementById('f2BtnSubmit');
        const enteredPass = input.value.trim();

        if (!enteredPass) {
            err.innerText = "Vui lòng nhập mật khẩu!";
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Kiểm tra...';

        // Gọi về tab Pass
        const passUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Pass`;
        fetch(passUrl)
            .then(res => res.text())
            .then(txt => {
                let lines = txt.split(/\r?\n/);
                let correctPass = "";
                for (let l of lines) {
                    let cols = KHCB.parseCSVLine(l);
                    if (cols.length > 0 && cols[0].trim()) {
                        correctPass = cols[0].trim().replace(/^["']|["']$/g, '');
                        break;
                    }
                }

                if (enteredPass === correctPass) {
                    err.style.color = "green";
                    err.innerText = "✓ Xác thực thành công! Đang chuyển hướng...";
                    setTimeout(() => {
                        window.open(`https://docs.google.com/spreadsheets/d/${sheetId}/edit?gid=${gid}#gid=${gid}`, '_blank');
                        KHCB.closeF2Modal();
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<span>Mở Sheet</span> <i class="fa-solid fa-arrow-right"></i>';
                        err.style.color = "#dc2626";
                    }, 600);
                } else {
                    box.classList.add('shake-anim');
                    setTimeout(() => box.classList.remove('shake-anim'), 350);
                    err.innerText = "Mật khẩu không chính xác!";
                    input.select();
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span>Mở Sheet</span> <i class="fa-solid fa-arrow-right"></i>';
                }
            })
            .catch(e => {
                err.innerText = "Không thể đọc tab Pass từ Sheet. Kiểm tra quyền chia sẻ!";
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Mở Sheet</span> <i class="fa-solid fa-arrow-right"></i>';
            });
    },

    // =========================================================================
    // HÀM KHỞI TẠO TẬP TRUNG TOÀN DIỆN CHO 5 LOẠI MÀN HÌNH
    // =========================================================================
    init: function(config) {
        this.setupCommonUI(config.type, config.sheetId, config.gid);
        const root = document.getElementById(config.containerId || 'app-root');

        if (config.type === 'home') this.renderPortal(root, config);
        else if (config.type === 'table') this.renderTable(root, config);
        else if (config.type === 'schedule') this.renderSchedule(root, config);
        else if (config.type === 'plan') this.renderPlan(root, config);
        else if (config.type === 'report') this.renderReport(root, config);
        else if (config.type === 'video') this.renderVideo(root, config);
    },

    // ----------------- MODULE 1: PORTAL TÀI LIỆU 3 CẤP -----------------
    renderPortal: function(root, cfg) {
        root.innerHTML = `<div class="header-main" style="display:flex;justify-content:flex-end;margin-bottom:20px;">
            <div class="search-box"><input type="text" id="pSearch" placeholder="Tìm kiếm tài liệu..."></div>
        </div><div class="portal-container" id="pGrid"></div>`;
        
        const cacheKey = "PORTAL_CACHE_" + cfg.sheetId;
        const cached = localStorage.getItem(cacheKey);
        if (cached) renderUI(JSON.parse(cached));

        fetch(`https://docs.google.com/spreadsheets/d/${cfg.sheetId}/gviz/tq?tqx=out:csv`)
            .then(r => r.text()).then(txt => {
                let lines = txt.split(/\r?\n/), list = [];
                for (let i = 1; i < lines.length; i++) {
                    if (!lines[i].trim()) continue;
                    let cols = KHCB.parseCSVLine(lines[i]);
                    if (cols.length >= 2) {
                        let id = cols[0].trim().toUpperCase().replace(/\s+/g, '');
                        let text = cols[1].trim(), url = cols[2] ? cols[2].trim() : "";
                        let p = id.split('_');
                        if (p.length === 1) list.push({ level: 1, id, text });
                        else if (p.length === 2) list.push({ level: 2, id, group: p[0], text });
                        else if (p.length >= 3) list.push({ level: 3, id, parent: 'drop-' + p[0] + '_' + p[1], text, url: KHCB.normalizeDriveLink(url) });
                    }
                }
                localStorage.setItem(cacheKey, JSON.stringify(list));
                renderUI(list);
            });

        function renderUI(data) {
            const grid = document.getElementById('pGrid');
            grid.innerHTML = '';
            data.filter(i => i.level === 1).forEach((col, idx) => {
                let colDiv = document.createElement('div');
                colDiv.className = 'portal-col'; colDiv.id = 'col-' + col.id;
                colDiv.innerHTML = `<div class="portal-col-header bg-col-${idx%3}">${col.text}</div>`;
                grid.appendChild(colDiv);
            });
            data.filter(i => i.level === 2).forEach(item => {
                let c = document.getElementById('col-' + item.group);
                if (c) {
                    let b = document.createElement('div'); b.className = 'portal-menu-block';
                    b.innerHTML = `<div class="item-card" onclick="KHCB.toggleMenu('drop-${item.id}')"><h2>${item.text}</h2></div>
                                   <div class="sheet-dropdown" id="drop-${item.id}"></div>`;
                    c.appendChild(b);
                }
            });
            data.filter(i => i.level === 3).forEach(item => {
                let drop = document.getElementById(item.parent);
                if (drop) {
                    let a = document.createElement('a'); a.href = item.url; a.target = "_blank"; a.textContent = item.text;
                    drop.appendChild(a);
                }
            });
        }
    },
    toggleMenu: function(id) {
        let el = document.getElementById(id);
        if (!el) return;
        let isO = el.style.display === "block";
        document.querySelectorAll(".sheet-dropdown").forEach(d => d.style.display = "none");
        el.style.display = isO ? "none" : "block";
    },

    // ----------------- MODULE 2: BẢNG ĐA NĂNG (ĐỀ CƯƠNG, GIÁO TRÌNH, PHÂN CÔNG) -----------------
    renderTable: function(root, cfg) {
        const filterCol = cfg.filterColIndex || 4;
        const linkCol = cfg.linkColIndex || 5;
        root.innerHTML = `
            <h2 class="header-title"><i class="fa-solid fa-list-check"></i> ${cfg.title}</h2>
            <div class="filter-section">
                ${cfg.useConfigTab ? `<div class="filter-group"><label>Năm học:</label><select id="tYear"></select></div>` : ''}
                <div class="filter-group"><label id="tFilterLbl">Lọc dữ liệu:</label><select id="tFilter"><option value="ALL">-- Tất cả --</option></select></div>
            </div>
            <div id="loading"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải...</div>
            <div class="table-responsive"><table id="tTable" style="display:none;"><thead><tr id="tHead"></tr></thead><tbody id="tBody"></tbody></table></div>`;

        let all = [], heads = [];
        function loadSheet(tab) {
            let u = `https://docs.google.com/spreadsheets/d/${cfg.sheetId}/gviz/tq?tqx=out:csv${tab ? `&sheet=${encodeURIComponent(tab)}` : ''}`;
            fetch(u).then(r => r.text()).then(txt => {
                let lines = txt.split(/\r?\n/), raw = [], isF = true;
                for (let l of lines) {
                    if (!l.trim()) continue;
                    let c = KHCB.parseCSVLine(l);
                    if (isF) { heads = c.map((h, i) => h ? h.trim() : `CỘT ${i+1}`); isF = false; continue; }
                    if (c[0] && c[0].trim()) {
                        let rObj = {}; c.forEach((v, i) => rObj['c' + (i+1)] = v ? v.trim() : '');
                        raw.push(rObj);
                    }
                }
                all = raw;
                document.getElementById('loading').style.display = 'none';
                document.getElementById('tTable').style.display = 'table';
                document.getElementById('tHead').innerHTML = heads.map(h => `<th>${h}</th>`).join('');
                if (heads[filterCol - 1]) document.getElementById('tFilterLbl').innerText = `Lọc theo ${heads[filterCol - 1]}:`;
                
                // Populate Filter
                const fSel = document.getElementById('tFilter');
                fSel.innerHTML = '<option value="ALL">-- Tất cả --</option>';
                let s = new Set();
                all.forEach(i => { if (i['c' + filterCol]) i['c' + filterCol].split(',').forEach(p => { if (p.trim()) s.add(p.trim()); }); });
                Array.from(s).sort((a,b)=>a.localeCompare(b,'vi')).forEach(v => fSel.innerHTML += `<option value="${v}">${v}</option>`);
                fSel.onchange = apply;
                apply();
            });
        }
        function apply() {
            const val = document.getElementById('tFilter').value;
            const tb = document.getElementById('tBody');
            tb.innerHTML = '';
            let f = all.filter(d => val === "ALL" || (d['c' + filterCol] && d['c' + filterCol].includes(val)));
            if (!f.length) { tb.innerHTML = `<tr><td colspan="${heads.length}" class="empty-message">Không có dữ liệu phù hợp</td></tr>`; return; }
            f.forEach(item => {
                let linkV = item['c' + linkCol];
                let linkH = (linkV && linkV.trim()) ? `<a href="${linkV.startsWith('http')?linkV:'https://'+linkV}" target="_blank" class="btn-evidence"><i class="fa-solid fa-link"></i> Mở link</a>` : `<span class="badge-missing">Chưa có</span>`;
                let cells = heads.map((_, idx) => {
                    let ci = idx + 1;
                    if (ci === linkCol) return `<td style="text-align:center;">${linkH}</td>`;
                    if (ci === 1) return `<td style="text-align:center;font-weight:bold;">${item['c1']}</td>`;
                    if (ci === filterCol) return `<td style="font-weight:600;color:var(--teacher-color);">${item['c' + ci]}</td>`;
                    return `<td>${item['c' + ci] || ''}</td>`;
                }).join('');
                tb.innerHTML += `<tr>${cells}</tr>`;
            });
        }

        if (cfg.useConfigTab) {
            fetch(`https://docs.google.com/spreadsheets/d/${cfg.sheetId}/gviz/tq?tqx=out:csv&sheet=Config`)
                .then(r => r.text()).then(t => {
                    let years = t.split(/\r?\n/).map(l => KHCB.parseCSVLine(l)[0]).filter(y => y && !y.toLowerCase().includes('năm') && !y.toLowerCase().includes('config'));
                    const yS = document.getElementById('tYear');
                    yS.innerHTML = years.map(y => `<option value="${y}">Dữ liệu năm ${y}</option>`).join('');
                    yS.onchange = () => loadSheet(yS.value);
                    if (years.length) loadSheet(years[0]);
                });
        } else loadSheet();
    },

    // ----------------- MODULE 3: LỊCH GIẢNG DẠY -----------------
    renderSchedule: function(root, cfg) {
        root.innerHTML = `
            <h2 class="header-title"><i class="fa-solid fa-calendar-days"></i> LỊCH GIẢNG DẠY TOÀN KHOA</h2>
            <div class="filter-section">
                <div class="filter-container-left">
                    <div class="filter-group"><label>Thứ:</label><select id="sDay"><option value="ALL">-- Tất cả --</option></select></div>
                    <div class="filter-group"><label>Ca:</label><select id="sShift"><option value="ALL">-- Tất cả --</option></select></div>
                    <div class="filter-group"><label>Giảng viên:</label><input type="text" id="sTeacher" placeholder="Tìm tên giảng viên..." list="sTeacherList"><datalist id="sTeacherList"></datalist></div>
                </div>
                <button class="btn btn-primary" onclick="KHCB.exportScheduleWord()"><i class="fa-solid fa-file-word"></i> Tải Lịch Word</button>
            </div>
            <div id="loading"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải...</div>
            <div class="table-responsive"><table id="sTable" style="display:none;"><thead><tr><th>STT</th><th>GIẢNG VIÊN</th><th>THỨ</th><th>CA</th><th>LỚP</th><th>PHÒNG</th><th>SĨ SỐ</th><th>THỜI GIAN</th></tr></thead><tbody id="sBody"></tbody></table></div>`;

        let rawList = [];
        fetch(`https://docs.google.com/spreadsheets/d/${cfg.sheetId}/gviz/tq?tqx=out:csv`).then(r => r.text()).then(txt => {
            let lines = txt.split(/\r?\n/);
            for (let i = 1; i < lines.length; i++) {
                let c = KHCB.parseCSVLine(lines[i]);
                if (c.length >= 8 && (c[1] || c[4])) {
                    let d = c[2].trim();
                    rawList.push({ stt: c[0].trim(), teacher: c[1].trim(), rawDay: parseInt(d)||99, day: (d==='8'||d.toUpperCase()==='CN')?'CN':d, shift: c[3].trim(), className: c[4].trim(), room: c[5].trim(), count: c[6].trim(), time: c[7].trim() });
                }
            }
            rawList.sort((a,b) => a.rawDay !== b.rawDay ? a.rawDay - b.rawDay : (parseInt(a.shift)||0) - (parseInt(b.shift)||0));
            KHCB._schedData = rawList;
            document.getElementById('loading').style.display = 'none';
            document.getElementById('sTable').style.display = 'table';
            
            // Populate Filters
            let days = new Set(), shifts = new Set(), teachers = new Set();
            rawList.forEach(r => { if(r.day) days.add(r.day); if(r.shift) shifts.add(r.shift); if(r.teacher) teachers.add(r.teacher); });
            days.forEach(d => document.getElementById('sDay').innerHTML += `<option value="${d}">${d==='CN'?'CN':'Thứ '+d}</option>`);
            shifts.forEach(s => document.getElementById('sShift').innerHTML += `<option value="${s}">Ca ${s}</option>`);
            teachers.forEach(t => document.getElementById('sTeacherList').innerHTML += `<option value="${t}">`);

            const applyS = () => {
                let dV = document.getElementById('sDay').value, sV = document.getElementById('sShift').value, tV = KHCB.normalizeStr(document.getElementById('sTeacher').value);
                let f = rawList.filter(i => (dV==='ALL'||i.day===dV) && (sV==='ALL'||i.shift===sV) && (!tV || KHCB.normalizeStr(i.teacher).includes(tV)));
                KHCB._schedFiltered = f;
                let b = document.getElementById('sBody'); b.innerHTML = '';
                if(!f.length) { b.innerHTML = '<tr><td colspan="8" class="empty-message">Không có lịch dạy phù hợp</td></tr>'; return; }
                f.forEach((it, idx) => {
                    b.innerHTML += `<tr><td style="text-align:center;font-weight:bold;">${idx+1}</td><td style="color:var(--teacher-color);font-weight:bold;">${it.teacher}</td><td style="text-align:center;font-weight:bold;">${it.day}</td><td style="text-align:center;">${it.shift}</td><td style="text-align:center;">${it.className}</td><td style="text-align:center;font-weight:bold;">${it.room}</td><td style="text-align:center;">${it.count}</td><td style="text-align:center;color:#555;">${it.time}</td></tr>`;
                });
            };
            document.getElementById('sDay').onchange = applyS;
            document.getElementById('sShift').onchange = applyS;
            document.getElementById('sTeacher').oninput = applyS;
            applyS();
        });
    },
    exportScheduleWord: function() {
        let data = KHCB._schedFiltered || [];
        if (!data.length) return alert("Không có dữ liệu để tải!");
        let rows = data.map((it, i) => `<tr><td style="border:1px solid #000;padding:6px;text-align:center;">${i+1}</td><td style="border:1px solid #000;padding:6px;font-weight:bold;">${it.teacher}</td><td style="border:1px solid #000;padding:6px;text-align:center;">${it.day}</td><td style="border:1px solid #000;padding:6px;text-align:center;">${it.shift}</td><td style="border:1px solid #000;padding:6px;text-align:center;">${it.className}</td><td style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">${it.room}</td><td style="border:1px solid #000;padding:6px;text-align:center;">${it.count}</td><td style="border:1px solid #000;padding:6px;text-align:center;">${it.time}</td></tr>`).join('');
        let blob = new Blob(['\ufeff<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body><h2 style="text-align:center;">LỊCH GIẢNG DẠY</h2><table border="1" style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f2f2f2;"><th>STT</th><th>GIẢNG VIÊN</th><th>THỨ</th><th>CA</th><th>LỚP</th><th>PHÒNG</th><th>SĨ SỐ</th><th>THỜI GIAN</th></tr></thead><tbody>' + rows + '</tbody></table></body></html>'], {type: 'application/msword'});
        let a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Lich_Giang.doc'; a.click();
    },

    // ----------------- MODULE 4: KẾ HOẠCH ĐÀO TẠO -----------------
    renderPlan: function(root, cfg) {
        root.innerHTML = `
            <h2 class="header-title"><i class="fa-solid fa-book-open"></i> KẾ HOẠCH ĐÀO TẠO KHOA</h2>
            <div class="filter-section">
                <div class="filter-group"><label>Khóa tuyển sinh:</label><select id="pCohort"></select></div>
                <div class="filter-group"><label>Kì học:</label><select id="pKi"><option value="ALL">-- Tất cả --</option></select></div>
                <div class="filter-group"><label>Khoa quản lí:</label><select id="pKhoa"><option value="ALL">-- Tất cả --</option></select></div>
            </div>
            <div class="table-responsive"><table id="plTable"><thead><tr><th>STT</th><th>KHỐI KT</th><th>MÃ HP</th><th>TÊN HỌC PHẦN</th><th>KÌ</th><th>KHOA QL</th><th>TÌNH TRẠNG</th></tr></thead><tbody id="plBody"></tbody></table></div>`;

        fetch(`https://docs.google.com/spreadsheets/d/${cfg.sheetId}/gviz/tq?tqx=out:csv&gid=${cfg.gid||'0'}`).then(r=>r.text()).then(txt => {
            let lines = txt.split(/\r?\n/), raw = [], cohorts = [], cIdx = {};
            for (let l of lines) {
                let cols = KHCB.parseCSVLine(l);
                if (cols.length > 3 && cols[3] && cols[3].trim().toUpperCase() === 'HỌC PHẦN') {
                    for(let c = 14; c <= 25; c++) { if (c < cols.length && cols[c].trim()) { cohorts.push(cols[c].trim()); cIdx[cols[c].trim()] = c; } }
                    continue;
                }
                let stt = parseInt(cols[0]);
                if (!isNaN(stt) && stt > 0) {
                    let ki = ""; for(let k = 5; k <= 12; k++) { if(k < cols.length && cols[k].trim()) { ki = cols[k].trim(); break; } }
                    let stats = {}; cohorts.forEach(y => stats[y] = (cIdx[y] < cols.length && cols[cIdx[y]].trim() === "1") ? "Đã giảng dạy" : "Chưa giảng dạy");
                    raw.push({ stt, kt: cols[1]||'', ma: cols[2]||'', ten: cols[3]||'', ki, khoa: cols[13]||'', stats });
                }
            }
            // Populate
            const cSel = document.getElementById('pCohort');
            cohorts.forEach(y => cSel.innerHTML += `<option value="${y}">Khóa ${y}</option>`);
            let kis = new Set(), khoas = new Set();
            raw.forEach(i => { if(i.ki) kis.add(i.ki); if(i.khoa) khoas.add(i.khoa); });
            kis.forEach(k => document.getElementById('pKi').innerHTML += `<option value="${k}">Kì ${k}</option>`);
            khoas.forEach(k => document.getElementById('pKhoa').innerHTML += `<option value="${k}">${k}</option>`);

            const applyP = () => {
                let ch = cSel.value, kiV = document.getElementById('pKi').value, khV = document.getElementById('pKhoa').value;
                let f = raw.filter(i => (kiV==='ALL'||i.ki===kiV) && (khV==='ALL'||i.khoa===khV));
                let tb = document.getElementById('plBody'); tb.innerHTML = '';
                f.forEach((it, idx) => {
                    let st = it.stats[ch] || "Chưa giảng dạy";
                    let bdg = st === "Đã giảng dạy" ? "badge-success" : "badge-pending";
                    tb.innerHTML += `<tr><td style="text-align:center;font-weight:bold;">${idx+1}</td><td>${it.kt}</td><td style="font-weight:bold;color:var(--primary-color);">${it.ma}</td><td style="font-weight:bold;">${it.ten}</td><td style="text-align:center;">${it.ki}</td><td>${it.khoa}</td><td style="text-align:center;"><span class="${bdg}">${st}</span></td></tr>`;
                });
            };
            cSel.onchange = applyP; document.getElementById('pKi').onchange = applyP; document.getElementById('pKhoa').onchange = applyP;
            applyP();
        });
    },

    // ----------------- MODULE 5: BÁO CÁO CÔNG VIỆC -----------------
    renderReport: function(root, cfg) {
        root.innerHTML = `
            <h2 class="header-title"><i class="fa-solid fa-chart-line"></i> THỐNG KÊ BÁO CÁO CÔNG VIỆC</h2>
            <div class="filter-section">
                <div class="filter-group"><label>Nhân sự:</label><select id="rName"><option value="ALL">-- Tất cả --</option></select></div>
                <div class="filter-group"><label>Từ ngày:</label><input type="date" id="rStart"></div>
                <div class="filter-group"><label>Đến ngày:</label><input type="date" id="rEnd"></div>
                <button class="btn btn-primary" onclick="KHCB.exportReportWord()"><i class="fa-solid fa-file-arrow-down"></i> Lọc & Tải Word</button>
            </div>
            <span id="rNote" class="section-note">Đang hiển thị 10 công việc mới nhất</span>
            <div class="table-responsive"><table id="rTable"><thead><tr><th>STT</th><th>NGÀY BÁO CÁO</th><th>HỌ VÀ TÊN</th><th>MÔ TẢ CÔNG VIỆC</th><th>NGÀY THỰC HIỆN</th></tr></thead><tbody id="rBody"></tbody></table></div>`;

        let raw = [];
        fetch(`https://docs.google.com/spreadsheets/d/${cfg.sheetId}/gviz/tq?tqx=out:csv`).then(r=>r.text()).then(txt => {
            let lines = txt.split(/\r?\n/);
            for(let i=1; i<lines.length; i++) {
                let c = KHCB.parseCSVLine(lines[i]);
                if (c.length >= 4 && (c[0] || c[1])) {
                    let dParts = c[0].split(' ')[0].split('/');
                    let dObj = dParts.length === 3 ? new Date(dParts[2], dParts[0]-1, dParts[1]) : new Date(c[0]);
                    let cleanName = c[1].trim().replace(/\s+/g, ' ').replace(/(^\w{1})|(\s+\w{1})/g, l => l.toUpperCase());
                    raw.push({ dObj, dStr: KHCB.formatDateUI(dObj), name: cleanName, desc: c[2].trim(), doneDate: c[3].trim() });
                }
            }
            raw.sort((a,b) => b.dObj - a.dObj);
            KHCB._repData = raw;

            let names = new Set(); raw.forEach(r => names.add(r.name));
            names.forEach(n => document.getElementById('rName').innerHTML += `<option value="${n}">${n}</option>`);

            const applyR = (isAction) => {
                let sN = document.getElementById('rName').value, sD = document.getElementById('rStart').value, eD = document.getElementById('rEnd').value;
                let st = sD ? new Date(sD) : null, en = eD ? new Date(eD) : null;
                if(en) en.setHours(23,59,59,999);
                let f = raw.filter(i => (sN==='ALL'||i.name===sN) && (!st||i.dObj>=st) && (!en||i.dObj<=en));
                KHCB._repFiltered = f;
                document.getElementById('rNote').innerText = isAction ? `Đang hiển thị kết quả lọc (${f.length} công việc)` : "Đang hiển thị 10 công việc mới nhất";
                let showList = isAction ? f : f.slice(0, 10);
                let tb = document.getElementById('rBody'); tb.innerHTML = '';
                showList.forEach((it, idx) => {
                    tb.innerHTML += `<tr><td style="text-align:center;font-weight:bold;">${idx+1}</td><td>${it.dStr}</td><td style="font-weight:bold;color:var(--teacher-color);">${it.name}</td><td>${it.desc}</td><td>${it.doneDate}</td></tr>`;
                });
            };
            document.getElementById('rName').onchange = () => applyR(true);
            applyR(false);
        });
    },
    exportReportWord: function() {
        let f = KHCB._repFiltered || [];
        if(!f.length) return alert("Không có dữ liệu để xuất file!");
        let rows = f.map((it, i) => `<tr><td style="border:1px solid #000;padding:6px;text-align:center;">${i+1}</td><td style="border:1px solid #000;padding:6px;">${it.dStr}</td><td style="border:1px solid #000;padding:6px;font-weight:bold;">${it.name}</td><td style="border:1px solid #000;padding:6px;">${it.desc}</td><td style="border:1px solid #000;padding:6px;">${it.doneDate}</td></tr>`).join('');
        let blob = new Blob(['\ufeff<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body><h2 style="text-align:center;">BÁO CÁO CÔNG VIỆC</h2><table border="1" style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f2f2f2;"><th>STT</th><th>NGÀY BÁO CÁO</th><th>HỌ VÀ TÊN</th><th>MÔ TẢ CÔNG VIỆC</th><th>NGÀY THỰC HIỆN</th></tr></thead><tbody>' + rows + '</tbody></table></body></html>'], {type: 'application/msword'});
        let a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Bao_Cao_Cong_Viec.doc'; a.click();
    },

    // ----------------- MODULE 6: VIDEO BÀI GIẢNG -----------------
    renderVideo: function(root, cfg) {
        root.innerHTML = `
            <div class="subject-header-area">
                <div class="subject-title" id="vTitle">${cfg.title || 'Video bài giảng'}</div>
                <div class="search-box"><input type="text" placeholder="Tìm kiếm bài giảng..."></div>
            </div>
            <div class="main-video-layout" id="vLayout">
                <div class="video-column">
                    <div class="video-header"><span id="vLessonName">Chờ tải...</span><button class="btn-maximize" onclick="document.getElementById('vLayout').classList.toggle('maximized-mode')">⛶</button></div>
                    <div class="video-wrapper"><iframe id="vIframe" allowfullscreen src=""></iframe></div>
                </div>
                <div class="sidebar-column">
                    <div class="sidebar-header">Mục lục bài giảng</div>
                    <div class="menu-scroll-container" id="vMenu"></div>
                </div>
            </div>
            <div class="current-lesson-bottom-display" id="vBottomSub">KHOA KHOA HỌC CƠ BẢN VÀ DỮ LIỆU</div>`;

        // Đọc data từ Sheet Video (B1:I200)
        fetch(`https://docs.google.com/spreadsheets/d/${cfg.sheetId}/gviz/tq?sheet=${encodeURIComponent(cfg.sheetTab||'Trang tính1')}&range=B1:I200`)
            .then(r => r.text()).then(txt => {
                // Phân tích cây bài học từ Sheet hoặc nạp STATIC_DATA_STORE
                if (cfg.staticData) buildVideoUI(cfg.staticData);
            });

        if (cfg.staticData) buildVideoUI(cfg.staticData);

        function buildVideoUI(data) {
            const menu = document.getElementById('vMenu'); menu.innerHTML = '';
            let first = false;
            data.lessons.forEach(lesson => {
                let block = document.createElement('div'); block.className = 'lesson-row-block';
                let head = document.createElement('div'); head.className = 'menu-lesson-header has-child collapsed';
                head.innerHTML = `<span>${lesson.lessonTitle}</span>`;
                let partsC = document.createElement('div'); partsC.className = 'lesson-parts-container hidden';
                
                head.onclick = () => {
                    let col = head.classList.contains('collapsed');
                    document.querySelectorAll('.menu-lesson-header').forEach(h => h.classList.add('collapsed'));
                    document.querySelectorAll('.lesson-parts-container').forEach(p => p.classList.add('hidden'));
                    if (col) { head.classList.remove('collapsed'); partsC.classList.remove('hidden'); }
                };

                lesson.parts.forEach(p => {
                    let item = document.createElement('div'); item.className = 'menu-item';
                    item.innerHTML = `<span class="lesson-name">${p.partTitle}</span>`;
                    let match = p.linkUrl.match(/^.*(youtu.be\/|v\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
                    let yId = (match && match[2].length === 11) ? match[2] : null;

                    if (yId) {
                        item.onclick = (e) => {
                            if (e.target.closest('a')) return;
                            document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
                            item.classList.add('active');
                            document.getElementById('vIframe').src = `https://www.youtube.com/embed/${yId}?autoplay=1&rel=0`;
                            document.getElementById('vLessonName').innerText = p.partTitle;
                        };
                        if (!first) {
                            head.classList.remove('collapsed'); partsC.classList.remove('hidden'); item.classList.add('active');
                            document.getElementById('vIframe').src = `https://www.youtube.com/embed/${yId}?autoplay=0&rel=0`;
                            document.getElementById('vLessonName').innerText = p.partTitle;
                            first = true;
                        }
                    } else if (p.linkUrl) {
                        item.innerHTML += `<a href="${p.linkUrl}" target="_blank" class="btn-download-icon-only"><svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13 l-5 5-5-5h3V9h4v4h3z"/></svg></a>`;
                    }
                    partsC.appendChild(item);
                });
                block.appendChild(head); block.appendChild(partsC); menu.appendChild(block);
            });
        }
    }
};
