// ============ LÓGICA DO PAINEL DE ADMINISTRAÇÃO ============
function initAdminPanel() {
  const c = companies.find((x) => x.id === currentUser.companyId);
  if (!c) return;
  document.getElementById('admCompanySidebar').textContent = c.name;
  document.getElementById('sidebarAdminName').textContent =
    currentUser.name.split(' ')[0];
  document.getElementById('adminAvatar').textContent = currentUser.name
    .charAt(0)
    .toUpperCase();
  updateCurrentDate('adminCurrentDate');

  showAdminSection('dashboard');

  setTimeout(runAutoCleanup, 5000);
}

async function showAdminSection(sec) {
  const palco = document.getElementById('adminConteudoDinamico');
  if (!palco)
    return console.error('Erro fatal: adminConteudoDinamico não existe!');

  document
    .querySelectorAll('#adminPanel .nav-item')
    .forEach((i) => i.classList.remove('active'));
  const activeNav = document.querySelector(
    `#adminPanel .nav-item[onclick*="${sec}"]`
  );
  if (activeNav) activeNav.classList.add('active');

  palco.innerHTML =
    '<div style="text-align:center; padding:50px;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i> A carregar...</div>';

  try {
    const rotas = {
      dashboard: 'admin-dashboard.html',
      'new-task': 'admin-nova-atividade.html',
      'all-activities': 'admin-historico.html',
      users: 'admin-usuarios.html',
      teams: 'admin-equipes.html',
      reports: 'admin-relatorios.html',
      settings: 'admin-configuracoes.html',
    };
    const resposta = await fetch(`./telas/${rotas[sec]}`);
    if (!resposta.ok)
      throw new Error('Erro de fetch: Ficheiro não encontrado.');
    palco.innerHTML = await resposta.text();

    const c = companies.find((x) => x.id === currentUser.companyId);

    if (sec === 'dashboard') {
      const dashTeam = document.getElementById('dashFilterTeam');
      if (dashTeam)
        dashTeam.innerHTML =
          '<option value="">Todas as Equipes</option>' +
          (c.teams || [])
            .map((t) => `<option value="${t}">${t}</option>`)
            .join('');
      refreshAdminDashboard();
      updateCurrentDate('adminCurrentDate');
    } else if (sec === 'new-task') {
      if (typeof setTodayDate === 'function') setTodayDate('adminTaskDate');
      const catEl = document.getElementById('adminTaskCategory');
      if (catEl)
        catEl.innerHTML = (c.categories || defaultCategories)
          .map((cat) => `<option value="${cat}">${cat}</option>`)
          .join('');
      setupAdminNewTaskForm();
    } else if (sec === 'all-activities') {
      populateAdminFilters(c);
      loadAllActivities();
    } else if (sec === 'users') {
      const teamEl = document.getElementById('newUserTeam');
      if (teamEl)
        teamEl.innerHTML = (c.teams || [])
          .map((t) => `<option value="${t}">${t}</option>`)
          .join('');
      loadUsersTable();
      setupNewUserForm();
    } else if (sec === 'teams') {
      loadTeams(c);
      setupNewTeamForm();
    } else if (sec === 'reports') {
      const teamFilter = document.getElementById('reportFilterTeam');
      if (teamFilter)
        teamFilter.innerHTML =
          '<option value="">Todas as Equipes</option>' +
          (c.teams || [])
            .map((t) => `<option value="${t}">${t}</option>`)
            .join('');
      const userFilter = document.getElementById('reportFilterUser');
      if (userFilter)
        userFilter.innerHTML =
          '<option value="">Todos os Colaboradores</option>' +
          users
            .filter((u) => u.companyId === c.id)
            .map((u) => `<option value="${u.id}">${u.name}</option>`)
            .join('');
    } else if (sec === 'settings') {
      const compInput = document.getElementById('settingsCompanyName');
      if (compInput) compInput.value = c.name;
      const profileInput = document.getElementById('admProfileName');
      if (profileInput) profileInput.value = currentUser.name;
      loadCategories(c);
      setupAdminSettingsForms();
    }
  } catch (err) {
    palco.innerHTML = `<div class="alert alert-error">Erro ao carregar ecrã: ${err.message}</div>`;
  }
}

