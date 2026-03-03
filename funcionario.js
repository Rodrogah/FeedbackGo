// ============ MOTOR DE NAVEGAÇÃO DO FUNCIONÁRIO ============
async function showEmployeeSection(sec) {
  // ATENÇÃO: Verifique se o ID do palco do funcionário é este mesmo no seu HTML
  const palco = document.getElementById('funcConteudoDinamico'); 
  if (!palco) return console.error('Erro fatal: funcConteudoDinamico não existe!');

  // Atualiza o menu ativo (deixa o botão com a cor de destaque)
  document.querySelectorAll('#employeePanel .nav-item').forEach((i) => i.classList.remove('active'));
  const activeNav = document.querySelector(`#employeePanel .nav-item[onclick*="${sec}"]`);
  if (activeNav) activeNav.classList.add('active');

  // 🚀 1. ANIMAÇÃO DE SAÍDA: Apaga o ecrã atual suavemente
  palco.style.transition = 'opacity 0.2s ease';
  palco.style.opacity = '0';
  
  // Espera a tela ficar totalmente invisível (200ms) antes de trocar o HTML
  await new Promise(resolve => setTimeout(resolve, 200));

  // Mostra um spinner super discreto durante o carregamento
  palco.innerHTML = '<div style="text-align:center; padding:50px; opacity: 0.4;"><i class="fa-solid fa-circle-notch fa-spin fa-2x"></i></div>';
  palco.style.opacity = '1';

  try {
    // Verifique se as rotas do funcionário têm nomes diferentes
    const rotas = {
      dashboard: 'func-dashboard.html',
      'new-task': 'func-nova-atividade.html',
      history: 'func-historico.html',
      settings: 'func-configuracoes.html',
      'tarefas-recebidas': 'func-tarefas-recebidas.html'
    };
    
    const resposta = await fetch(`./telas/${rotas[sec]}`);
    if (!resposta.ok) throw new Error('Erro de fetch: Ficheiro não encontrado.');
    
    const htmlNovo = await resposta.text();
    
    // 🚀 2. Devolvemos o HTML original sem NENHUMA div extra (para não quebrar o layout)
    palco.innerHTML = htmlNovo;

    // 🚀 3. Aplicamos a animação DIRETAMENTE no palco principal
    palco.classList.remove('fade-entrar');
    void palco.offsetWidth; // Truque do JS para forçar a animação a reiniciar
    palco.classList.add('fade-entrar');

    window.scrollTo({ top: 0, behavior: 'smooth' }); // Força o topo ao trocar de ecrã

    if (sec === 'dashboard') {
      const greet = document.getElementById('employeeGreeting');
      if (greet) greet.textContent = `Olá, ${currentUser.name.split(' ')[0]}!`;
      updateEmployeeStats();
      loadEmployeeRecentTasks();
      updateCurrentDate('currentDate');

      const c = companies.find((x) => x.id === currentUser.companyId);
      const avisoCard = document.getElementById('employeeAnnouncementCard');
      const avisoTexto = document.getElementById('employeeAnnouncementText');
      if (avisoCard && avisoTexto && c) {
        if (c.announcement && c.announcement.trim() !== '') {
          avisoTexto.textContent = c.announcement;
          avisoCard.style.display = 'block';
        } else {
          avisoCard.style.display = 'none';
        }
      }
      renderFuncCharts();
    } else if (sec === 'new-task') {
      if (typeof setTodayDate === 'function') setTodayDate('taskDate');
      const c = companies.find((x) => x.id === currentUser.companyId);
      const catEl = document.getElementById('taskCategory');
      if (catEl && c)
        catEl.innerHTML = (c.categories || defaultCategories)
          .map((cat) => `<option value="${cat}">${cat}</option>`)
          .join('');
      setupNewTaskForm();
    } else if (sec === 'history') {
      loadEmployeeHistory();
    } else if (sec === 'settings') {
      const profileInput = document.getElementById('empProfileName'); // Ajustado para o ID correto do HTML
      if (profileInput) profileInput.value = currentUser.name;
      setupFuncSettingsForms();
      
  } else if (sec === 'tarefas-recebidas') {
      setupFuncionarioTarefas();
  }
} catch (err) {
    palco.innerHTML = `<div class="alert alert-error">Erro: ${err.message}</div>`;
  }
}

