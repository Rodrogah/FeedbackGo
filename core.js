// ============ 1. INTEGRAÇÃO FIREBASE & EMAIL ============
const firebaseConfig = {
  apiKey: 'AIzaSyCzNiOwGdmaOULQ3_UMNw0TX6w3J03vXVE',
  authDomain: 'feedbackgooficial.firebaseapp.com',
  projectId: 'feedbackgooficial',
  storageBucket: 'feedbackgooficial.firebasestorage.app',
  messagingSenderId: '531915627918',
  appId: '1:531915627918:web:5210c0851b4ae9b088d8df',
  measurementId: 'G-6N68F5759T',
};
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

const EMAILJS_SERVICE_ID = 'service_gmail';
const EMAILJS_TEMPLATE_GENERIC = 'template_welcome';
const EMAILJS_TEMPLATE_REPORT = 'template_report';

// ============ 2. VARIÁVEIS GLOBAIS ============
let companies = [],
  users = [],
  activities = [];
let currentUser = null,
  nextCompanyId = 1,
  nextUserId = 1,
  nextActivityId = 1;
let isFirstLoad = true;
const defaultCategories = [
  'Geral',
  'Reunião',
  'Desenvolvimento',
  'Suporte',
  'Vendas',
  'Formação',
];

/// ============ 3. MÁGICA DO TEMPO REAL (NOVA ARQUITETURA) ============
let loadState = { emp: false, usr: false, act: false };

function checkFirstLoad() {
  // Só liberta o login quando as 3 coleções terminarem de carregar
  if (isFirstLoad && loadState.emp && loadState.usr && loadState.act) {
    isFirstLoad = false;
    processAutoLogin();
  } else if (!isFirstLoad) {
    refreshLiveData();
  }
}

// 📡 Radar das Empresas
db.collection('empresas').onSnapshot(
  (snap) => {
    companies = snap.docs.map((doc) => doc.data());
    nextCompanyId =
      companies.length > 0 ? Math.max(...companies.map((c) => c.id)) + 1 : 1;
    loadState.emp = true;
    checkFirstLoad();
  },
  (err) => console.error('Erro Empresas:', err)
);

// 📡 Radar dos Usuários
db.collection('usuarios').onSnapshot(
  (snap) => {
    users = snap.docs.map((doc) => doc.data());
    nextUserId = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
    loadState.usr = true;
    checkFirstLoad();
  },
  (err) => console.error('Erro Usuários:', err)
);

// 📡 Radar das Atividades
db.collection('atividades').onSnapshot(
  (snap) => {
    activities = snap.docs.map((doc) => doc.data());
    nextActivityId =
      activities.length > 0 ? Math.max(...activities.map((a) => a.id)) + 1 : 1;
    loadState.act = true;
    checkFirstLoad();
  },
  (err) => console.error('Erro Atividades:', err)
);

function processAutoLogin() {
  const savedUserId = localStorage.getItem('feedbackgo_logged_user');
  if (savedUserId) {
    const autoUser = users.find(
      (u) => u.id === parseInt(savedUserId) && u.active
    );
    if (autoUser) {
      currentUser = autoUser;
      showPanel(autoUser.role);
      return;
    } else {
      localStorage.removeItem('feedbackgo_logged_user');
    }
  }
  showLoginScreen();
}

function refreshLiveData() {
  if (!currentUser) return;

  if (currentUser.role === 'admin') {
    if (typeof updateAdminStats === 'function') updateAdminStats();

    const palco = document.getElementById('adminConteudoDinamico');
    if (palco) {
      if (
        palco.querySelector('#adminRecentActivities') &&
        typeof loadAdminRecentActivities === 'function'
      )
        loadAdminRecentActivities();
      if (
        palco.querySelector('#adminActivitiesTable') &&
        typeof applyAdminFilters === 'function'
      )
        applyAdminFilters();
      if (
        palco.querySelector('#usersTable') &&
        typeof loadUsersTable === 'function'
      )
        loadUsersTable();
      if (
        palco.querySelector('#adminStatusChart') &&
        typeof renderAdminCharts === 'function'
      )
        renderAdminCharts();
    }
  } else {
    if (typeof updateEmployeeStats === 'function') updateEmployeeStats();

    const palcoFunc = document.getElementById('funcConteudoDinamico');
    if (palcoFunc) {
      if (
        palcoFunc.querySelector('#employeeRecentTasks') &&
        typeof loadEmployeeRecentTasks === 'function'
      )
        loadEmployeeRecentTasks();
      if (
        palcoFunc.querySelector('#employeeHistoryTable') &&
        typeof loadEmployeeHistory === 'function'
      )
        loadEmployeeHistory();
      if (
        palcoFunc.querySelector('#funcStatusChart') &&
        typeof renderFuncCharts === 'function'
      )
        renderFuncCharts();
    }
  }
}
// NOTA: A função saveData() antiga foi apagada porque agora cada ficheiro guarda na sua própria coleção!