window.refreshAdminDashboard = function () {
  updateAdminStats();
  loadAdminRecentActivities();
  if (typeof renderAdminCharts === 'function') renderAdminCharts();
  const c = companies.find((x) => x.id === currentUser.companyId);
  const elAviso = document.getElementById('adminAnnouncementText');
  if (elAviso && c) elAviso.value = c.announcement || '';
};

window.saveAnnouncement = function () {
  const txt = document.getElementById('adminAnnouncementText').value;
  const btn = document.getElementById('btnSaveAnnouncement');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A Publicar...';
  btn.disabled = true;
  db.collection('empresas')
    .doc(currentUser.companyId.toString())
    .update({ announcement: txt })
    .then(() => {
      showToast('Aviso publicado para todos!');
      btn.innerHTML = originalText;
      btn.disabled = false;
    });
};

function getDashFilteredActivities() {
  const team = document.getElementById('dashFilterTeam')
    ? document.getElementById('dashFilterTeam').value
    : '';
  let acts = activities.filter((a) => a.companyId === currentUser.companyId);
  if (team) {
    const teamUsers = users.filter((u) => u.team === team).map((u) => u.id);
    acts = acts.filter((a) => teamUsers.includes(a.userId));
  }
  return acts;
}

function updateAdminStats() {
  try {
    const acts = getDashFilteredActivities();
    const team = document.getElementById('dashFilterTeam')
      ? document.getElementById('dashFilterTeam').value
      : '';
    let filteredUsers = users.filter(
      (u) => u.companyId === currentUser.companyId && u.active
    );
    if (team) filteredUsers = filteredUsers.filter((u) => u.team === team);

    const elUsers = document.getElementById('dashActiveUsers');
    if (elUsers) elUsers.textContent = filteredUsers.length;
    const elTotal = document.getElementById('dashTotalActivities');
    if (elTotal) elTotal.textContent = acts.length;
    const elConc = document.getElementById('dashCompletedActivities');
    if (elConc)
      elConc.textContent = acts.filter((a) => a.status === 'concluido').length;
    const elPend = document.getElementById('dashPendingActivities');
    if (elPend)
      elPend.textContent = acts.filter((a) => a.status === 'pendente').length;
  } catch (err) {
    console.error('Erro nas stats:', err);
  }
}

function loadAdminRecentActivities() {
  const el = document.getElementById('adminRecentActivities');
  if (!el) return;
  const lista = getDashFilteredActivities()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);
  el.innerHTML = generateActivityTableHTML(lista, true);
}

let adminStatusChartInstance = null;
let adminCategoryChartInstance = null;
let adminTimelineChartInstance = null;