function initEmployeePanel() {
  const c = companies.find((x) => x.id === currentUser.companyId);
  if (!c) return;
  document.getElementById('empCompanySidebar').textContent = c.name;
  document.getElementById('sidebarEmployeeName').textContent =
    currentUser.name.split(' ')[0];
  document.getElementById('employeeAvatar').textContent = currentUser.name
    .charAt(0)
    .toUpperCase();
  document.getElementById('employeeTeamName').textContent =
    currentUser.team || 'Membro';
  showEmployeeSection('dashboard');

  setTimeout(runAutoCleanup, 5000);
}

function updateEmployeeStats() {
  const minhasAtividades = activities.filter(
    (a) => a.userId === currentUser.id
  );
  const elHoje = document.getElementById('todayTasksCount');
  if (elHoje)
    elHoje.textContent = minhasAtividades.filter(
      (a) => a.date === getLocalToday()
    ).length;
  const elMes = document.getElementById('monthTasks');
  if (elMes)
    elMes.textContent = minhasAtividades.filter(
      (a) => new Date(a.date).getMonth() === new Date().getMonth()
    ).length;
  const elTotal = document.getElementById('totalTasks');
  if (elTotal) elTotal.textContent = minhasAtividades.length;
}

function loadEmployeeRecentTasks() {
  const el = document.getElementById('employeeRecentTasks');
  if (!el) return;
  const lista = activities
    .filter((a) => a.userId === currentUser.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);
  el.innerHTML = generateActivityTableHTML(lista, false);
}

// ============ SISTEMA DE PAGINAÇÃO (FUNCIONÁRIO) ============
let currentEmpPage = 1;
let currentEmpFilteredActs = [];

function loadEmployeeHistory() {
  currentEmpPage = 1;
  // Limpa os filtros de data ao abrir a aba
  const elStart = document.getElementById('empFilterStart');
  const elEnd = document.getElementById('empFilterEnd');
  if (elStart) elStart.value = '';
  if (elEnd) elEnd.value = '';
  
  applyEmployeeFilters(1);
}