// ============ 4. EMAILS ============
function sendWelcomeEmail(userName, userEmail, userPass) {
  const comp = companies.find((c) => c.id === currentUser.companyId);
  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_GENERIC, {
    to_name: userName,
    to_email: userEmail,
    subject: 'Bem-vindo à ' + (comp ? comp.name : 'FeedbackGo'),
    message_title: 'Sua conta foi criada',
    message_body: 'Seus dados de acesso:',
    label_destaque: 'Senha',
    password: userPass,
    extra_info: 'Altere a senha após o login.',
    company_name: comp ? comp.name : 'FeedbackGo',
  });
}
function sendFilteredReportEmail(event) {
  const filteredActs = getFilteredReportData();
  if (filteredActs.length === 0) return alert('Não há dados para enviar.');
  let txt = `Relatório Gerado:\nTotal: ${filteredActs.length}\n\n`;
  filteredActs.forEach((act) => {
    const u = users.find((x) => x.id === act.userId);
    txt += `[${formatDate(act.date)}] ${u ? u.name : 'Removido'} - ${
      act.category
    }: ${act.title} (${act.status})\n`;
  });
  const btn = event.currentTarget;
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A Enviar...';
  btn.disabled = true;
  emailjs
    .send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_REPORT, {
      to_name: currentUser.name,
      to_email: currentUser.email,
      relatorio_texto: txt,
    })
    .then(() => {
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Enviado!';
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.disabled = false;
      }, 3000);
    })
    .catch((err) => {
      alert('Erro ao enviar.');
      btn.innerHTML = orig;
      btn.disabled = false;
    });
}

// ============ 5. ATIVIDADES SHARED (COMPARTILHADAS) ============
function generateActivityTableHTML(acts, isAdmin = false) {
  if (!acts.length)
    return `<div class="empty-state"><i class="fa-solid fa-box-open empty-state-icon"></i><p>Nenhum registro encontrado.</p></div>`;
  return `<div class="table-container"><table><thead><tr>${
    isAdmin ? '<th>Membro</th>' : ''
  }<th>Data</th><th>Categoria</th><th>Atividade</th><th>Detalhes</th><th>Status</th><th>Ações</th></tr></thead><tbody>
          ${acts
            .map((a) => {
              const u = users.find((x) => x.id === a.userId);
              const canEdit = isAdmin || a.userId === currentUser.id;
              return `<tr>${
                isAdmin
                  ? `<td><strong>${
                      u ? u.name : 'Removido'
                    }</strong><br><span style="font-size:11px; color:#64748B;">${
                      u ? u.team : ''
                    }</span></td>`
                  : ''
              }
              <td style="white-space:nowrap">${formatDate(a.date)}</td>
              <td><span class="badge cat-badge-dynamic" style="${getCategoryStyleString(
                a.category || 'Geral'
              )}">${a.category || 'Geral'}</span></td>
              <td><strong>${
                a.title
              }</strong></td><td style="font-size: 12px; color: var(--color-text-secondary); max-width: 250px; white-space: normal;">${
                a.description ? a.description : '-'
              }</td>
              <td>${getStatusBadge(a.status)}</td><td>${
                canEdit
                  ? `
                  ${
                    (a.attachments && a.attachments.length > 0) ||
                    a.attachmentUrl
                      ? `<button type="button" onclick="openAttachmentModal(${a.id})" class="btn-icon-only" title="Ver Anexos" style="margin-right: 5px; color: var(--color-info);"><i class="fa-solid fa-paperclip"></i></button>`
                      : ''
                  }

              <button type="button" onclick="openHistoryModal(${
                a.id
              })" class="btn-icon-only" title="Ver Histórico" style="margin-right: 5px;"><i class="fa-solid fa-clock-rotate-left"></i></button>
              <button type="button" onclick="openEditModal(${
                a.id
              })" class="btn-icon-only edit" title="Editar"><i class="fa-solid fa-pen"></i></button> 
              <button type="button" onclick="deleteActivity(${
                a.id
              })" class="btn-icon-only delete" title="Apagar"><i class="fa-solid fa-trash"></i></button>`
                  : '<i class="fa-solid fa-lock" style="color:#CBD5E1;"></i>'
              }
          </td></tr>`;
            })
            .join('')}</tbody></table></div>`;
}