window.renderAdminCharts = function () {
  const isDark = document.body.classList.contains('dark-mode');
  const textColor = isDark ? '#f8fafc' : '#1e293b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const acts = getDashFilteredActivities();

  const ctxStatus = document.getElementById('adminStatusChart');
  if (ctxStatus) {
    let conc = 0,
      and = 0,
      pend = 0;
    acts.forEach((a) => {
      if (a.status === 'concluido') conc++;
      else if (a.status === 'andamento') and++;
      else if (a.status === 'pendente') pend++;
    });
    const bgStatus = isDark
      ? [
          'rgba(74, 222, 128, 0.85)',
          'rgba(253, 224, 71, 0.85)',
          'rgba(248, 113, 113, 0.85)',
        ]
      : ['#22c55e', '#eab308', '#ef4444'];
    const borderStatus = isDark
      ? ['#22c55e', '#eab308', '#ef4444']
      : ['#ffffff', '#ffffff', '#ffffff'];

    if (adminStatusChartInstance) adminStatusChartInstance.destroy();
    adminStatusChartInstance = new Chart(ctxStatus, {
      type: 'doughnut',
      data: {
        labels: ['Concluído', 'Em Andamento', 'Pendente'],
        datasets: [
          {
            data: [conc, and, pend],
            backgroundColor: bgStatus,
            borderWidth: 2,
            borderColor: borderStatus,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor } },
        },
      },
    });
  }

  const ctxCategory = document.getElementById('adminCategoryChart');
  if (ctxCategory) {
    const catCounts = {};
    acts.forEach((a) => {
      const c = a.category || 'Geral';
      catCounts[c] = (catCounts[c] || 0) + 1;
    });
    const labels = Object.keys(catCounts);
    const data = Object.values(catCounts);
    const bgColors = labels.map((cat) => {
      const hue =
        typeof getCategoryHue === 'function' ? getCategoryHue(cat) : 200;
      return isDark
        ? `hsla(${hue}, 80%, 60%, 0.75)`
        : `hsla(${hue}, 85%, 45%, 0.75)`;
    });
    const borderColors = labels.map((cat) => {
      const hue =
        typeof getCategoryHue === 'function' ? getCategoryHue(cat) : 200;
      return isDark ? `hsl(${hue}, 80%, 60%)` : `hsl(${hue}, 85%, 45%)`;
    });

    if (adminCategoryChartInstance) adminCategoryChartInstance.destroy();
    adminCategoryChartInstance = new Chart(ctxCategory, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Atividades',
            data: data,
            backgroundColor: bgColors,
            borderColor: borderColors,
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: textColor, stepSize: 1 },
            grid: { color: gridColor },
          },
          x: { ticks: { color: textColor }, grid: { display: false } },
        },
      },
    });
  }

  const ctxTimeline = document.getElementById('adminTimelineChart');
  if (ctxTimeline) {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(d.toISOString().split('T')[0]);
    }
    const dataTimeline = last7Days.map(
      (date) => acts.filter((a) => a.date === date).length
    );
    const labelsTimeline = last7Days.map((date) => {
      const p = date.split('-');
      return `${p[2]}/${p[1]}`;
    });

    if (adminTimelineChartInstance) adminTimelineChartInstance.destroy();
    adminTimelineChartInstance = new Chart(ctxTimeline, {
      type: 'line',
      data: {
        labels: labelsTimeline,
        datasets: [
          {
            label: 'Registros',
            data: dataTimeline,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: '#3b82f6',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: textColor },
            grid: { color: gridColor },
          },
          x: { ticks: { color: textColor }, grid: { display: false } },
        },
      },
    });
  }
};

// ============ SISTEMA DE PAGINAÇÃO (ADMINISTRADOR) ============
let currentAdminPage = 1;
let currentAdminFilteredActs = [];

function loadAllActivities() {
  currentAdminPage = 1; // Reseta para a página 1 ao abrir o ecrã
  applyAdminFilters(1); 
}

function populateAdminFilters(c) {
  const tEl = document.getElementById('admFilterTeam');
  const uEl = document.getElementById('adminFilterUser');
  if (tEl)
    tEl.innerHTML =
      '<option value="">Todas</option>' +
      (c.teams || []).map((t) => `<option value="${t}">${t}</option>`).join('');
  if (uEl)
    uEl.innerHTML =
      '<option value="">Todos</option>' +
      users
        .filter((u) => u.companyId === c.id && u.active)
        .map((u) => `<option value="${u.id}">${u.name}</option>`)
        .join('');
}