window.applyEmployeeFilters = function(page = 1) {
  currentEmpPage = page;
  
  const s = document.getElementById('empFilterStart') ? document.getElementById('empFilterStart').value : '';
  const e = document.getElementById('empFilterEnd') ? document.getElementById('empFilterEnd').value : '';
  
  let f = activities.filter((a) => a.userId === currentUser.id);

  if (s) f = f.filter((a) => a.date >= s);
  if (e) f = f.filter((a) => a.date <= e);

  // Ordena do mais novo para o mais antigo, com desempate por hora exata
  currentEmpFilteredActs = f.sort((a, b) => {
    const diffData = new Date(b.date) - new Date(a.date);
    // Se a data for exatamente igual, desempata pelo relógio interno (createdAt)
    if (diffData === 0 && a.createdAt && b.createdAt) {
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
    return diffData;
  });

  //atualiza o visual da tabela após ordenar!
  renderEmployeeHistoryPage();
};

window.renderEmployeeHistoryPage = function() {
  const el = document.getElementById('employeeHistoryTable');
  if (!el) return;

  const itemsPerPage = 20; // 20 Itens por página
  const totalPages = Math.ceil(currentEmpFilteredActs.length / itemsPerPage) || 1;
  
  if (currentEmpPage > totalPages) currentEmpPage = totalPages;
  if (currentEmpPage < 1) currentEmpPage = 1;

  // Fatiar a lista para pegar apenas os 20 da página atual
  const start = (currentEmpPage - 1) * itemsPerPage;
  const actsPage = currentEmpFilteredActs.slice(start, start + itemsPerPage);

  // Gerar a tabela com a "fatia"
  let html = generateActivityTableHTML(actsPage, false);

  // Adicionar controlos de paginação no final da tabela
  if (totalPages > 1) {
      html += `
      <div style="display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 25px; padding: 10px;">
          <button class="btn btn-secondary btn-small" onclick="applyEmployeeFilters(${currentEmpPage - 1})" ${currentEmpPage === 1 ? 'disabled' : ''}>
              <i class="fa-solid fa-chevron-left"></i> Anterior
          </button>
          <span style="font-size: 14px; font-weight: bold; color: var(--color-text-secondary);">
              Página ${currentEmpPage} de ${totalPages}
          </span>
          <button class="btn btn-secondary btn-small" onclick="applyEmployeeFilters(${currentEmpPage + 1})" ${currentEmpPage === totalPages ? 'disabled' : ''}>
              Próxima <i class="fa-solid fa-chevron-right"></i>
          </button>
      </div>`;
  }
  
  el.innerHTML = html;
};

function setupNewTaskForm() {
  const form = document.getElementById('newTaskForm');
  if (!form) return;
  const novoForm = form.cloneNode(true);
  form.parentNode.replaceChild(novoForm, form);

  // === LÓGICA VISUAL DOS 3 ARQUIVOS ===
  const fileInput = novoForm.querySelector('#taskAttachment');
  const fileListDisplay = novoForm.querySelector('#fileListDisplay');
  let arquivosSelecionados = [];

  if (fileInput) {
    fileInput.addEventListener('change', function () {
      const files = Array.from(this.files);

      // Bloqueia se tentar enviar mais de 3
      if (files.length > 3) {
        showToast('Você só pode anexar no máximo 3 arquivos!', 'error');
        this.value = '';
        fileListDisplay.innerHTML = '';
        arquivosSelecionados = [];
        return;
      }

      arquivosSelecionados = [];
      fileListDisplay.innerHTML = '';

      for (let i = 0; i < files.length; i++) {
        // Bloqueia se ALGUM arquivo for maior que 1MB
        if (files[i].size > 1 * 1024 * 1024) {
          showToast(`O arquivo ${files[i].name} é maior que 1MB!`, 'error');
          this.value = '';
          fileListDisplay.innerHTML = '';
          arquivosSelecionados = [];
          return;
        }
        arquivosSelecionados.push(files[i]);
        // Desenha a listinha na tela
        fileListDisplay.innerHTML += `<div class="custom-file-item"><i class="fa-solid fa-file-lines" style="color: var(--color-info);"></i> ${files[i].name}</div>`;
      }
    });
  }

  // === LÓGICA DE SALVAR NO BANCO ===
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
      date: document.getElementById('taskDate').value,
      category: document.getElementById('taskCategory').value,
      title: document.getElementById('taskTitle').value,
      description: document.getElementById('taskDescription').value,
      status: document.getElementById('taskStatus').value,
      createdAt: new Date().toISOString(),
    };

    const salvarNoBanco = (atividadeFinal) => {
      atividadeFinal.id = nextActivityId;
      db.collection('atividades')
        .doc(atividadeFinal.id.toString())
        .set(atividadeFinal)
        .then(() => {
          showEmployeeSection('dashboard').then(() =>
            showToast('Atividade registrada!')
          );
        })
        .catch(() => {
          btn.innerHTML = originalText;
          btn.disabled = false;
          showToast('Erro ao salvar!', 'error');
        });
    };

    // Se tem arquivos, processa TODOS eles juntos
    if (arquivosSelecionados.length > 0) {
      btn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> A Processar Anexos...';

      // Cria uma fila de tarefas para converter todos os arquivos para texto
      const promessasDeArquivos = arquivosSelecionados.map((file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = function (evento) {
            resolve({ name: file.name, url: evento.target.result });
          };
          reader.readAsDataURL(file);
        });
      });

      // Quando TODOS terminarem de converter, salva no banco!
      Promise.all(promessasDeArquivos).then((anexosProntos) => {
        novaAtividade.attachments = anexosProntos; // Salva a lista inteira!
        salvarNoBanco(novaAtividade);
      });
    } else {
      salvarNoBanco(novaAtividade);
    }
  });
}

let funcStatusChartInstance = null;
let funcCategoryChartInstance = null;