document
  .getElementById('editTaskForm')
  .addEventListener('submit', function (e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('editTaskId').value);
    const newStatus = document.getElementById('editTaskStatus').value;
    const btn = document.getElementById('btnSaveEdit');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A Guardar...';

    const a = activities.find((x) => x.id === id);
    if (a) {
      const oldStatus = a.status;
      if (oldStatus !== newStatus) {
        if (!a.logs) a.logs = [];
        a.logs.push({
          date: new Date().toISOString(),
          userName: currentUser.name,
          from: oldStatus,
          to: newStatus,
        });
      }
      a.date = document.getElementById('editTaskDate').value;
      a.category = document.getElementById('editTaskCategory').value;
      a.title = document.getElementById('editTaskTitle').value;
      a.description = document.getElementById('editTaskDescription').value;
      a.status = newStatus;

      // Atualiza a atividade de forma ultra leve!
      db.collection('atividades')
        .doc(id.toString())
        .update(a)
        .then(() => {
          showToast('Atividade atualizada!');
          closeEditModal();
        })
        .catch(() => {
          showToast('Erro ao salvar', 'error');
          btn.disabled = false;
          btn.innerHTML =
            '<i class="fa-solid fa-floppy-disk"></i> Guardar Alterações';
        });
    }
  });

function deleteActivity(id) {
  showConfirm(
    'Tem certeza que deseja apagar esta atividade permanentemente?',
    () => {
      db.collection('atividades')
        .doc(id.toString())
        .delete()
        .then(() => {
          showToast('Atividade apagada com sucesso!');
        });
    },
    'Apagar Atividade?'
  );
}

// ============ 6. MODO ESCURO ============
function toggleDarkMode() {
  const body = document.body;
  body.classList.toggle('dark-mode');
  const isDark = body.classList.contains('dark-mode');
  localStorage.setItem('feedbackgo_theme', isDark ? 'dark' : 'light');
  updateThemeIcons(isDark);
}
function updateThemeIcons(isDark) {
  document.querySelectorAll('.theme-toggle-btn').forEach((btn) => {
    if (isDark) {
      btn.innerHTML = '<i class="fa-solid fa-sun"></i> Modo Claro';
      btn.style.backgroundColor = '#eab308';
      btn.style.color = '#000';
    } else {
      btn.innerHTML = '<i class="fa-solid fa-moon"></i> Ativar Escuro';
      btn.style.backgroundColor = '#1e293b';
      btn.style.color = '#fff';
    }
  });
}
window.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('feedbackgo_theme') === 'dark') {
    document.body.classList.add('dark-mode');
    updateThemeIcons(true);
  }
});

// ============ 7. CÉREBRO DE CORES (UI) ============
const assignedCategoryHues = {};
let colorCounter = 0;
function getCategoryHue(categoryName) {
  if (!categoryName) return 200;
  if (assignedCategoryHues[categoryName] !== undefined)
    return assignedCategoryHues[categoryName];
  let newHue = Math.floor(colorCounter * 137.5) % 360;
  assignedCategoryHues[categoryName] = newHue;
  colorCounter++;
  return newHue;
}
function getCategoryStyleString(categoryName) {
  let hue = getCategoryHue(categoryName);
  let textLightness = hue >= 40 && hue <= 200 ? '15%' : '35%';
  return `--cat-hue: ${hue}; --txt-l: ${textLightness};`;
}