window.applyAdminFilters = function (page = 1) {
  currentAdminPage = page;
  
  const t = document.getElementById('admFilterTeam').value;
  const uId = document.getElementById('adminFilterUser').value;
  const s = document.getElementById('adminFilterStartDate').value;
  
  let f = activities.filter((a) => a.companyId === currentUser.companyId);
  
  if (uId) f = f.filter((a) => a.userId === parseInt(uId));
  if (s) f = f.filter((a) => a.date >= s);
  if (t) {
    const tUs = users.filter((u) => u.team === t).map((u) => u.id);
    f = f.filter((a) => tUs.includes(a.userId));
  }
  
  // Ordena SEMPRE do mais novo para o mais antigo, com desempate por hora exata
  currentAdminFilteredActs = f.sort((a, b) => {
    const diffData = new Date(b.date) - new Date(a.date);
    // Se a data for exatamente igual, desempata pelo relógio interno (createdAt)
    if (diffData === 0 && a.createdAt && b.createdAt) {
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
    return diffData;
  });

  // 👇 ESTA LINHA FALTAVA: Atualiza o visual da tabela do Admin!
  renderAdminHistoryPage();
};

window.renderAdminHistoryPage = function() {
  const el = document.getElementById('adminActivitiesTable');
  if (!el) return;

  const itemsPerPage = 20; // 20 Itens por página
  const totalPages = Math.ceil(currentAdminFilteredActs.length / itemsPerPage) || 1;
  
  if (currentAdminPage > totalPages) currentAdminPage = totalPages;
  if (currentAdminPage < 1) currentAdminPage = 1;

  // Fatiar a lista para pegar apenas os 20 da página atual
  const start = (currentAdminPage - 1) * itemsPerPage;
  const actsPage = currentAdminFilteredActs.slice(start, start + itemsPerPage);

  // Gerar a tabela com a "fatia"
  let html = generateActivityTableHTML(actsPage, true);

  // Adicionar controlos de paginação no final da tabela
  if (totalPages > 1) {
      html += `
      <div style="display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 25px; padding: 10px;">
          <button class="btn btn-secondary btn-small" onclick="applyAdminFilters(${currentAdminPage - 1})" ${currentAdminPage === 1 ? 'disabled' : ''}>
              <i class="fa-solid fa-chevron-left"></i> Anterior
          </button>
          <span style="font-size: 14px; font-weight: bold; color: var(--color-text-secondary);">
              Página ${currentAdminPage} de ${totalPages}
          </span>
          <button class="btn btn-secondary btn-small" onclick="applyAdminFilters(${currentAdminPage + 1})" ${currentAdminPage === totalPages ? 'disabled' : ''}>
              Próxima <i class="fa-solid fa-chevron-right"></i>
          </button>
      </div>`;
  }
  
  el.innerHTML = html;
};

function loadUsersTable() {
  const emps = users.filter(
    (u) => u.companyId === currentUser.companyId && u.active
  );
  const el = document.getElementById('usersTable');
  if (!el) return;
  if (!emps.length) {
    el.innerHTML = '<p>Sem usuários.</p>';
    return;
  }
  el.innerHTML = `<div class="table-container"><table><thead><tr><th>Nome</th><th>Equipe</th><th>E-mail</th><th>Ações</th></tr></thead><tbody>${emps
    .map(
      (u) =>
        `<tr><td><strong>${u.name}</strong> ${
          u.role === 'admin'
            ? '<span class="badge" style="background:#EDE9FE;color:#7C3AED;">Admin</span>'
            : ''
        }</td><td>${u.team || '-'}</td><td>${
          u.email
        }</td><td><button onclick="openEditUserModal(${
          u.id
        })" class="btn-icon-only edit"><i class="fa-solid fa-pen"></i></button>${
          u.id !== currentUser.id
            ? `<button onclick="deleteUser(${u.id})" class="btn-icon-only delete"><i class="fa-solid fa-trash"></i></button>`
            : '-'
        }</td></tr>`
    )
    .join('')}</tbody></table></div>`;
}

window.deleteUser = function (id) {
  showConfirm(
    'Excluir este colaborador para sempre?',
    () => {
      db.collection('usuarios')
        .doc(id.toString())
        .delete()
        .then(() => showToast('Excluído.'));
    },
    'Excluir Colaborador'
  );
};