window.renderFuncCharts = function () {
  const isDark = document.body.classList.contains('dark-mode');
  const textColor = isDark ? '#f8fafc' : '#1e293b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const myActs = activities.filter((a) => a.userId === currentUser.id);

  const ctxStatus = document.getElementById('funcStatusChart');
  if (ctxStatus) {
    let conc = 0,
      and = 0,
      pend = 0;
    myActs.forEach((a) => {
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
    if (funcStatusChartInstance) funcStatusChartInstance.destroy();
    funcStatusChartInstance = new Chart(ctxStatus, {
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

  const ctxCategory = document.getElementById('funcCategoryChart');
  if (ctxCategory) {
    const catCounts = {};
    myActs.forEach((a) => {
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
    if (funcCategoryChartInstance) funcCategoryChartInstance.destroy();
    funcCategoryChartInstance = new Chart(ctxCategory, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Nº de Atividades',
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
};

// =========================================================
// GESTOR DE EQUIPES (VISÃO DO FUNCIONÁRIO)
// =========================================================

window.setupFuncionarioTarefas = function() {
  loadTarefasRecebidas();

  const form = document.getElementById('formEntregarTarefa');
  if (!form) return;
  const novoForm = form.cloneNode(true);
  form.parentNode.replaceChild(novoForm, form);

  let arquivosSelecionados = [];
  const fileInput = novoForm.querySelector('#entregarArquivos');
  const fileListDisplay = novoForm.querySelector('#entregarArquivosLista');

  if (fileInput) {
      fileInput.addEventListener('change', function () {
          const files = Array.from(this.files);
          if (files.length > 3) return showToast('Máximo de 3 arquivos!', 'error');
          
          arquivosSelecionados = [];
          fileListDisplay.innerHTML = '';

          for (let i = 0; i < files.length; i++) {
              if (files[i].size > 1 * 1024 * 1024) return showToast(`Arquivo muito pesado!`, 'error');
              arquivosSelecionados.push(files[i]);
              fileListDisplay.innerHTML += `<div class="custom-file-item" style="font-size:12px; padding:5px 0;"><i class="fa-solid fa-file-lines" style="color: var(--color-info);"></i> ${files[i].name}</div>`;
          }
      });
  }

  novoForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const btn = novoForm.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Entregando...';
      btn.disabled = true;

      const tarefaId = document.getElementById('entregarTarefaId').value;
      const observacoes = document.getElementById('entregarObservacoes').value;
      const tituloFinal = document.getElementById('entregarTitulo').value; 

      db.collection('tarefas').doc(tarefaId).get().then(docSnap => {
          if (!docSnap.exists) return showToast('Erro: Tarefa não encontrada', 'error');
          
          const tarefaOriginal = docSnap.data(); // Trazemos a tarefa original para pegar a categoria
          
          const finalizarTudo = (anexosNovos) => {
              const p1 = db.collection('tarefas').doc(tarefaId).update({ 
                  status: 'concluido',
                  respostaFuncionario: observacoes, 
                  attachments: anexosNovos 
              });

              const idAtividade = Date.now(); 
              const hoje = new Date();
              const dataRelatorio = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

              const novaAtividade = {
                  id: idAtividade,
                  companyId: currentUser.companyId,
                  userId: currentUser.id,
                  date: dataRelatorio, 
                  category: tarefaOriginal.category || 'Tarefa Delegada', // <-- AGORA USA A CATEGORIA DO ADMIN
                  title: tituloFinal, 
                  description: observacoes || 'Tarefa concluída sem observações.', 
                  status: 'concluido',
                  createdAt: new Date().toISOString(),
                  attachments: anexosNovos 
              };

              const p2 = db.collection('atividades').doc(idAtividade.toString()).set(novaAtividade);

              Promise.all([p1, p2]).then(() => {
                  showToast('Excelente! Tarefa concluída e registrada!');
                  fecharModalTarefa();
                  fileListDisplay.innerHTML = '';
                  arquivosSelecionados = [];
                  btn.innerHTML = originalText;
                  btn.disabled = false;
                  loadTarefasRecebidas(); 
              }).catch(err => {
                  showToast('Erro ao entregar.', 'error');
                  btn.innerHTML = originalText;
                  btn.disabled = false;
              });
          };

          if (arquivosSelecionados.length > 0) {
              const promessas = arquivosSelecionados.map((file) => {
                  return new Promise((resolve) => {
                      const reader = new FileReader();
                      reader.onload = function (evento) { resolve({ name: file.name, url: evento.target.result }); };
                      reader.readAsDataURL(file);
                  });
              });
              Promise.all(promessas).then(anexos => finalizarTudo(anexos));
          } else {
              finalizarTudo([]);
          }
      });
  });
};

window.abrirModalTarefa = function(idTarefa) {
  db.collection('tarefas').doc(idTarefa.toString()).get().then(docSnap => {
      if (!docSnap.exists) return;
      const t = docSnap.data();

      const admin = users.find(u => u.id === t.senderId);
      document.getElementById('modalTarefaRemetente').textContent = admin ? admin.name : 'Administrador';
      document.getElementById('modalTarefaTitulo').textContent = t.title;
      document.getElementById('modalTarefaDescricao').textContent = t.description;
      document.getElementById('entregarTarefaId').value = t.id;
      
      // Pré-preenche o título da entrega com o título original para facilitar
      document.getElementById('entregarTitulo').value = t.title; 

      const boxAnexos = document.getElementById('modalTarefaAnexosAdmin');
      if (t.attachments && t.attachments.length > 0) {
          let anexosHtml = '<strong style="font-size:14px; display:block; margin-bottom: 5px;">Arquivos enviados pelo Administrador:</strong><div style="display: flex; gap: 10px; flex-wrap: wrap;">';
          t.attachments.forEach(an => {
              anexosHtml += `<a href="${an.url}" download="${an.name}" class="badge" style="background: var(--color-bg-secondary); color: var(--color-primary); text-decoration: none; display: flex; align-items: center; gap: 5px; padding: 6px 12px; border: 1px solid var(--color-border);"><i class="fa-solid fa-download"></i> ${an.name}</a>`;
          });
          anexosHtml += '</div>';
          boxAnexos.innerHTML = anexosHtml;
      } else {
          boxAnexos.innerHTML = '';
      }

      document.getElementById('formEntregarTarefa').reset();
      document.getElementById('entregarArquivosLista').innerHTML = '';
      document.getElementById('modalResponderTarefa').classList.remove('hidden');
  });
};

window.loadTarefasRecebidas = function() {
  const container = document.getElementById('listaTarefasFuncionario');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.6;"><i class="fa-solid fa-spinner fa-spin"></i> Buscando tarefas...</div>';

  // 🚀 OTIMIZAÇÃO: Filtro único (muito mais rápido) e com tratamento de erro
  db.collection('tarefas')
    .where('userId', '==', currentUser.id)
    .get()
    .then((querySnapshot) => {
        if (querySnapshot.empty) {
            container.innerHTML = '<div style="text-align:center; padding: 20px; background: var(--color-bg-primary); border-radius: 8px;">Nenhuma tarefa pendente. Você está em dia! 🎉</div>';
            return;
        }

        let lista = [];
        querySnapshot.forEach(doc => lista.push(doc.data()));
        
        // Coloca as pendentes no topo
        lista.sort((a, b) => {
            if (a.status === 'pendente' && b.status === 'concluido') return -1;
            if (a.status === 'concluido' && b.status === 'pendente') return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        let html = `<div style="display: grid; gap: 15px;">`;

        lista.forEach(t => {
            const dataFormatada = new Date(t.createdAt).toLocaleDateString('pt-BR');
            const admin = users.find(u => u.id === t.senderId);
            const nomeAdmin = admin ? admin.name : 'Administrador';

            const pendente = t.status === 'pendente';
            const corBorda = pendente ? 'border-left: 4px solid var(--color-warning);' : 'border-left: 4px solid var(--color-success);';
            const badge = pendente
                ? `<span class="badge" style="background:#fef9c3; color:#854d0e;">Pendente</span>`
                : `<span class="badge" style="background:#dcfce7; color:#166534;">Concluída</span>`;

            html += `
            <div class="card" style="padding: 15px; display: flex; justify-content: space-between; align-items: center; ${corBorda}">
                <div>
                    <div style="font-size: 12px; color: var(--color-text-secondary); margin-bottom: 5px;">De: ${nomeAdmin} • ${dataFormatada}</div>
                    <h4 style="margin: 0 0 5px 0;">${t.title}</h4>
                    ${badge}
                </div>
                <div>
                    ${pendente
                        ? `<button class="btn btn-primary btn-small" onclick="abrirModalTarefa('${t.id}')"><i class="fa-solid fa-reply"></i> Abrir & Responder</button>`
                        : `<button class="btn btn-secondary btn-small" disabled><i class="fa-solid fa-check-double"></i> Entregue</button>`
                    }
                </div>
            </div>`;
        });

        html += `</div>`;
        container.innerHTML = html;
    })
    .catch((err) => {
        console.error("Erro ao buscar tarefas:", err);
        container.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--color-danger);">Erro de conexão ao carregar as tarefas. Tente recarregar a página.</div>';
    });
};

window.abrirModalTarefa = function(idTarefa) {
  db.collection('tarefas').doc(idTarefa.toString()).get().then(docSnap => {
      if (!docSnap.exists) return;
      const t = docSnap.data();

      const admin = users.find(u => u.id === t.senderId);
      document.getElementById('modalTarefaRemetente').textContent = admin ? admin.name : 'Administrador';
      document.getElementById('modalTarefaTitulo').textContent = t.title;
      document.getElementById('modalTarefaDescricao').textContent = t.description;
      document.getElementById('entregarTarefaId').value = t.id;

      const boxAnexos = document.getElementById('modalTarefaAnexosAdmin');
      if (t.attachments && t.attachments.length > 0) {
          let anexosHtml = '<strong style="font-size:14px; display:block; margin-bottom: 5px;">Arquivos para Baixar:</strong><div style="display: flex; gap: 10px; flex-wrap: wrap;">';
          t.attachments.forEach(an => {
              anexosHtml += `<a href="${an.url}" download="${an.name}" class="badge" style="background: var(--color-bg-secondary); color: var(--color-primary); text-decoration: none; display: flex; align-items: center; gap: 5px; padding: 6px 12px; border: 1px solid var(--color-border);"><i class="fa-solid fa-download"></i> ${an.name}</a>`;
          });
          anexosHtml += '</div>';
          boxAnexos.innerHTML = anexosHtml;
      } else {
          boxAnexos.innerHTML = '';
      }

      document.getElementById('formEntregarTarefa').reset();
      document.getElementById('entregarArquivosLista').innerHTML = '';
      document.getElementById('modalResponderTarefa').classList.remove('hidden');
  });
};

window.fecharModalTarefa = function() {
  document.getElementById('modalResponderTarefa').classList.add('hidden');
};

// ============ CONFIGURAÇÕES DE PERFIL ============
window.setupFuncSettingsForms = function() {
    const profForm = document.getElementById('empProfileForm');
    if (profForm) {
        profForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const newName = document.getElementById('empProfileName').value.trim();
            const newPass = document.getElementById('empProfilePassword').value;
            const btn = profForm.querySelector('button');
            const originalText = btn ? btn.innerHTML : '';
            if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Atualizando...';

            let updates = {};
            if (newName) updates.name = newName;
            if (newPass) updates.password = newPass;

            db.collection('usuarios')
                .doc(currentUser.id.toString())
                .update(updates)
                .then(() => {
                    if (newName) {
                        currentUser.name = newName;
                        const sidebarName = document.getElementById('sidebarEmployeeName');
                        if (sidebarName) sidebarName.textContent = currentUser.name.split(' ')[0];
                        const avatar = document.getElementById('employeeAvatar');
                        if (avatar) avatar.textContent = currentUser.name.charAt(0).toUpperCase();
                    }
                    const passInput = document.getElementById('empProfilePassword');
                    if (passInput) passInput.value = '';
                    showNotice('empProfileAlert', 'Perfil atualizado com sucesso!', 'success');
                    if (btn) btn.innerHTML = originalText || '<i class="fa-solid fa-floppy-disk"></i> Atualizar';
                })
                .catch(err => {
                    showNotice('empProfileAlert', 'Erro ao atualizar perfil.', 'error');
                    if (btn) btn.innerHTML = originalText || '<i class="fa-solid fa-floppy-disk"></i> Atualizar';
                });
        });
    }
};