// ============ 8. SISTEMA DE CONFIRMAÇÃO & TOASTS ============
let currentConfirmCallback = null;
function showConfirm(message, callback, title = 'Atenção') {
  document.getElementById('confirmTitle').innerText = title;
  document.getElementById('confirmMessage').innerText = message;
  currentConfirmCallback = callback;
  document.getElementById('confirmModal').classList.remove('hidden');
}
function closeConfirmModal() {
  document.getElementById('confirmModal').classList.add('hidden');
  currentConfirmCallback = null;
}
function executeConfirmAction() {
  if (currentConfirmCallback) {
    currentConfirmCallback();
  }
  closeConfirmModal();
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
  toast.innerHTML = `<i class="fa-solid ${icon}" style="color: ${
    type === 'success' ? '#10b981' : '#ef4444'
  }"></i><div class="toast-message">${message}</div>`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// ============ 9. MODAIS DE EDIÇÃO E HISTÓRICO ============
function openEditModal(id) {
  const a = activities.find((x) => x.id === id);
  if (!a) return;
  if (currentUser.role === 'funcionario' && a.userId !== currentUser.id) {
    showToast('Acesso negado!', 'error');
    return;
  }
  const c = companies.find((x) => x.id === currentUser.companyId);
  document.getElementById('editTaskCategory').innerHTML = (
    c.categories || defaultCategories
  )
    .map((cat) => `<option value="${cat}">${cat}</option>`)
    .join('');
  document.getElementById('editTaskId').value = a.id;
  document.getElementById('editTaskDate').value = a.date;
  document.getElementById('editTaskCategory').value = a.category || 'Geral';
  document.getElementById('editTaskTitle').value = a.title;
  document.getElementById('editTaskDescription').value = a.description || '';
  document.getElementById('editTaskStatus').value = a.status;
  document.getElementById('editModal').classList.remove('hidden');
}
function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
  const btn = document.getElementById('btnSaveEdit');
  if (btn) {
    btn.disabled = false;
    btn.innerHTML =
      '<i class="fa-solid fa-floppy-disk"></i> Guardar Alterações';
  }
}
function openHistoryModal(id) {
  const a = activities.find((x) => x.id === id);
  if (!a) return;
  const content = document.getElementById('historyContent');
  if (content) {
    content.innerHTML =
      a.logs && a.logs.length > 0
        ? a.logs
            .map(
              (log) => `
            <div class="log-item"><div class="log-dot"></div><div class="log-content">
                <span class="log-time" style="display:block; font-size:11px; opacity:0.7;">${new Date(
                  log.date
                ).toLocaleString('pt-BR')}</span>
                <strong>${
                  log.userName
                }</strong> alterou para <span style="text-transform:uppercase; font-weight:bold; font-size:10px;">${
                log.to
              }</span>
            </div></div>`
            )
            .join('')
        : '<p style="text-align:center; padding:20px; opacity:0.6;">Nenhuma alteração registrada.</p>';
  }
  document.getElementById('historyModal').classList.remove('hidden');
}
function closeHistoryModal() {
  document.getElementById('historyModal').classList.add('hidden');
}

// ============ UTILS DIVERSOS ============
function getLocalToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatDate(ds) {
  if (!ds) return '';
  const p = ds.split('-');
  return `${p[2]}/${p[1]}/${p[0]}`;
}
function getStatusBadge(s) {
  const b = {
    concluido: '<span class="badge badge-concluido">Concluído</span>',
    andamento: '<span class="badge badge-andamento">Em Andamento</span>',
    pendente: '<span class="badge badge-pendente">Pendente</span>',
  };
  return b[s] || s;
}
function updateCurrentDate(id) {
  const el = document.getElementById(id);
  if (el) {
    let str = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    el.textContent = str.charAt(0).toUpperCase() + str.slice(1);
  }
}
function setTodayDate(id) {
  const el = document.getElementById(id);
  if (el) el.value = getLocalToday();
}
function showNotice(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = msg;
  el.className = `alert alert-${type}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}
window.initApp = function () {
  console.log('Core iniciado!');
};

// ============ MODAL DE ANEXOS (SUPORTE A MÚLTIPLOS) ============
window.openAttachmentModal = function (activityId) {
  const atividade = activities.find((x) => x.id === activityId);
  if (!atividade) return;

  const content = document.getElementById('attachmentContent');
  let html = `<i class="fa-solid fa-folder-open" style="font-size: 48px; color: var(--color-info); margin-bottom: 15px;"></i>`;

  // Se for a versão nova (com até 3 anexos)
  if (atividade.attachments && atividade.attachments.length > 0) {
    html += `<p style="margin-bottom: 20px; font-size: 14px;">Esta atividade contém <strong>${atividade.attachments.length} anexo(s)</strong>:</p>
               <div style="display: flex; flex-direction: column; gap: 10px;">`;

    atividade.attachments.forEach((anexo) => {
      const isBase64 = anexo.url.startsWith('data:');
      const actionAttr = isBase64
        ? `download="${anexo.name}"`
        : 'target="_blank"';
      html += `<a href="${anexo.url}" ${actionAttr} class="btn btn-info" style="display: flex; justify-content: space-between; align-items: center; text-align: left;">
                      <span style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${anexo.name}</span> 
                      <i class="fa-solid fa-download"></i>
                   </a>`;
    });
    html += `</div>`;
  }
  // Se for uma atividade antiga (com apenas 1 anexo)
  else if (atividade.attachmentUrl) {
    const isBase64 = atividade.attachmentUrl.startsWith('data:');
    const actionAttr = isBase64
      ? `download="${atividade.attachmentName || 'Anexo'}"`
      : 'target="_blank"';
    html += `<p style="margin-bottom: 20px; font-size: 14px;">Arquivo: <strong style="color: var(--color-text-primary);">${
      atividade.attachmentName || 'Anexo'
    }</strong></p>
               <a href="${
                 atividade.attachmentUrl
               }" ${actionAttr} class="btn btn-info"><i class="fa-solid fa-download"></i> Baixar Anexo</a>`;
  }

  content.innerHTML = html;
  document.getElementById('attachmentModal').classList.remove('hidden');
};

