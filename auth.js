// ============ LÓGICA DE AUTENTICAÇÃO E LOGIN ============

document
  .getElementById('registerForm')
  .addEventListener('submit', function (e) {
    e.preventDefault();
    const em = document.getElementById('adminEmail').value.trim();
    if (users.find((u) => u.email === em))
      return showNotice('registerAlert', 'E-mail já em uso.', 'error');

    const btn = document.getElementById('registerBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A Criar...';
    btn.disabled = true;

    const nComp = {
      id: nextCompanyId,
      name: document.getElementById('companyName').value.trim(),
      accessCode:
        'EMP-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
      createdAt: new Date().toISOString(),
      teams: ['Equipe Geral'],
      categories: [...defaultCategories],
    };

    const nUser = {
      id: nextUserId,
      companyId: nComp.id,
      name: document.getElementById('adminName').value.trim(),
      email: em,
      password: document.getElementById('adminPassword').value,
      role: 'admin',
      active: true,
      team: 'Administração',
    };

    // NOVA ARQUITETURA: Salvar em coleções separadas no Firebase!
    Promise.all([
      db.collection('empresas').doc(nComp.id.toString()).set(nComp),
      db.collection('usuarios').doc(nUser.id.toString()).set(nUser),
    ])
      .then(() => {
        document.getElementById('registerForm').reset();
        showToast('Empresa Registrada com sucesso!');
        showLoginScreen();
        document.getElementById('loginEmail').value = em;
        btn.innerHTML = originalText;
        btn.disabled = false;
      })
      .catch((err) => {
        console.error(err);
        showNotice('registerAlert', 'Erro ao criar empresa.', 'error');
        btn.innerHTML = originalText;
        btn.disabled = false;
      });
  });

document.getElementById('loginForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const em = document.getElementById('loginEmail').value.trim();
  const pw = document.getElementById('loginPassword').value;
  const u = users.find((u) => u.email === em && u.password === pw && u.active);
  if (u) {
    currentUser = u;
    localStorage.setItem('feedbackgo_logged_user', u.id);
    showPanel(u.role);
  } else showNotice('loginAlert', 'Credenciais inválidas.', 'error');
});

document.getElementById('recoverForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const em = document.getElementById('recoverEmail').value.trim();
  const u = users.find((x) => x.email === em && x.active);

  if (u) {
    const btn = document.querySelector('#recoverForm button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> A Processar...';
    btn.disabled = true;

    const temp = Math.random().toString(36).substring(2, 8);
    const comp = companies.find((c) => c.id === u.companyId);

    // NOVA ARQUITETURA: Atualiza direto no documento do usuário específico
    db.collection('usuarios')
      .doc(u.id.toString())
      .update({ password: temp })
      .then(() => {
        emailjs
          .send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_GENERIC, {
            to_name: u.name,
            to_email: u.email,
            subject: 'Recuperação',
            message_title: 'Recuperação de Senha',
            message_body: 'Use o código abaixo:',
            label_destaque: 'Senha Temporária',
            password: temp,
            extra_info: 'Altere após o login.',
            company_name: comp ? comp.name : 'FeedbackGo',
          })
          .then(() => {
            showToast('Senha alterada! Verifique o seu e-mail.');
            btn.innerHTML = originalText;
            btn.disabled = false;
            showLoginScreen();
          })
          .catch((err) => {
            btn.innerHTML = originalText;
            btn.disabled = false;
          });
      })
      .catch((error) => {
        showNotice('recoverAlert', 'Erro ao processar.', 'error');
        btn.innerHTML = originalText;
        btn.disabled = false;
      });
  } else {
    showNotice('recoverAlert', 'E-mail não encontrado.', 'error');
  }
});

function showRegisterScreen() {
  ['loginScreen', 'recoverScreen'].forEach((id) =>
    document.getElementById(id).classList.add('hidden')
  );
  document.getElementById('registerScreen').classList.remove('hidden');
}
function showLoginScreen() {
  ['registerScreen', 'recoverScreen'].forEach((id) =>
    document.getElementById(id).classList.add('hidden')
  );
  document.getElementById('loginScreen').classList.remove('hidden');
}
function showRecoverScreen() {
  ['loginScreen', 'registerScreen'].forEach((id) =>
    document.getElementById(id).classList.add('hidden')
  );
  document.getElementById('recoverScreen').classList.remove('hidden');
}
function logout() {
  currentUser = null;
  localStorage.removeItem('feedbackgo_logged_user');
  ['adminPanel', 'employeePanel'].forEach((id) =>
    document.getElementById(id).classList.add('hidden')
  );
  showLoginScreen();
}
function showPanel(role) {
  document.getElementById('loginScreen').classList.add('hidden');
  if (role === 'admin') {
    document.getElementById('adminPanel').classList.remove('hidden');
    initAdminPanel();
  } else {
    document.getElementById('employeePanel').classList.remove('hidden');
    initEmployeePanel();
  }
}