function loadTeams(c) {
  const el = document.getElementById('teamsList');
  if (!el) return;
  el.innerHTML = (c.teams || [])
    .map(
      (t, i) =>
        `<li style="display:flex; justify-content:space-between; padding:12px; background:var(--color-bg-primary); border:1px solid var(--color-border); margin-bottom:8px;"><span>${t}</span><button onclick="deleteTeam(${i})" class="btn-icon-only delete"><i class="fa-solid fa-trash"></i></button></li>`
    )
    .join('');
}

window.deleteTeam = function (i) {
  let c = companies.find((x) => x.id === currentUser.companyId);
  c.teams.splice(i, 1);
  db.collection('empresas')
    .doc(c.id.toString())
    .update({ teams: c.teams })
    .then(() => {
      loadTeams(c);
      showToast('Equipe apagada');
    });
};

function loadCategories(c) {
  const el = document.getElementById('categoriesList');
  if (!el) return;
  el.innerHTML = (c.categories || defaultCategories)
    .map(
      (cat, i) =>
        `<span class="badge cat-badge-dynamic" style="${getCategoryStyleString(
          cat
        )} display:inline-flex; align-items:center; gap:6px; padding: 6px 14px;">${cat} <i class="fa-solid fa-circle-xmark" style="cursor:pointer; opacity: 0.8;" onclick="deleteCategory(${i})"></i></span>`
    )
    .join('');
}

window.deleteCategory = function (i) {
  let c = companies.find((x) => x.id === currentUser.companyId);
  if (c.categories.length > 1) {
    c.categories.splice(i, 1);
    db.collection('empresas')
      .doc(c.id.toString())
      .update({ categories: c.categories })
      .then(() => loadCategories(c));
  }
};

window.updateCompanyName = function () {
  const n = document.getElementById('settingsCompanyName').value.trim();
  if (!n) return;
  const btn = document.querySelector('button[onclick="updateCompanyName()"]');
  if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  db.collection('empresas')
    .doc(currentUser.companyId.toString())
    .update({ name: n })
    .then(() => {
      document.getElementById('admCompanySidebar').textContent = n;
      showToast('Nome atualizado!');
      if (btn)
        btn.innerHTML =
          '<i class="fa-solid fa-floppy-disk"></i> Guardar Alterações';
    });
};