// ============ ROBÔ DE LIMPEZA GLOBAL (VERSÃO BLINDADA) ============
window.runAutoCleanup = function () {
  if (!currentUser) return;
  console.log('[Robô] Iniciando varredura de manutenção...');

  const umAnoAtras = new Date();
  umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
  const dataLimite = umAnoAtras.toISOString().split('T')[0];

  // Regra: 1 ano exato ou mais (<=)
  const atividadesParaLimpar = activities.filter(
    (a) =>
      a.companyId === currentUser.companyId &&
      a.date <= dataLimite &&
      (a.attachmentUrl || (a.attachments && a.attachments.length > 0))
  );

  if (atividadesParaLimpar.length > 0) {
    atividadesParaLimpar.forEach((a) => {
      const limpeza = {
        attachmentUrl: firebase.firestore.FieldValue.delete(),
        attachmentName: firebase.firestore.FieldValue.delete(),
        attachments: firebase.firestore.FieldValue.delete(),
        systemNote:
          'Limpeza automática realizada em ' + new Date().toLocaleDateString(),
      };

      // CORREÇÃO FINAL: O ID tem de ser sempre STRING para o Firebase não dar erro
      const docId = String(a.id);
      db.collection('atividades')
        .doc(docId)
        .update(limpeza)
        .then(() => console.log('[Robô] Sucesso na ID: ' + docId))
        .catch((err) => console.error('[Robô] Erro na ID ' + docId + ':', err));

      // Limpa na memória local para o visual atualizar sem F5
      a.attachmentUrl = null;
      a.attachments = null;
      a.attachmentName = null;
    });

    // Redesenha a tabela (Admin ou Funcionário)
    if (typeof refreshLiveData === 'function') refreshLiveData();
  } else {
    console.log('[Robô] Nenhuma atividade antiga encontrada para limpar.');
  }
};

// ============ MODAL DE ANEXOS (SUPORTE A MÚLTIPLOS) ============
window.openAttachmentModal = function (activityId) {
  const atividade = activities.find((x) => x.id === activityId);
  if (!atividade) return;

  const content = document.getElementById('attachmentContent');
  let html = `<i class="fa-solid fa-folder-open" style="font-size: 48px; color: var(--color-info); margin-bottom: 15px;"></i>`;

  // Se for a versão nova (com até 3 anexos)
  if (atividade.attachments && atividade.attachments.length > 0) {
    html += `<p style="margin-bottom: 20px; font-size: 14px;">Esta atividade contém <strong>${atividade.attachments.length} anexo(s)</strong>:</p>
               <div style="display: flex; flex-direction: column; gap: 10px;">`;

    atividade.attachments.forEach((anexo) => {
      const isBase64 = anexo.url.startsWith('data:');
      const actionAttr = isBase64
        ? `download="${anexo.name}"`
        : 'target="_blank"';
      html += `<a href="${anexo.url}" ${actionAttr} class="btn btn-info" style="display: flex; justify-content: space-between; align-items: center; text-align: left;">
                      <span style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${anexo.name}</span> 
                      <i class="fa-solid fa-download"></i>
                   </a>`;
    });
    html += `</div>`;
  }
  // Se for uma atividade antiga (com apenas 1 anexo)
  else if (atividade.attachmentUrl) {
    const isBase64 = atividade.attachmentUrl.startsWith('data:');
    const actionAttr = isBase64
      ? `download="${atividade.attachmentName || 'Anexo'}"`
      : 'target="_blank"';
    html += `<p style="margin-bottom: 20px; font-size: 14px;">Arquivo: <strong style="color: var(--color-text-primary);">${
      atividade.attachmentName || 'Anexo'
    }</strong></p>
               <a href="${
                 atividade.attachmentUrl
               }" ${actionAttr} class="btn btn-info"><i class="fa-solid fa-download"></i> Baixar Anexo</a>`;
  }

  content.innerHTML = html;
  document.getElementById('attachmentModal').classList.remove('hidden');
};

window.closeAttachmentModal = function () {
  document.getElementById('attachmentModal').classList.add('hidden');
};