function setupAdminNewTaskForm() {
  const form = document.getElementById('adminNewTaskForm');
  if (!form) return;
  const novoForm = form.cloneNode(true);
  form.parentNode.replaceChild(novoForm, form);

  // === LÓGICA DOS 3 ARQUIVOS NO ADMIN ===
  const fileInput = novoForm.querySelector('#adminTaskAttachment');
  const fileListDisplay = novoForm.querySelector('#adminFileListDisplay');
  let arquivosSelecionados = [];

  if (fileInput) {
    fileInput.addEventListener('change', function () {
      const files = Array.from(this.files);

      if (files.length > 3) {
        showToast('Máximo de 3 arquivos!', 'error');
        this.value = '';
        fileListDisplay.innerHTML = '';
        arquivosSelecionados = [];
        return;
      }

      arquivosSelecionados = [];
      fileListDisplay.innerHTML = '';

      for (let i = 0; i < files.length; i++) {
        if (files[i].size > 1 * 1024 * 1024) {
          showToast(`O arquivo ${files[i].name} é maior que 1MB!`, 'error');
          this.value = '';
          fileListDisplay.innerHTML = '';
          arquivosSelecionados = [];
          return;
        }
        arquivosSelecionados.push(files[i]);
        fileListDisplay.innerHTML += `<div class="custom-file-item"><i class="fa-solid fa-file-lines" style="color: var(--color-info);"></i> ${files[i].name}</div>`;
      }
    });
  }

  novoForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const btn = novoForm.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> A Processar...';
    btn.disabled = true;

    const novaAtividade = {
      companyId: currentUser.companyId,
      userId: currentUser.id,
      date: document.getElementById('adminTaskDate').value,
      category: document.getElementById('adminTaskCategory').value,
      title: document.getElementById('adminTaskTitle').value,
      description: document.getElementById('adminTaskDescription').value,
      status: document.getElementById('adminTaskStatus').value,
      createdAt: new Date().toISOString(),
    };

    const salvarNoBanco = (atividadeFinal) => {
      atividadeFinal.id = nextActivityId;
      db.collection('atividades')
        .doc(atividadeFinal.id.toString())
        .set(atividadeFinal)
        .then(() => {
          showAdminSection('dashboard').then(() =>
            showToast('Atividade registrada!')
          );
        })
        .catch(() => {
          btn.innerHTML = originalText;
          btn.disabled = false;
          showToast('Erro ao salvar!', 'error');
        });
    };

    if (arquivosSelecionados.length > 0) {
      btn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> A Processar Anexos...';
      const promessasDeArquivos = arquivosSelecionados.map((file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = function (evento) {
            resolve({ name: file.name, url: evento.target.result });
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(promessasDeArquivos).then((anexosProntos) => {
        novaAtividade.attachments = anexosProntos;
        salvarNoBanco(novaAtividade);
      });
    } else {
      salvarNoBanco(novaAtividade);
    }
  });
}

function setupNewUserForm() {
  const form = document.getElementById('newUserForm');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const em = document.getElementById('newUserEmail').value.trim();
    if (users.find((u) => u.email === em))
      return showToast('E-mail já em uso.', 'error');

    let nId = nextUserId;
    const nUser = {
      id: nId,
      companyId: currentUser.companyId,
      name: document.getElementById('newUserName').value.trim(),
      email: em,
      password: document.getElementById('newUserPassword').value,
      role: document.getElementById('newUserRole')
        ? document.getElementById('newUserRole').value
        : 'funcionario',
      active: true,
      team: document.getElementById('newUserTeam').value,
    };
    db.collection('usuarios')
      .doc(nId.toString())
      .set(nUser)
      .then(() => {
        form.reset();
        if (typeof sendWelcomeEmail === 'function')
          sendWelcomeEmail(nUser.name, nUser.email, nUser.password);
        showToast('Colaborador criado!');
      });
  });
}

function setupNewTeamForm() {
  const form = document.getElementById('newTeamForm');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const n = document.getElementById('newTeamName').value.trim();
    let c = companies.find((x) => x.id === currentUser.companyId);
    if (!c.teams) c.teams = [];
    if (!c.teams.includes(n)) {
      c.teams.push(n);
      db.collection('empresas')
        .doc(c.id.toString())
        .update({ teams: c.teams })
        .then(() => {
          document.getElementById('newTeamName').value = '';
          showToast('Equipe criada!');
          loadTeams(c);
        });
    } else {
      showToast('Equipe já existe!', 'error');
    }
  });
}

function setupAdminSettingsForms() {
  const catForm = document.getElementById('addCategoryForm');
  if (catForm) {
    catForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const n = document.getElementById('newCategoryName').value.trim();
      let c = companies.find((x) => x.id === currentUser.companyId);
      if (!c.categories) c.categories = [...defaultCategories];
      if (!c.categories.includes(n)) {
        c.categories.push(n);
        db.collection('empresas')
          .doc(c.id.toString())
          .update({ categories: c.categories })
          .then(() => {
            document.getElementById('newCategoryName').value = '';
            loadCategories(c);
          });
      }
    });
  }

  const profForm = document.getElementById('admProfileForm');
  if (profForm) {
    profForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const newName = document.getElementById('admProfileName').value.trim();
      const newPass = document.getElementById('admProfilePassword').value;
      const btn = profForm.querySelector('button');
      if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

      let updates = {};
      if (newName) updates.name = newName;
      if (newPass) updates.password = newPass;

      db.collection('usuarios')
        .doc(currentUser.id.toString())
        .update(updates)
        .then(() => {
          if (newName) {
            currentUser.name = newName;
            document.getElementById('sidebarAdminName').textContent =
              currentUser.name.split(' ')[0];
            document.getElementById('adminAvatar').textContent =
              currentUser.name.charAt(0).toUpperCase();
          }
          document.getElementById('admProfilePassword').value = '';
          showNotice('admProfileAlert', 'Perfil atualizado!', 'success');
          if (btn)
            btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Atualizar';
        });
    });
  }
}

window.openSettingsTab = function (tabId, btnElement) {
  document
    .querySelectorAll('.settings-tab-content')
    .forEach((tab) => tab.style.removeProperty('display'));
  const navContainer = btnElement.closest('.settings-nav-list');
  if (navContainer)
    navContainer
      .querySelectorAll('.nav-list-item')
      .forEach((btn) => btn.classList.remove('active'));
  document.getElementById(tabId).style.display = 'block';
  btnElement.classList.add('active');
};

window.getFilteredReportData = function () {
  const t = document.getElementById('reportFilterTeam').value;
  const uId = document.getElementById('reportFilterUser').value;
  const s = document.getElementById('reportStartDate').value;
  const e = document.getElementById('reportEndDate').value;
  let f = activities.filter((a) => a.companyId === currentUser.companyId);
  if (s) f = f.filter((a) => a.date >= s);
  if (e) f = f.filter((a) => a.date <= e);
  if (t) {
    const tUs = users.filter((u) => u.team === t).map((u) => u.id);
    f = f.filter((a) => tUs.includes(a.userId));
  }
  if (uId) f = f.filter((a) => a.userId === parseInt(uId));
  return f.sort((a, b) => new Date(b.date) - new Date(a.date));
};

window.generateReport = function () {
  document.getElementById('periodReport').innerHTML = generateActivityTableHTML(
    getFilteredReportData(),
    true
  );
};
window.downloadReportExcel = function () {
  const a = getFilteredReportData();
  if (!a.length) return alert('Sem dados.');
  const d = a.map((act) => {
    const u = users.find((x) => x.id === act.userId);
    return {
      Data: formatDate(act.date),
      Equipe: u ? u.team : '-',
      Colaborador: u ? u.name : '-',
      Categoria: act.category || 'Geral',
      Título: act.title,
      Detalhes: act.description || '-',
      Status: act.status,
    };
  });
  const ws = XLSX.utils.json_to_sheet(d);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Relatorio');
  XLSX.writeFile(wb, 'Exportacao_FeedbackGo.xlsx');
};

window.openEditUserModal = function (id) {
  const u = users.find((x) => x.id === id);
  if (!u) return;
  const c = companies.find((x) => x.id === currentUser.companyId);
  const teamEl = document.getElementById('editUserTeam');
  if (teamEl)
    teamEl.innerHTML = (c.teams || [])
      .map((t) => `<option value="${t}">${t}</option>`)
      .join('');
  document.getElementById('editUserId').value = u.id;
  document.getElementById('editUserName').value = u.name;
  document.getElementById('editUserRole').value = u.role;
  document.getElementById('editUserTeam').value = u.team || '';
  document.getElementById('editUserModal').classList.remove('hidden');
};
window.closeEditUserModal = function () {
  document.getElementById('editUserModal').classList.add('hidden');
};

const editUserForm = document.getElementById('editUserForm');
if (editUserForm) {
  editUserForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('editUserId').value);
    const btn = editUserForm.querySelector('button[type="submit"]');
    const txtOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A Guardar...';
    btn.disabled = true;

    let updates = {
      name: document.getElementById('editUserName').value.trim(),
      role: document.getElementById('editUserRole').value,
      team: document.getElementById('editUserTeam').value,
    };
    db.collection('usuarios')
      .doc(id.toString())
      .update(updates)
      .then(() => {
        if (id === currentUser.id) {
          currentUser.name = updates.name;
          currentUser.role = updates.role;
          currentUser.team = updates.team;
          document.getElementById('sidebarAdminName').textContent =
            currentUser.name.split(' ')[0];
        }
        closeEditUserModal();
        showToast('Atualizado!');
        btn.innerHTML = txtOriginal;
        btn.disabled = false;
      });
  });
}
